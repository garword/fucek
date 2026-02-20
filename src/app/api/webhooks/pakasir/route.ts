
// ... imports
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

// ... maxDuration

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { order_id, status, amount: bodyAmount } = body;

        console.log('[Pakasir Webhook] Received:', body);

        // Security: Fetch Config
        const config = await prisma.paymentGatewayConfig.findUnique({
            where: { name: 'pakasir' }
        });

        if (!config || !config.isActive) {
            console.error('[Pakasir Webhook] Config missing or inactive');
            return NextResponse.json({ error: 'Config missing' }, { status: 500 });
        }

        // Security: Callback Verification (RECOMMENDED BY DOCS)
        // Verify against Pakasir API to ensure the webhook is not faked
        const verifyUrl = new URL('https://app.pakasir.com/api/transactiondetail');
        verifyUrl.searchParams.append('project', config.slug || '');
        verifyUrl.searchParams.append('amount', bodyAmount?.toString() || '');
        verifyUrl.searchParams.append('order_id', order_id);
        verifyUrl.searchParams.append('api_key', config.apiKey || '');

        const verifyRes = await fetch(verifyUrl.toString());
        const verifyData = await verifyRes.json();

        if (!verifyData?.transaction) {
            console.error('[Pakasir Webhook] Verification Failed:', verifyData);
            return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
        }

        const realStatus = verifyData.transaction.status;
        const realAmount = parseInt(verifyData.transaction.amount);

        // Strict Check
        if (realStatus !== status) {
            console.error(`[Pakasir Webhook] Status Mismatch: Webhook=${status}, API=${realStatus}`);
            return NextResponse.json({ error: 'Status mismatch' }, { status: 403 });
        }

        // Log to file for debugging
        try {
            const logPath = join(process.cwd(), 'webhook-logs.json');
            const existingLogs = JSON.parse(await readFile(logPath, 'utf-8').catch(() => '[]'));
            existingLogs.unshift({
                timestamp: new Date().toISOString(),
                data: body,
                verification: verifyData
            });
            await writeFile(logPath, JSON.stringify(existingLogs.slice(0, 50), null, 2));
        } catch (logError) {
            console.error('[Pakasir Webhook] Log file error:', logError);
        }

        // 1. Find Order
        const order = await prisma.order.findUnique({
            where: { invoiceCode: order_id },
            include: {
                orderItems: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    include: { category: true }
                                },
                                providers: true
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            // 1.5 Check for Deposit (if not Order)
            const deposit = await prisma.deposit.findUnique({
                where: { id: order_id }
            });

            if (deposit) {
                // Verify Amount Match for Deposit
                if (Math.abs(Number(deposit.totalPay) - realAmount) > 100) { // Tolerance 100 peraks
                    console.error('[Pakasir Webhook] Deposit Amount Mismatch', { deposit: deposit.totalPay, real: realAmount });
                    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
                }

                if (status === 'completed') {
                    if (deposit.status === 'PAID') {
                        return NextResponse.json({ message: 'Already processed' });
                    }

                    // ATOMIC TRANSACTION: Credit Balance
                    await prisma.$transaction(async (tx) => {
                        const user = await tx.user.findUnique({ where: { id: deposit.userId } });
                        if (!user) throw new Error("User not found");

                        // 1. Mark Deposit as PAID
                        await tx.deposit.update({
                            where: { id: deposit.id },
                            data: { status: 'PAID' }
                        });

                        // 2. Increment User Balance
                        const currentBalance = Number(user.balance);
                        const amountToAdd = Number(deposit.amount); // Add the original amount, not totalPay (fee is consumed)
                        const newBalance = currentBalance + amountToAdd;

                        await tx.user.update({
                            where: { id: user.id },
                            data: { balance: newBalance }
                        });

                        // 3. Log Transaction
                        await tx.walletTransaction.create({
                            data: {
                                userId: user.id,
                                type: 'DEPOSIT',
                                amount: deposit.amount,
                                balanceBefore: currentBalance,
                                balanceAfter: newBalance,
                                referenceId: deposit.id,
                                description: `Deposit via ${deposit.paymentMethod}`
                            }
                        });
                    });

                    return NextResponse.json({ success: true, type: 'DEPOSIT' });
                } else if (status === 'canceled' || status === 'failed' || status === 'expired') {
                    await prisma.deposit.update({
                        where: { id: deposit.id },
                        data: { status: 'CANCELED' }
                    });
                    return NextResponse.json({ success: true, status: 'CANCELED' });
                }

                return NextResponse.json({ message: 'Ignored status for deposit' });
            }

            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Verify Amount Match for Order
        if (Math.abs(Number(order.totalAmount) - realAmount) > 100) {
            console.error('[Pakasir Webhook] Order Amount Mismatch', { order: order.totalAmount, real: realAmount });
            return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
        }

        // 2. Verify Payment Status
        if (status === 'completed') {
            // Idempotency check? If already processing/delivered, skip?
            if (order.status === 'DELIVERED' || order.status === 'PROCESSING') {
                return NextResponse.json({ message: 'Already processed' });
            }

            // Update to PROCESSING
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PROCESSING' }
            });

            // 3. Process Fulfillment (Centralized)
            const { fulfillOrder } = await import('@/lib/order-fulfillment');
            await fulfillOrder(order.id);

        } else if (status === 'canceled' || status === 'failed') {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'CANCELED' }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Pakasir Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
