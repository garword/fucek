import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const data = await req.json();

        const promo = await prisma.promoCode.update({
            where: { id },
            data: {
                code: data.code.toUpperCase(),
                type: data.type,
                value: Number(data.value),
                minOrderAmount: Number(data.minOrderAmount || 0),
                maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
                usageLimit: Number(data.usageLimit || 0),
                startAt: new Date(data.startAt),
                endAt: new Date(data.endAt),
                isActive: data.isActive
            }
        });
        await logAdminAction(session.userId, 'UPDATE_PROMO', `Updated promo: ${data.code}`);
        return NextResponse.json(promo);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        await prisma.promoCode.delete({ where: { id } });
        await logAdminAction(session.userId, 'DELETE_PROMO', `Deleted promo ID: ${id}`);
        return NextResponse.json({ message: 'Promo deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
