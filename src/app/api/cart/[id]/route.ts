
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { quantity } = await req.json();

        if (quantity < 1) {
            return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
        }

        // Check Stock
        const cartItem = await prisma.cartItem.findUnique({
            where: { id },
            include: {
                variant: {
                    include: {
                        product: { include: { category: true } },
                        _count: {
                            select: {
                                stocks: { where: { status: 'AVAILABLE' } }
                            }
                        }
                    }
                }
            }
        });

        if (!cartItem) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

        const variant = cartItem.variant;
        const isInstant = variant.deliveryType === 'instant' || variant.product?.category?.type === 'GAME';
        const currentStock = isInstant ? 999 : variant._count.stocks;

        if (!isInstant && quantity > currentStock) {
            return NextResponse.json({ error: `Stok tidak cukup. Maksimal: ${currentStock}` }, { status: 400 });
        }

        await prisma.cartItem.update({
            where: { id, userId: session.id }, // Ensure user owns item
            data: { quantity }
        });

        return NextResponse.json({ message: 'Cart updated' });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        await prisma.cartItem.delete({
            where: { id, userId: session.id }
        });
        return NextResponse.json({ message: 'Item removed' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
    }
}
