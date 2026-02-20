
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
        const { code } = await req.json();

        const promo = await prisma.promoCode.findUnique({
            where: { code },
        });

        if (!promo) {
            return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 });
        }

        if (!promo.isActive) {
            return NextResponse.json({ error: 'Promo code inactive' }, { status: 400 });
        }

        const now = new Date();
        if (promo.startAt && now < promo.startAt) {
            return NextResponse.json({ error: 'Promo not started yet' }, { status: 400 });
        }
        if (promo.endAt && now > promo.endAt) {
            return NextResponse.json({ error: 'Promo expired' }, { status: 400 });
        }

        if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
            return NextResponse.json({ error: 'Promo usage limit reached' }, { status: 400 });
        }

        // Upsert into CartMeta
        await prisma.cartMeta.upsert({
            where: { userId: session.id },
            update: { promoCode: code },
            create: { userId: session.id, promoCode: code },
        });

        return NextResponse.json({
            message: 'Promo applied',
            promo: {
                code: promo.code,
                type: promo.type,
                value: Number(promo.value),
            }
        });

    } catch (error) {
        console.error('Promo Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
