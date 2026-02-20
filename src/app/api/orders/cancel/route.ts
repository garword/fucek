
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { invoiceCode } = body;

        if (!invoiceCode) {
            return NextResponse.json({ error: 'Invoice code required' }, { status: 400 });
        }

        let order = await prisma.order.findUnique({
            where: { invoiceCode }
        });

        if (!order) {
            // Check Deposit
            const deposit = await prisma.deposit.findUnique({
                where: { id: invoiceCode }
            });

            if (deposit) {
                if (deposit.userId !== session.userId) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                if (deposit.status !== 'PENDING') {
                    return NextResponse.json({ error: 'Cannot cancel non-pending deposit' }, { status: 400 });
                }

                await prisma.deposit.update({
                    where: { id: deposit.id },
                    data: { status: 'CANCELED' }
                });
                return NextResponse.json({ success: true, type: 'DEPOSIT' });
            }

            return NextResponse.json({ error: 'Order/Deposit not found' }, { status: 404 });
        }

        if (order.userId !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json({ error: 'Cannot cancel non-pending order' }, { status: 400 });
        }

        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELED' }
        });

        return NextResponse.json({ success: true, type: 'ORDER' });
    } catch (error) {
        console.error('Cancel Order Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
