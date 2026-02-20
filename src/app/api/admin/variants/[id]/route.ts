
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = params;
        const data = await req.json();

        const variant = await prisma.productVariant.update({
            where: { id },
            data: {
                name: data.name,
                price: Number(data.price),
                originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
                durationDays: Number(data.durationDays),
                warrantyDays: Number(data.warrantyDays),
                sortOrder: Number(data.sortOrder),
                isActive: data.isActive
            } as any
        });
        return NextResponse.json(variant);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = params;

        // Check if used in orders?
        const ordersCount = await prisma.orderItem.count({ where: { variantId: id } });

        if (ordersCount > 0) {
            // Soft Delete (Disable) if used in orders
            await prisma.productVariant.update({
                where: { id },
                data: {
                    isActive: false,
                    isDeleted: true // Mark as deleted for filtering
                }
            });
            return NextResponse.json({ message: 'Variant archived (used in orders)' });
        } else {
            // Hard delete - Must delete related records first due to FK constraints
            await prisma.$transaction(async (tx) => {
                // 1. Delete VariantProviders
                await tx.variantProvider.deleteMany({ where: { variantId: id } });

                // 2. Delete DigitalStocks
                await tx.digitalStock.deleteMany({ where: { variantId: id } });

                // 3. Delete CartItems
                await tx.cartItem.deleteMany({ where: { variantId: id } });

                // 4. Delete WishlistItems
                await tx.wishlistItem.deleteMany({ where: { variantId: id } });

                // 5. Finally Delete Variant
                await tx.productVariant.delete({ where: { id } });
            });

            return NextResponse.json({ message: 'Variant deleted successfully' });
        }
    } catch (error: any) {
        console.error('[Admin Variant Delete] Error:', error.message);
        return NextResponse.json({ error: error.message || 'Failed to delete variant' }, { status: 500 });
    }
}
