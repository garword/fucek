import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refundOrder } from '@/lib/refund';
import { checkDigiflazzStatus } from '@/lib/digiflazz';
import { checkTokoVoucherStatus, getTokoVoucherConfig } from '@/lib/tokovoucher';

export async function GET(req: Request, props: { params: Promise<{ code: string }> }) {
    const params = await props.params;
    const { code } = params;

    if (!code) {
        return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const now = new Date();

    const order = await prisma.order.findUnique({
        where: { invoiceCode: code },
        select: { id: true, status: true, expiredAt: true, createdAt: true, invoiceCode: true, userId: true }
    });

    if (!order) {
        // Check Deposit
        const deposit = await prisma.deposit.findUnique({
            where: { id: code },
            select: { id: true, status: true, expiredAt: true }
        });

        if (deposit) {
            // Lazy Cancellation
            if (deposit.status === 'PENDING' && deposit.expiredAt && now > deposit.expiredAt) {
                await prisma.deposit.update({
                    where: { id: deposit.id },
                    data: { status: 'CANCELED' }
                });
                return NextResponse.json({ status: 'CANCELED' });
            }
            // Map PAID to DELIVERED for Frontend consistency
            if (deposit.status === 'PAID') return NextResponse.json({ status: 'DELIVERED' });
            return NextResponse.json({ status: deposit.status });
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // SMART LOGIC: Check if Wallet Transaction exists (Balance Entered)
    // If so, FORCE status to DELIVERED regardless of current state
    if (order.status !== 'DELIVERED' && order.status !== 'CANCELED') {
        const walletTx = await prisma.walletTransaction.findFirst({
            where: {
                userId: order.userId,
                referenceId: order.invoiceCode,
                type: 'DEPOSIT' // Ensure it's a deposit credit
            }
        });

        if (walletTx) {
            console.log(`Smart Logic: Wallet Transaction found for ${code}. Auto-completing.`);
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'DELIVERED', deliveredAt: new Date() }
            });
            return NextResponse.json({ status: 'DELIVERED' });
        }
    }

    // Lazy Cancellation for Order (Unpaid)
    if (order.status === 'PENDING' && order.expiredAt && now > order.expiredAt) {
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELED' }
        });
        return NextResponse.json({ status: 'CANCELED' });
    }

    // Real-Time Provider Check for PROCESSING orders
    if (order.status === 'PROCESSING') {
        let isUpdated = false;

        // Fetch Full details for checking
        const fullOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
                orderItems: {
                    include: {
                        variant: {
                            include: {
                                providers: true,
                                product: { include: { category: true } }
                            }
                        }
                    }
                }
            }
        });

        if (fullOrder && fullOrder.orderItems) {
            for (const item of fullOrder.orderItems) {
                // Skip if already final
                if (['SUCCESS', 'FAILED'].includes(item.providerStatus || '')) continue;

                // SKIP Internal Wallet Items (don't check Digiflazz/Tripay for own wallet)
                if (item.variant?.product?.category?.type === 'WALLET') continue;

                const target = item.target;
                const refId = order.invoiceCode; // Assumption: We use InvoiceCode as RefID

                // Determine Provider
                // Use variant.bestProvider OR first configured provider
                const providerCode = item.variant?.bestProvider || item.variant?.providers[0]?.providerCode;

                if (providerCode === 'DIGIFLAZZ') {
                    const digiProvider = item.variant?.providers.find(p => p.providerCode === 'DIGIFLAZZ');
                    if (digiProvider && target) {
                        console.log(`Checking Digiflazz: ${refId}`);
                        const statusRes = await checkDigiflazzStatus({
                            buyer_sku_code: digiProvider.providerSku,
                            customer_no: target as string,
                            ref_id: refId
                        });

                        // Digiflazz: RC 00 = Success, 03 = Pending, others = Failed
                        if (statusRes.data?.rc === '00') {
                            await prisma.orderItem.update({
                                where: { id: item.id },
                                data: { providerStatus: 'SUCCESS', sn: statusRes.data.sn, note: statusRes.data.message }
                            });
                            isUpdated = true;
                        } else if (statusRes.data?.rc && statusRes.data.rc !== '03') {
                            // FAILED
                            await prisma.orderItem.update({
                                where: { id: item.id },
                                data: { providerStatus: 'FAILED', note: statusRes.data.message }
                            });
                            // Trigger Refund
                            console.log(`Digiflazz Check Failed (${statusRes.data.rc}). Refunding...`);
                            await refundOrder(order.id, `Provider Failed (Realtime): ${statusRes.data.message}`);
                            return NextResponse.json({ status: 'CANCELED' });
                        }
                    }
                } else if (providerCode === 'TOKOVOUCHER') {
                    const config = await getTokoVoucherConfig();
                    if (config) {
                        console.log(`Checking TokoVoucher: ${refId}`);
                        const statusRes = await checkTokoVoucherStatus(config, refId);

                        // TokoVoucher: "pending", "sukses", "gagal"
                        const tvData = statusRes.data || statusRes; // Fallback
                        const tvStatus = tvData?.status;

                        const isSuccess = tvStatus === 'sukses' || tvStatus === 1;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const isFailed = tvStatus === 'gagal' || tvStatus === 2 || (tvStatus === 0 && (tvData as any)?.error_msg);

                        if (isSuccess && tvData) {
                            await prisma.orderItem.update({
                                where: { id: item.id },
                                data: { providerStatus: 'SUCCESS', sn: tvData.sn, note: tvData.message || 'Success' }
                            });
                            isUpdated = true;
                        } else if (isFailed) {
                            // FAILED
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const failMsg = tvData?.sn || tvData?.message || (tvData as any)?.error_msg || 'Failed';
                            await prisma.orderItem.update({
                                where: { id: item.id },
                                data: { providerStatus: 'FAILED', note: failMsg }
                            });
                            // Trigger Refund
                            console.log(`TokoVoucher Check Failed. Refunding...`);
                            await refundOrder(order.id, `Provider Failed (Realtime): ${failMsg}`);
                            return NextResponse.json({ status: 'CANCELED' });
                        }
                    }
                }
            }
        }

        // If updated, check if we can mark Main Order as DELIVERED
        if (isUpdated) {
            const updatedOrder = await prisma.order.findUnique({
                where: { id: order.id },
                include: { orderItems: true }
            });
            // Criteria: All items must be SUCCESS to be DELIVERED
            // If any item is FAILED, we might have partial success (handled above by refunding mostly).
            // But if we have multiple items and one fails, we refund the WHOLE order currently?
            // Yes, refundOrder() refunds the whole order.
            // If multiple items, partial refund logic is needed, but for now assuming 1 item per order mostly.

            if (updatedOrder?.orderItems.every(i => i.providerStatus === 'SUCCESS')) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'DELIVERED', deliveredAt: new Date() }
                });
                return NextResponse.json({ status: 'DELIVERED' });
            }
        }
    }

    // Fallback: Lazy Refund for Order (Paid but Stuck > 10 mins) if Realtime check yielded PENDING still
    const tenMinutes = 10 * 60 * 1000;
    if (order.status === 'PROCESSING' && (now.getTime() - new Date(order.createdAt).getTime() > tenMinutes)) {
        // Only trigger if Realtime check didn't already cancel/refund
        // The realtime check handles explicit "FAILED" status.
        // But if provider says "PENDING" for eternity (>10 mins), we still want to timeout.
        console.log(`Timeout > 10 Minutes Triggered for ${code}`);
        const refundRes = await refundOrder(order.id, 'Timeout > 10 Minutes (Lazy Check)');
        if (refundRes.success) {
            return NextResponse.json({ status: 'CANCELED' });
        }
    }

    return NextResponse.json({ status: order.status });
}
