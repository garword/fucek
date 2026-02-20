
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkStatus } from '@/lib/medanpedia';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const orderItems = await prisma.orderItem.findMany({
            where: {
                providerStatus: { in: ['PENDING', 'PROCESSING'] },
                variant: {
                    bestProvider: 'MEDANPEDIA' // Ensure we only check MedanPedia items
                },
                providerTrxId: { not: null }
            },
            include: {
                order: {
                    include: { user: true }
                },
                variant: true
            },
            take: 20
        });

        if (orderItems.length === 0) {
            return NextResponse.json({ message: 'No items to check' });
        }

        let updatedCount = 0;
        let refundCount = 0;

        for (const item of orderItems) {
            if (!item.providerTrxId) continue;

            try {
                const mpData = await checkStatus(item.providerTrxId);
                // mpData: { status, start_count, remains }

                if (!mpData || !mpData.status) continue;

                const mpStatus = mpData.status; // 'Success', 'Error', 'Partial', 'Processing', 'Pending'
                const startCount = Number(mpData.start_count) || 0;
                const remains = Number(mpData.remains) || 0;

                // Determine local status
                let newLocalStatus = item.providerStatus;
                let shouldRefund = false;
                let refundAmount = 0;

                if (['Success', 'Completed'].includes(mpStatus)) {
                    newLocalStatus = 'SUCCESS';
                } else if (['Error', 'Canceled'].includes(mpStatus)) {
                    newLocalStatus = 'FAILED';
                    shouldRefund = true;
                    refundAmount = Number(item.subtotal); // Full refund
                } else if (mpStatus === 'Partial') {
                    newLocalStatus = 'PARTIAL'; // We should probably add this to Prisma Enum if strict, or just use string
                    shouldRefund = true;
                    // Calculate Partial Refund
                    // Formula: (Price / Quantity) * Remains
                    // item.priceAtPurchase is total or unit? 
                    // Usually item.priceAtPurchase is unit price (per 1 item in cart, but for SMM quantity is usually 1000 etc)
                    // Wait, SMM price is per 1000. 
                    // item.priceAtPurchase = price for 1 unit of quantity?
                    // In SMM ordering:
                    // Cart Quantity = User Input (e.g. 1000).
                    // Subtotal = (Price per 1000 / 1000) * Quantity.
                    // So unit price ~ (Subtotal / Quantity).

                    const unitPrice = Number(item.subtotal) / item.quantity;
                    refundAmount = unitPrice * remains;
                }

                // If status changed or distinct update needed
                if (newLocalStatus !== item.providerStatus || (startCount !== item.startCount) || (remains !== item.remains)) {

                    await prisma.$transaction(async (tx) => {
                        // 1. Update OrderItem
                        await tx.orderItem.update({
                            where: { id: item.id },
                            data: {
                                providerStatus: newLocalStatus,
                                startCount: startCount,
                                remains: remains,
                                note: `Status: ${mpStatus}. Refunded: ${shouldRefund ? refundAmount : 0}`
                            }
                        });

                        // 2. Process Refund if needed
                        if (shouldRefund && refundAmount > 0) {
                            // Get User for Balance Snapshot
                            const user = await tx.user.findUnique({
                                where: { id: item.order.userId }
                            });

                            if (user) {
                                const balanceBefore = Number(user.balance);
                                const balanceAfter = balanceBefore + refundAmount;

                                // Credit User
                                await tx.user.update({
                                    where: { id: item.order.userId },
                                    data: {
                                        balance: { increment: refundAmount }
                                    }
                                });

                                // Log Transaction
                                await tx.walletTransaction.create({
                                    data: {
                                        userId: item.order.userId,
                                        type: 'REFUND',
                                        amount: refundAmount,
                                        balanceBefore: balanceBefore,
                                        balanceAfter: balanceAfter,
                                        status: 'SUCCESS',
                                        description: `Refund ${mpStatus} Order #${item.providerTrxId}. Sisa: ${remains}`
                                    }
                                });
                                refundCount++;
                            }
                        }
                    });

                    updatedCount++;
                }

            } catch (err) {
                console.error(`Error processing item ${item.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            checked: orderItems.length,
            updated: updatedCount,
            refunded: refundCount
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
