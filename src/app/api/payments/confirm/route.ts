
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { invoiceCode, note } = await req.json();

        if (!invoiceCode) {
            return NextResponse.json({ error: 'Invoice Code required' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { invoiceCode }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.userId !== session.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json({ error: 'Order is not pending' }, { status: 400 });
        }

        // Upsert confirmation
        await prisma.paymentConfirmation.upsert({
            where: { orderId: order.id },
            update: { note },
            create: {
                orderId: order.id,
                userId: session.id,
                note
            }
        });

        // Automatically move to PROCESSING for simulation? 
        // Or keep PENDING and let "Admin" move it.
        // User requested: "setelah submit: tampil 'Menunggu verifikasi admin'"
        // So status stays PENDING or maybe we add a 'VERIFYING' status? 
        // Schema has: PENDING | PAID | PROCESSING | DELIVERED | CANCELED
        // Let's keep it PENDING but UI shows "Confirmation Sent" if PaymentConfirmation exists.

        // Actually, let's update order to PROCESSING to indicate "User has paid, waiting admin".
        // Wait, PROCESSING usually means "Paid, now delivering".
        // Let's use PENDING + PaymentConfirmation existence to show "Waiting Verification".

        return NextResponse.json({ message: 'Payment confirmation submitted' });

    } catch (error) {
        console.error('Payment Confirm Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
