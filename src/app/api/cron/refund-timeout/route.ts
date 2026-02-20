
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refundOrder } from '@/lib/refund';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Find Stale Orders
        // Criteria: Status is PENDING or PROCESSING
        // CreatedAt is older than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const staleOrders = await prisma.order.findMany({
            where: {
                status: { in: ['PENDING', 'PROCESSING'] },
                createdAt: { lt: tenMinutesAgo },
                // paymentMethod: { not: 'manual' } // Only auto-refund automated payments?
                // User said "Topup Game... if > 10 mins refund". 
                // Mostly this applies to paid orders that are stuck.
                // If paymentMethod is Qris and IT IS PAID (status PROCESSING), then refund.
                // If status is PENDING and Payment is Qris, it might just be unpaid. We should CANCEL unpaid orders but NOT refund (user didn't pay).
                // Wait. PENDING usually means "Waiting for Payment" in my system (from Deposit/Checkout logic).
                // PROCESSING means "Paid, waiting for provider".
                // So checking "PROCESSING" is the key for refunds.
                // "PENDING" orders older than 10 mins should just be CANCELED (Expiry), no refund.
            },
            take: 50 // Batch size
        });

        const results = {
            processed: 0,
            refunded: 0,
            canceled: 0,
            errors: 0
        };

        for (const order of staleOrders) {
            results.processed++;

            if (order.status === 'PROCESSING') {
                // Paid but stuck -> REFUND
                const res = await refundOrder(order.id, 'Timeout > 10 Minutes (Auto Refund)');
                if (res.success) results.refunded++;
                else results.errors++;
            } else if (order.status === 'PENDING') {
                // Unpaid and expired -> CANCEL (No Refund)
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELED' }
                });
                results.canceled++;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Timeout check completed',
            results
        });

    } catch (error) {
        console.error('Cron Timeout Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
