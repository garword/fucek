
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
        await prisma.cartMeta.delete({
            where: { userId: session.id }
        });

        return NextResponse.json({ message: 'Promo removed' });

    } catch (error) {
        // If record doesn't exist, it's fine
        return NextResponse.json({ message: 'Promo removed' });
    }
}
