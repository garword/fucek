
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
        const cartItems = await prisma.cartItem.findMany({
            where: { userId: session.userId },
            include: {
                variant: {
                    include: {
                        product: {
                            include: {
                                category: true
                            }
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Validasi basic price changes or stock could go here
        const total = cartItems.reduce((acc, item) => {
            return acc + (Number(item.variant.price) * item.quantity);
        }, 0);

        return NextResponse.json({ items: cartItems, total });
    } catch (error) {
        console.error('Cart GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { variantId, quantity = 1, target, zoneId, accountInfo, customComments } = await req.json();

        console.log('[Cart API] Request:', { variantId, quantity, target, zoneId, accountInfo, customComments, userId: session.userId });

        if (!variantId) {
            return NextResponse.json({ error: 'Variant ID required' }, { status: 400 });
        }

        // Validate user exists
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
        });

        if (!user) {
            console.error('[Cart API] User not found:', session.userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Validate variant exists
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                product: { include: { category: true } },
                _count: {
                    select: {
                        stocks: { where: { status: 'AVAILABLE' } }
                    }
                }
            }
        });

        if (!variant) {
            console.error('[Cart API] Variant not found:', variantId);
            return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
        }

        console.log('[Cart API] Validation passed - User:', user.email, 'Variant:', variant.name);

        // Check existing
        const existing = await prisma.cartItem.findFirst({
            where: {
                userId: session.userId,
                variantId,
            },
        });

        // Check Stock Availability
        const isInstant = variant.deliveryType === 'instant' || variant.product?.category?.type === 'GAME';
        // Use real DigitalStock count for manual delivery products
        const currentStock = isInstant ? 999 : variant._count.stocks;

        if (!isInstant) {
            const requestedTotal = quantity; // + existing quantity if any

            if (existing) {
                if (existing.quantity + quantity > currentStock) {
                    return NextResponse.json({ error: `Stok tidak cukup. Tersisa ${currentStock}` }, { status: 400 });
                }
            } else {
                if (quantity > currentStock) {
                    return NextResponse.json({ error: `Stok tidak cukup. Tersisa ${currentStock}` }, { status: 400 });
                }
            }
        }

        if (existing) {
            console.log('[Cart API] Updating existing cart item:', existing.id);
            await prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity }
            });
        } else {
            // Store target with account info if available
            let targetValue = target || null;
            if (accountInfo?.name) {
                // Format: "ID (Username)" for display
                targetValue = zoneId
                    ? `${target} (${zoneId}) - ${accountInfo.name}`
                    : `${target} - ${accountInfo.name}`;
            }

            // Append Custom Comments if exists
            if (customComments) {
                targetValue = `${target} | COMMENTS: ${customComments}`;
            }

            console.log('[Cart API] Creating new cart item:', {
                userId: session.userId,
                variantId,
                quantity,
                target: targetValue
            });

            await prisma.cartItem.create({
                data: {
                    userId: session.userId,
                    variantId,
                    quantity,
                    target: targetValue
                }
            });
        }

        return NextResponse.json({ message: 'Added to cart' });

    } catch (error: any) {
        console.error('[Cart API] Error:', error);
        console.error('[Cart API] Error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta
        });
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
