
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyWebhookSignature, getDigiflazzConfig } from '@/lib/digiflazz';
import { refundOrder } from '@/lib/refund';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const signatureHeader = req.headers.get('X-Hub-Signature');
        const event = req.headers.get('X-Digiflazz-Event');
        // const userAgent = req.headers.get('User-Agent');

        if (!signatureHeader) {
            console.warn('Digiflazz Webhook: Missing Signature Header');
            // Return 200 to acknowledge receipt but log error, or 400? Digiflazz might retry on 400.
            // Usually best to fail auth with 401/403.
            return NextResponse.json({ error: 'Missing Signature' }, { status: 401 });
        }

        const bodyText = await req.text();
        let payload;
        try {
            payload = JSON.parse(bodyText);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        // 1. Verify Signature
        const config = await getDigiflazzConfig();
        if (!config.webhookSecret) {
            console.error('Digiflazz Webhook: Secret not configured in DB');
            return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
        }

        const isValid = verifyWebhookSignature(bodyText, config.webhookSecret, signatureHeader);
        if (!isValid) {
            console.warn('Digiflazz Webhook: Invalid Signature');
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 403 });
        }

        // 2. Handle Event
        // Digiflazz sends { data: { ... } }
        const data = payload.data;
        if (!data) {
            return NextResponse.json({ message: 'No data field' });
        }

        const { ref_id, rc, status, sn, message, buyer_last_saldo, price } = data;

        console.log(`Digiflazz Webhook [${event}]: Ref=${ref_id}, Status=${status}, RC=${rc}, Msg=${message}`);

        // 3. Find Order Item
        // Our ref_id usually constructed as `INV-XXX-ITEMID` or just `ITEMID` depending on how we sent it.
        // In the Check Status I implemented for APIGames: `refId = ${order.invoiceCode}-${item.id.slice(-4)}`
        // We need to match this convention when we implement the Transaction logic.
        // For now, let's assume we store the exact ref_id in the OrderItem or we can parse it.
        // Ideally, we passed `OrderItem.id` as the RefID or a composite.

        // Strategy: Try to find OrderItem where id matches ref_id (if we used simple IDs) 
        // OR find by a tracking field. 
        // Since we haven't implemented the "Send Transaction" part fully, we decide the convention NOW.
        // Convention: RefID = OrderItem.id (UUID) is easiest/safest if strictly unique. 
        // Digiflazz RefID must be unique. UUID is unique.

        const orderItem = await prisma.orderItem.findUnique({
            where: { id: ref_id },
            include: { order: true }
        });

        if (!orderItem) {
            console.warn(`Digiflazz Webhook: OrderItem not found for RefID ${ref_id}`);
            // Return 200 so Digiflazz stops retrying if it's a permanent mismatch
            return NextResponse.json({ message: 'Order Not Found' });
        }

        // 4. Update Status
        // RC 00 = Success
        // RC 03 = Pending
        // RC 02 / others = Failed

        let newStatus = 'PENDING'; // Default
        if (rc === '00') newStatus = 'SUCCESS';
        else if (rc === '03') newStatus = 'PENDING'; // Digiflazz "Pending"
        else newStatus = 'FAILED';

        // Update Order Item
        await prisma.orderItem.update({
            where: { id: orderItem.id },
            data: {
                providerStatus: status, // "Sukses", "Gagal", etc from Digiflazz
                sn: sn || orderItem.sn,
                note: message,
                // You might also want to update the main status if your schema has it on OrderItem
                // or generic 'status' field?
                // Checking schema... OrderItem usually has `providerStatus`, `sn`.
            }
        });

        // Auto Refund if Failed
        if (newStatus === 'FAILED') {
            console.log(`Digiflazz Webhook: OrderItem ${orderItem.id} failed. Triggering Refund for Order ${orderItem.order.id}`);
            await refundOrder(orderItem.order.id, `Provider Failed: ${message}`);
        }

        // Optionally update main Order status if all items are done?
        // For now, just logging and updating item details is key.

        return NextResponse.json({ success: true, message: 'Webhook Processed' });

    } catch (error: any) {
        console.error('Digiflazz Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
