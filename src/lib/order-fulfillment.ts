import prisma from '@/lib/prisma';
import { topupDigiflazz } from '@/lib/digiflazz';
import { createTokoVoucherOrder, getTokoVoucherConfig } from '@/lib/tokovoucher';
import { createOrder as createMedanPediaOrder } from '@/lib/medanpedia';

export async function fulfillOrder(orderId: string) {
    console.log('[Order Fulfillment] Starting for Order:', orderId);

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            orderItems: {
                include: {
                    variant: {
                        include: {
                            product: { include: { category: true } },
                            providers: true  // Include provider mappings
                        }
                    }
                }
            },
            user: true
        }
    });

    if (!order) {
        console.error('[Order Fulfillment] Order not found:', orderId);
        return;
    }

    let successCount = 0;
    let failedCount = 0;  // Track failed items
    const totalItems = order.orderItems.length;

    for (const item of order.orderItems) {
        // Skip if already success
        if (item.providerStatus === 'Sukses') {
            successCount++;
            continue;
        }

        const isGame = item.variant.product.category.type === 'GAME';
        const isPulsa = item.variant.product.category.type === 'PULSA';
        const isSmm = item.variant.product.category.type === 'SOSMED';
        const isDigital = item.variant.product.category.type === 'DIGITAL';
        const isManual = item.variant.deliveryType === 'manual';

        try {
            // --- GAME/PULSA/SMM AUTOMATION (Provider-based) ---
            if (isGame || isPulsa || isSmm) {
                const customerNo = item.target || item.note; // Target is critical
                if (!customerNo) {
                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: 'FAILED',
                            note: 'Target number missing'
                        }
                    });
                    console.error('[Order Fulfillment] Target missing for item:', item.id);
                    failedCount++; // Track failure
                    continue;
                }

                // Determine provider from variant mapping
                const providerCode = item.variant.bestProvider || item.variant.providers?.[0]?.providerCode;
                console.log(`[Order Fulfillment] Item ${item.id} using provider: ${providerCode}`);

                if (providerCode === 'DIGIFLAZZ') {
                    // --- DIGIFLAZZ ---
                    const digiProvider = item.variant.providers.find(p => p.providerCode === 'DIGIFLAZZ');
                    if (!digiProvider) {
                        console.error('[Order Fulfillment] Digiflazz SKU not found for variant:', item.variantId);
                        continue;
                    }

                    const topupRes = await topupDigiflazz({
                        buyer_sku_code: digiProvider.providerSku,
                        customer_no: customerNo,
                        ref_id: order.invoiceCode, // Use invoice as ref_id
                        testing: false
                    });

                    // Determine status first
                    const finalStatus = topupRes.rc === '00' ? 'SUCCESS' : (topupRes.rc === '03' ? 'PENDING' : 'FAILED');

                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: finalStatus,
                            sn: topupRes.data?.sn || '',
                            note: topupRes.message,
                            providerTrxId: topupRes.data?.ref_id || ''
                        }
                    });

                    if (finalStatus === 'SUCCESS') {
                        successCount++;
                        await prisma.product.update({
                            where: { id: item.variant.productId },
                            data: { soldCount: { increment: item.quantity } }
                        });
                    } else if (finalStatus === 'FAILED') {
                        failedCount++;
                    }

                } else if (providerCode === 'TOKOVOUCHER') {
                    // --- TOKOVOUCHER ---
                    const tvConfig = await getTokoVoucherConfig();
                    if (!tvConfig) {
                        console.error('[Order Fulfillment] TokoVoucher not configured');
                        continue;
                    }

                    const tvProvider = item.variant.providers.find(p => p.providerCode === 'TOKOVOUCHER');
                    if (!tvProvider) {
                        console.error('[Order Fulfillment] TokoVoucher SKU not found for variant:', item.variantId);
                        continue;
                    }

                    // Extract server_id if exists (format: "12345|2001" or just "12345")
                    const [target, serverId] = customerNo.includes('|')
                        ? customerNo.split('|')
                        : [customerNo, ''];

                    const tvRes = await createTokoVoucherOrder(tvConfig, {
                        code: tvProvider.providerSku,
                        target: target,
                        serverId: serverId,
                        refId: order.invoiceCode  // Use invoice as ref_id for TokoVoucher
                    });

                    console.log('[Order Fulfillment] TokoVoucher Response:', tvRes);

                    // Parse TokoVoucher response
                    const tvStatus = tvRes.status === 'sukses' ? 'SUCCESS' :
                        tvRes.status === 'pending' ? 'PENDING' : 'FAILED';

                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: tvStatus,
                            sn: tvRes.sn || tvRes.data?.sn || '',
                            note: tvRes.message || tvRes.data?.message || '',
                            providerTrxId: order.invoiceCode  // Save ref_id for status check
                        }
                    });

                    if (tvStatus === 'SUCCESS') {
                        successCount++;
                        await prisma.product.update({
                            where: { id: item.variant.productId },
                            data: { soldCount: { increment: item.quantity } }
                        });
                    } else if (tvStatus === 'FAILED') {
                        failedCount++;
                    }

                } else if (providerCode === 'MEDANPEDIA') {
                    const medanProvider = item.variant.providers.find(p => p.providerCode === 'MEDANPEDIA');
                    if (!medanProvider) {
                        console.error('[Order Fulfillment] MedanPedia SKU not found for variant:', item.variantId);
                        continue;
                    }

                    // SMM Target Parsing: "TargetUrl | COMMENTS: Line1\nLine2"
                    let finalTarget = customerNo;
                    let customComments = undefined;

                    if (customerNo.includes('| COMMENTS:')) {
                        const parts = customerNo.split('| COMMENTS:');
                        finalTarget = parts[0].trim();
                        customComments = parts[1].trim();
                    }

                    const res = await createMedanPediaOrder({
                        serviceId: medanProvider.providerSku,
                        target: finalTarget,
                        quantity: item.quantity,
                        customComments: customComments
                    });

                    console.log('[Order Fulfillment] MedanPedia Response:', res);

                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: 'PROCESSING', // Assume processing initially
                            providerTrxId: res.id,
                            note: res.msg
                        }
                    });

                    // MedanPedia returns ID, so it's a success in terms of placement
                    successCount++;
                    await prisma.product.update({
                        where: { id: item.variant.productId },
                        data: { soldCount: { increment: item.quantity } }
                    });

                } else if (providerCode === 'APIGAMES') {
                    // --- APIGAMES ---
                    const { createAPIGamesOrder, getAPIGamesConfig } = await import('@/lib/apigames');
                    const apiConfig = await getAPIGamesConfig();

                    if (!apiConfig) {
                        console.error('[Order Fulfillment] APIGames Config Missing');
                        continue;
                    }

                    const gamesProvider = item.variant.providers.find(p => p.providerCode === 'APIGAMES');
                    if (!gamesProvider) {
                        console.error('[Order Fulfillment] APIGames SKU not found for variant:', item.variantId);
                        continue;
                    }

                    // Handle Server ID if present (Format: "12345|9999")
                    let target = customerNo;
                    let serverId = '';

                    if (customerNo.includes('|')) {
                        const parts = customerNo.split('|');
                        target = parts[0].trim();
                        serverId = parts[1].trim();
                    }

                    // Ref ID MUST be consistent with Webhook logic: INVOICE-ITEM_SUFFIX
                    // Item ID is a CUID (25 chars), taking last 4 chars is safe enough for suffix
                    const itemSuffix = item.id.slice(-4);
                    const refId = `${order.invoiceCode}-${itemSuffix}`;

                    const gameRes = await createAPIGamesOrder(
                        { merchantId: apiConfig.merchantId, secretKey: apiConfig.secretKey },
                        {
                            code: gamesProvider.providerSku,
                            target: target,
                            serverId: serverId,
                            refId: refId
                        }
                    );

                    console.log('[Order Fulfillment] APIGames Response:', gameRes);

                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: gameRes.status === 'SUCCESS' ? 'Sukses' : (gameRes.status === 'FAILED' ? 'Gagal' : 'Proses'),
                            providerTrxId: gameRes.trxId,
                            note: gameRes.message || gameRes.sn,
                            sn: gameRes.sn
                        }
                    });

                    if (gameRes.success || gameRes.status === 'PROCESSING') {
                        successCount++;
                        await prisma.product.update({
                            where: { id: item.variant.productId },
                            data: { soldCount: { increment: item.quantity } }
                        });
                    } else {
                        failedCount++;
                    }

                } else {
                    console.error('[Order Fulfillment] Unknown provider:', providerCode);
                }
            }
            // --- DIGITAL PRODUCT (Stock) ---
            else if (isDigital) {
                // FORCE Stock Logic for ALL Digital Products (User Request)
                // Transactional Stock Deduction
                await prisma.$transaction(async (tx) => {
                    // 1. Find Available Stocks (Limit by Quantity)
                    const stocks = await tx.digitalStock.findMany({
                        where: {
                            variantId: item.variantId,
                            status: 'AVAILABLE'
                        },
                        take: item.quantity,
                        orderBy: { createdAt: 'asc' } // FIFO
                    });

                    // Check if enough stock
                    if (stocks.length < item.quantity) {
                        // Mark as Pending Stock (or let Admin know)
                        // Don't throw error to crash the loop, just mark item as Pending/Failed
                        console.warn(`[Order Fulfillment] Stok Kurang for ${item.variant.name}. Need: ${item.quantity}, Has: ${stocks.length}`);
                        // We can throw here to abort THIS item's processing in transaction, but keep others?
                        // The transaction only wraps THIS item block.
                        throw new Error(`Stok tidak cukup (Butuh: ${item.quantity}, Tersedia: ${stocks.length})`);
                    }

                    // 2. Mark as USED
                    const stockIds = stocks.map(s => s.id);
                    await tx.digitalStock.updateMany({
                        where: { id: { in: stockIds } },
                        data: {
                            status: 'USED',
                            updatedAt: new Date() // Mark used time
                        }
                    });

                    // 3. Decrement ProductVariant Stock
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: { stock: { decrement: item.quantity } }
                    });

                    // 4. Update OrderItem with SN (The Payload)
                    const snContent = stocks.map(s => s.payloadEncrypted).join('\n\n--- ITEM BOUNDARY ---\n\n');

                    await tx.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: 'Sukses',
                            sn: snContent,
                            note: 'Dikirim otomatis dari stok.'
                        }
                    });
                });

                successCount++;
                // Increment Product Sold Count
                await prisma.product.update({
                    where: { id: item.variant.productId },
                    data: { soldCount: { increment: item.quantity } }
                });
            }
            else {
                // Unknown type or manual handling required (e.g. SOSMED, PULSA if not automated)
                console.log('[Order Fulfillment] Skipping Manual/Unknown Item:', item.variant.name);
            }

        } catch (error: any) {
            console.error(`[Order Fulfillment] Error processing item ${item.id}:`, error.message);
            await prisma.orderItem.update({
                where: { id: item.id },
                data: {
                    note: `Error: ${error.message}`,
                    providerStatus: 'FAILED' // Mark as failed in DB too if exception
                }
            });
            failedCount++;
        }
    }

    // Update Order Status if ALL items are Success
    // Note: If some failed (e.g. Out of Stock), Order stays PROCESSING.
    if (successCount === totalItems) {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'DELIVERED', // Finished
                deliveredAt: new Date()
            }
        });
        console.log('[Order Fulfillment] Order Completed:', orderId);
    } else {
        console.log(`[Order Fulfillment] Order Partial/Pending (Success: ${successCount}, Failed: ${failedCount}, Total: ${totalItems}):`, orderId);

        // Check if ALL failed? (Using verified failedCount)
        if (failedCount === totalItems && totalItems > 0) {
            console.log('[Order Fulfillment] Order All Failed:', orderId);
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'FAILED',
                    updatedAt: new Date()
                }
            });

            // Trigger Auto Refund
            const { refundOrder } = await import('@/lib/refund');
            await refundOrder(orderId, 'Order Fulfillment Failed (All Items)');
        }
    }
}
