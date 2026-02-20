
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { refundOrder } from '@/lib/refund';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const signatureHeader = req.headers.get('x-apigames-authorization');

        // Allowed IPs (Optional, validation is better done via Signature)
        // const allowedIps = ['157.245.207.5'];
        // const ip = req.headers.get('x-forwarded-for') || req.ip;

        const { merchant_id, ref_id, status, sn, message, trx_id } = body;

        // 1. Get Config
        const merchantConfig = await prisma.siteContent.findUnique({ where: { slug: 'apigames_merchant_id' } });
        const secretConfig = await prisma.siteContent.findUnique({ where: { slug: 'apigames_secret_key' } });

        if (!merchantConfig?.content || !secretConfig?.content) {
            console.error('Webhook Error: Missing API Config');
            return NextResponse.json({ status: 0, error: 'Config missing' }, { status: 500 });
        }

        // 2. Verify Signature
        // Formula: md5(merchant_id:secret_key:ref_id)
        const expectedSign = crypto.createHash('md5')
            .update(`${merchantConfig.content}:${secretConfig.content}:${ref_id}`)
            .digest('hex');

        if (signatureHeader !== expectedSign) {
            console.error('Webhook Error: Invalid Signature', { received: signatureHeader, expected: expectedSign });
            return NextResponse.json({ status: 0, error: 'Invalid Signature' }, { status: 403 });
        }

        if (merchant_id !== merchantConfig.content) {
            return NextResponse.json({ status: 0, error: 'Invalid Merchant ID' }, { status: 403 });
        }

        // 3. Find Order Item
        // logic: ref_id was constructed as `${order.invoiceCode}-${item.id.slice(-4)}`
        // We need to split it to find the Order first.
        // InvoiceCode usually looks like: INV-RW-TIMESTAMP-HEX

        // Heuristic: Split by last dash
        const lastDashIndex = ref_id.lastIndexOf('-');
        if (lastDashIndex === -1) {
            console.error('Webhook Error: Invalid Ref ID format', ref_id);
            return NextResponse.json({ status: 1 }); // Ack to stop retry
        }

        const invoiceCode = ref_id.substring(0, lastDashIndex);
        const itemSuffix = ref_id.substring(lastDashIndex + 1);

        const order = await prisma.order.findUnique({
            where: { invoiceCode },
            include: { orderItems: true }
        });

        if (!order) {
            console.error('Webhook Error: Order not found', invoiceCode);
            return NextResponse.json({ status: 1 }); // Ack
        }

        const orderItem = order.orderItems.find(item => item.id.endsWith(itemSuffix));

        if (!orderItem) {
            console.error('Webhook Error: Order Item not found for suffix', itemSuffix);
            return NextResponse.json({ status: 1 });
        }

        // 4. Update Status
        // Status from APIGames: "Sukses", "Gagal", "Pending", "Proses", "Sukses Sebagian", "Validasi Provider"

        await prisma.orderItem.update({
            where: { id: orderItem.id },
            data: {
                providerStatus: status,
                providerTrxId: trx_id,
                sn: sn,
                note: message
            }
        });

        // Auto Refund if Failed
        if (status === 'Gagal') {
            console.log(`APIGames Webhook: OrderItem ${orderItem.id} failed. Triggering Refund for Order ${order.id}`);
            await refundOrder(order.id, `Provider Failed: ${message}`);
        }

        // 5. Check if Order is Fully Completed
        // If all items are Success/Failed (final states), we can update Order Status.
        // Re-fetch items to be sure
        const updatedOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: { orderItems: true }
        });

        // Simple logic: if all items have a final provider status, mark order somewhat?
        // Or just leave as PROCESSING and let Admin verify?
        // User said: "Success" -> "Sukses"

        // Let's at least log it or update if all success
        const allSuccess = updatedOrder?.orderItems.every(i => i.providerStatus === 'Sukses');

        if (allSuccess && order.status === 'PROCESSING') {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'DELIVERED', deliveredAt: new Date() }
            });
        }

        return NextResponse.json({ status: 1, message: 'Webhook Processed' });

    } catch (error) {
        console.error('Webhook Exception:', error);
        return NextResponse.json({ status: 0, error: 'Internal Server Error' }, { status: 500 });
    }
}
