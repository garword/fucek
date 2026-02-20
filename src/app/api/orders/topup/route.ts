import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { topupDigiflazz } from '@/lib/digiflazz';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orders/topup  
 * Process instant topup via Digiflaz
 * 
 * Body:
 * {
 *   variantId: string,
 *   target: string,     // UID + Zone (e.g. "123456789" or "123456789|Server1")
 *   quantity: number
 * }
 */
export async function POST(req: Request) {
    try {
        // 1. Auth Check
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await req.json();
        const { variantId, target, quantity = 1 } = body;

        if (!variantId || !target) {
            return NextResponse.json(
                { error: 'Missing required fields: variantId, target' },
                { status: 400 }
            );
        }

        // 3. Get Variant with Provider Info
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                product: {
                    include: {
                        category: true,
                    },
                },
                providers: {
                    where: { providerCode: 'DIGIFLAZZ' },
                },
            },
        });

        if (!variant) {
            return NextResponse.json({ error: 'Product variant not found' }, { status: 404 });
        }

        // Check if instant delivery (field exists in DB, Prisma client will auto-update)
        // @ts-ignore - deliveryType exists but Prisma types need reload
        if (variant.deliveryType !== 'instant') {
            return NextResponse.json(
                { error: 'This product does not support instant delivery' },
                { status: 400 }
            );
        }

        if (!variant.providers || variant.providers.length === 0) {
            return NextResponse.json(
                { error: 'No provider configured for this product' },
                { status: 500 }
            );
        }

        const provider = variant.providers[0];

        // 4. Calculate Price
        const totalPrice = Number(variant.price) * quantity;

        // 5. Check User Balance (SALDO payment only)
        const user = await prisma.user.findUnique({
            where: { email: session.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // For now, we skip balance check (can add later)
        // if (user.balance < totalPrice) {
        //   return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        // }

        // 6. Generate Order ID
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderId = `INV${timestamp}${random}`;

        // 7. Create Order Record
        const order = await prisma.order.create({
            data: {
                userId: user.id,
                invoiceCode: orderId,
                subtotalAmount: totalPrice,
                totalAmount: totalPrice,
                status: 'PENDING',
            },
        });

        // 8. Create Order Item
        const orderItem = await prisma.orderItem.create({
            data: {
                orderId: order.id,
                variantId: variant.id,
                productName: variant.product.name,
                variantName: variant.name,
                priceAtPurchase: variant.price,
                quantity: quantity,
                subtotal: totalPrice,
                target: target,
                providerStatus: 'PENDING',
            },
        });

        // 10. Call Digiflazz API
        try {
            const digiflazzResult = await topupDigiflazz({
                buyer_sku_code: provider.providerSku,
                customer_no: target,
                ref_id: orderId,
            });

            // 11. Update Order Item with Provider Response
            const data = digiflazzResult.data || {};
            const status = data.status || (digiflazzResult.success ? 'Pending' : 'Failed');
            const isSuccess = digiflazzResult.success;

            await prisma.orderItem.update({
                where: { id: orderItem.id },
                data: {
                    providerTrxId: data.ref_id || null,
                    providerStatus: status.toUpperCase(),
                    sn: data.sn || null,
                    note: JSON.stringify(data),
                },
            });

            // 12. Update Order Status
            if (isSuccess) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: status === 'Success' ? 'DELIVERED' : 'PROCESSING',
                    },
                });
            } else {
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: 'CANCELED',
                    },
                });
            }

            // 13. Return Response
            return NextResponse.json({
                success: isSuccess,
                orderId: orderId,
                status: status,
                message: digiflazzResult.message,
                serialNumber: data.sn,
                data: data,
            });
        } catch (providerError: any) {
            console.error('[Digiflazz Order] Provider error:', providerError);

            // Update order as failed
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: 'CANCELED',
                },
            });

            return NextResponse.json(
                {
                    success: false,
                    error: 'Provider error',
                    message: providerError.message,
                },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[Topup API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
