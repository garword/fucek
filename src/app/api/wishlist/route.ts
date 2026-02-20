
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const wishlist = await prisma.wishlistItem.findMany({
            where: { userId: session.userId },
            include: {
                variant: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(wishlist);
    } catch (error) {
        console.error('Wishlist GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { variantId } = await req.json();
        if (!variantId) {
            return NextResponse.json({ error: 'Variant ID required' }, { status: 400 });
        }

        // Use findFirst to avoid potential compound index naming issues
        const existing = await prisma.wishlistItem.findFirst({
            where: {
                userId: session.userId,
                variantId,
            },
        });

        if (existing) {
            await prisma.wishlistItem.delete({
                where: { id: existing.id },
            });
            return NextResponse.json({ message: 'Dihapus dari wishlist', action: 'removed' });
        } else {
            await prisma.wishlistItem.create({
                data: {
                    userId: session.userId,
                    variantId,
                },
            });
            return NextResponse.json({ message: 'Ditambahkan ke wishlist', action: 'added' });
        }
    } catch (error: any) {
        console.error('Wishlist POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
