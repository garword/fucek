import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { refundOrder } from '@/lib/refund';

/**
 * TokoVoucher Webhook Handler
 * Receives callback from TokoVoucher API when transaction status changes
 * 
 * Expected payload:
 * {
 *   "kode_produk": "FF5",
 *   "tujuan": "123456789",
 *   "ref_id": "TRX123456",
 *   "status": "success" | "failed",
 *   "sn": "SERIAL_NUMBER",
 *   "message": "Transaction message",
 *   "signature": "MD5_SIGNATURE"
 * }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('[TokoVoucher Webhook] Received:', body);

        const {
            status,
            message,
            sn,
            ref_id,
            trx_id,
            produk,
            sisa_saldo,
            price
        } = body;

        // Validate signature from header
        const authHeader = req.headers.get('X-TokoVoucher-Authorization');

        const config = await prisma.paymentGatewayConfig.findUnique({
            where: { name: 'tokovoucher' }
        });

        if (!config || !config.isActive) {
            console.error('[TokoVoucher Webhook] Provider not configured or inactive');
            return NextResponse.json({ error: 'Provider not configured' }, { status: 400 });
        }

        // Parse combined key (SecretKey|SignatureDefault|BaseUrl)
        const fullKey = config.apiKey || '';
        const parts = fullKey.split('|');
        const secretKey = parts[0] || '';
        const memberCode = config.slug || '';

        // Verify header signature: md5(MEMBER_CODE:SECRET:REF_ID)
        const expectedSignature = crypto
            .createHash('md5')
            .update(`${memberCode}:${secretKey}:${ref_id}`)
            .digest('hex');

        if (authHeader !== expectedSignature) {
            console.error('[TokoVoucher Webhook] Invalid signature');
            console.error('[TokoVoucher Webhook] Expected:', expectedSignature);
            console.error('[TokoVoucher Webhook] Received:', authHeader);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Find order item by provider transaction ID
        const orderItem = await prisma.orderItem.findFirst({
            where: {
                providerTrxId: ref_id
            },
            include: {
                order: true
            }
        });

        if (!orderItem || !orderItem.order) {
            console.error('[TokoVoucher Webhook] Order not found:', ref_id);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const order = orderItem.order;

        // Map TokoVoucher status to our order status
        let newOrderStatus = order.status;
        let newProviderStatus = orderItem.providerStatus || 'PENDING';

        if (status === 'sukses') {
            newOrderStatus = 'DELIVERED';
            newProviderStatus = 'SUCCESS';
        } else if (status === 'gagal') {
            newOrderStatus = 'FAILED';
            newProviderStatus = 'FAILED';
        } else if (status === 'pending') {
            newOrderStatus = 'PROCESSING';
            newProviderStatus = 'PENDING';
        }

        // Update order item with serial number and status
        await prisma.orderItem.update({
            where: { id: orderItem.id },
            data: {
                sn: sn || orderItem.sn,
                providerStatus: newProviderStatus,
                providerTrxId: trx_id, // Update with TokoVoucher transaction ID
                // Sanitize SALDO from message
                note: message
                    ?.replace(/SALDO:\s*\d+(\.\d+)?\.?/gi, '')
                    ?.replace(/Sisa Saldo\s*:?\s*\d+(\.\d+)?/gi, '')
                    ?.replace(/,\s*,/g, ',')
                    ?.trim()
            }
        });

        // Update order status
        await prisma.order.update({
            where: { id: order.id },
            data: {
                status: newOrderStatus,
                updatedAt: new Date()
            }
        });

        // Auto Refund if Failed
        if (newOrderStatus === 'FAILED') {
            console.log(`TokoVoucher Webhook: Order ${order.id} failed. Triggering Refund.`);
            await refundOrder(order.id, `Provider Failed: ${message}`);
        }

        // Log webhook
        await prisma.auditLog.create({
            data: {
                userId: order.userId,
                orderId: order.id,
                action: 'WEBHOOK_RECEIVED',
                details: JSON.stringify({
                    provider: 'TOKOVOUCHER',
                    ref_id,
                    trx_id,
                    status,
                    message,
                    price
                })
            }
        });

        console.log(`[TokoVoucher Webhook] Order ${order.invoiceCode} updated to ${newOrderStatus}`);

        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully'
        });

    } catch (error) {
        console.error('[TokoVoucher Webhook] Error:', error);
        return NextResponse.json({
            error: 'Webhook processing failed',
            message: (error as Error).message
        }, { status: 500 });
    }
}

// Handle GET request for webhook verification/info
export async function GET() {
    return NextResponse.json({
        webhook: 'TokoVoucher Callback Endpoint',
        status: 'active',
        methods: ['POST'],
        description: 'Receives transaction status updates from TokoVoucher'
    });
}
