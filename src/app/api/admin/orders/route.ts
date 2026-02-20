
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (status && status !== 'ALL') {
        where.status = status;
    }

    if (search) {
        where.OR = [
            { invoiceCode: { contains: search } }, // Case insensitive usually? SQLite default is case-insensitive for LIKE? Prisma handles it?
            // Prisma: Mode 'insensitive'
            { invoiceCode: { contains: search } },
            { user: { email: { contains: search } } }
        ];
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            user: { select: { name: true, email: true, username: true } },
            orderItems: true,
            paymentConfirmation: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
}
