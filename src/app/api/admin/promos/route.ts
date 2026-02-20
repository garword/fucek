
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const promos = await prisma.promoCode.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(promos);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await req.json();
        const promo = await prisma.promoCode.create({
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
        await logAdminAction(session.userId, 'CREATE_PROMO', `Created promo: ${data.code}`);
        return NextResponse.json(promo);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

