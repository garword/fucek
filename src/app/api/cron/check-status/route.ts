import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkDigiflazzStatus } from '@/lib/digiflazz';
import { checkTokoVoucherStatus, getTokoVoucherConfig } from '@/lib/tokovoucher';
import { checkStatus as checkMedanPediaStatus } from '@/lib/medanpedia';
import { refundOrder } from '@/lib/refund';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute max

export async function GET(req: Request) {
    console.log('[Cron] Starting Background Status Check...');
    const logs: string[] = [];

    try {
        // --- 1. EXPIRING UNPAID ORDERS (> 60 Minutes) ---
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const expiredOrders = await prisma.order.updateMany({
            where: {
                status: 'PENDING',
                createdAt: { lt: oneHourAgo }
            },
            data: { status: 'CANCELED' }
        });
        if (expiredOrders.count > 0) {
            logs.push(`Expired ${expiredOrders.count} unpaid orders.`);
        }

        // --- 2. CHECK SMM ORDERS (MEDANPEDIA) ---
        // SMM orders can take days, so we check them regardless of age (limit to 20 to preserve resources)
        const pendingSmmItems = await prisma.orderItem.findMany({
            where: {
                // Check local statuses that indicate "not finished"
                providerStatus: { in: ['Pending', 'Processing', 'In Progress'] },
                variant: { product: { category: { type: 'SOSMED' } } },
                providerTrxId: { not: null }
            },
            take: 20,
            orderBy: { order: { createdAt: 'desc' } }
        });

        for (const item of pendingSmmItems) {
            if (!item.providerTrxId) continue;
            try {
                // Check Status via API
                const statusRes = await checkMedanPediaStatus(item.providerTrxId);

                // Maps MedanPedia status to our convention if needed, or keep raw
                // MP Statuses: Pending, Processing, Success, Error, Partial

                if (statusRes.status !== item.providerStatus || statusRes.remains !== item.remains || statusRes.start_count !== item.startCount) {
                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: statusRes.status,
                            startCount: statusRes.start_count,
                            remains: statusRes.remains
                        }
                    });
                    logs.push(`SMM [${item.providerTrxId}]: ${item.providerStatus} -> ${statusRes.status}`);

                    // If SMM item is Success, we *could* mark order delivered, but SMM orders are often part of a basket?
                    // Usually SMM is single item per order.
                    if (statusRes.status === 'Success') {
                        await prisma.order.update({
                            where: { id: item.orderId },
                            data: { status: 'DELIVERED', deliveredAt: new Date() }
                        });
                    }
                }
            } catch (err: any) {
                logs.push(`SMM Error [${item.providerTrxId}]: ${err.message}`);
            }
        }

        // --- 3. CHECK PROCESSING PPOB ORDERS (DIGI/TOKO) ---
        // These are expected to be instant. Check orders updated > 1 min ago.
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const orders = await prisma.order.findMany({
            where: {
                status: 'PROCESSING',
                updatedAt: { lt: oneMinuteAgo, gt: oneDayAgo }
            },
            include: {
                orderItems: {
                    include: {
                        variant: {
                            include: {
                                providers: true,
                                product: {
                                    include: { category: true }
                                }
                            }
                        },
                        order: true // Include parent order for context if needed
                    }
                }
            },
            take: 50
        });

        for (const order of orders) {
            let orderUpdated = false;

            for (const item of order.orderItems) {
                if (['SUCCESS', 'FAILED'].includes(item.providerStatus || '')) continue;
                if (!item.target) continue;

                // SKIP SOSMED ITEMS HERE (Handled above)
                if (item.variant?.product?.categoryId && (item.variant as any).product?.category?.type === 'SOSMED') continue;
                // Safer check: look at provider code
                const providerCode = item.variant?.bestProvider || item.variant?.providers[0]?.providerCode;
                if (providerCode === 'MEDANPEDIA') continue;

                const refId = order.invoiceCode;

                // --- PPOB TIMEOUT CHECK (5 Minutes) ---
                const now = new Date();
                const orderTime = new Date(order.updatedAt);
                const diffMinutes = (now.getTime() - orderTime.getTime()) / 1000 / 60;

                if (diffMinutes > 5) {
                    logs.push(`Order ${order.invoiceCode} Timeout (${diffMinutes.toFixed(1)} mins). Refunding...`);
                    await refundOrder(order.id, 'Timeout Otomatis (> 5 Menit)');
                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: { providerStatus: 'FAILED', note: 'Timeout System' }
                    });
                    break; // Stop processing this order
                }

                try {
                    if (providerCode === 'DIGIFLAZZ') {
                        const digiProvider = item.variant?.providers.find(p => p.providerCode === 'DIGIFLAZZ');
                        if (digiProvider) {
                            const statusRes = await checkDigiflazzStatus({
                                buyer_sku_code: digiProvider.providerSku,
                                customer_no: item.target,
                                ref_id: refId
                            });

                            if (statusRes.data?.rc === '00') {
                                await prisma.orderItem.update({
                                    where: { id: item.id },
                                    data: { providerStatus: 'SUCCESS', sn: statusRes.data.sn, note: statusRes.data.message }
                                });
                                orderUpdated = true;
                            } else if (statusRes.data?.rc && statusRes.data.rc !== '03') {
                                const failMsg = statusRes.data.message || 'Provider Failed';
                                await prisma.orderItem.update({
                                    where: { id: item.id },
                                    data: { providerStatus: 'FAILED', note: failMsg }
                                });
                                await refundOrder(order.id, `Cron: ${failMsg}`);
                                break;
                            }
                        }
                    } else if (providerCode === 'TOKOVOUCHER') {
                        const config = await getTokoVoucherConfig();
                        if (config) {
                            const statusRes = await checkTokoVoucherStatus(config, refId);
                            const tvData = statusRes.data || statusRes;

                            // Check for manual check limitation
                            if (tvData?.message?.includes('Manual check not supported')) continue;

                            const tvStatus = tvData?.status;
                            const isSuccess = tvStatus === 'sukses' || tvStatus === 1;
                            const isFailed = tvStatus === 'gagal' || tvStatus === 2 || (tvStatus === 0 && (tvData as any)?.error_msg);

                            if (isSuccess) {
                                await prisma.orderItem.update({
                                    where: { id: item.id },
                                    data: { providerStatus: 'SUCCESS', sn: tvData.sn, note: 'Success' }
                                });
                                orderUpdated = true;
                            } else if (isFailed) {
                                const failMsg = (tvData as any)?.error_msg || 'Failed';
                                await prisma.orderItem.update({
                                    where: { id: item.id },
                                    data: { providerStatus: 'FAILED', note: failMsg }
                                });
                                await refundOrder(order.id, `Cron: ${failMsg}`);
                                break;
                            }
                        }
                    } else if (providerCode === 'APIGAMES') {
                        const { getAPIGamesConfig, checkAPIGamesStatus } = await import('@/lib/apigames');
                        const apiConfig = await getAPIGamesConfig();

                        // Ref ID for APIGames is: INVOICE-ITEM_SUFFIX
                        const itemSuffix = item.id.slice(-4);
                        const apiRefId = `${order.invoiceCode}-${itemSuffix}`;

                        if (apiConfig) {
                            const statusRes = await checkAPIGamesStatus(apiConfig, apiRefId);

                            if (statusRes.status === 'SUCCESS') {
                                await prisma.orderItem.update({
                                    where: { id: item.id },
                                    data: { providerStatus: 'SUCCESS', sn: statusRes.sn, note: statusRes.message }
                                });
                                orderUpdated = true;
                            } else if (statusRes.status === 'FAILED') {
                                await prisma.orderItem.update({
                                    where: { id: item.id },
                                    data: { providerStatus: 'FAILED', note: statusRes.message }
                                });
                                await refundOrder(order.id, `Cron: ${statusRes.message}`);
                                break;
                            }
                        }
                    }
                } catch (error: any) {
                    logs.push(`Error checking item ${item.id}: ${error.message}`);
                }
            }

            // Check status update for PPOB
            if (orderUpdated) {
                const freshOrder = await prisma.order.findUnique({
                    where: { id: order.id },
                    include: { orderItems: true }
                });
                if (freshOrder && freshOrder.status === 'PROCESSING') {
                    const allSuccess = freshOrder.orderItems.every(i => i.providerStatus === 'SUCCESS');
                    if (allSuccess) {
                        await prisma.order.update({
                            where: { id: order.id },
                            data: { status: 'DELIVERED', deliveredAt: new Date() }
                        });
                        logs.push(`Order ${order.invoiceCode} marked DELIVERED`);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, logs });
    } catch (error: any) {
        console.error('Cron Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
