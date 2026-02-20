import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const body = await req.json();

        const category = await prisma.category.update({
            where: { id },
            data: {
                name: body.name,
                slug: body.slug,
                iconKey: body.iconKey,
                sortOrder: Number(body.sortOrder),
                isActive: body.isActive,
                // @ts-ignore
                type: body.type
            }
        });
        await logAdminAction(session.userId, 'UPDATE_CATEGORY', `Updated category: ${body.name}`);
        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;

        // Check for ACTIVE products
        const activeProductsCount = await prisma.product.count({
            where: { categoryId: id, isDeleted: false }
        });

        if (activeProductsCount > 0) {
            // Disable if there are active products
            await prisma.category.update({ where: { id }, data: { isActive: false } });
            await logAdminAction(session.userId, 'DISABLE_CATEGORY', `Disabled category ID: ${id} (Has active products)`);
            return NextResponse.json({ message: 'Category disabled (has active products)', action: 'disabled' });
        } else {
            // Attempt Hard Delete
            try {
                // Try to delete category directly.
                // NOTE: If there are soft-deleted products linked to this category, this will FAIL due to FK constraints.
                // We could try to delete those soft-deleted products first, but we must respect their Order history (if any).

                // First, try to cleanup products that are already soft-deleted (garbage collection)
                // This might fail if they have relations like OrderItem
                try {
                    await prisma.product.deleteMany({ where: { categoryId: id } });
                } catch (cleanupError) {
                    // Ignore cleanup error, just try deleting category next
                }

                await prisma.category.delete({ where: { id } });
                await logAdminAction(session.userId, 'DELETE_CATEGORY', `Deleted category ID: ${id}`);
                return NextResponse.json({ message: 'Category deleted', action: 'deleted' });

            } catch (error: any) {
                // Determine if error is FK constraint
                if (error.code === 'P2003' || error.code === 'P2014') {
                    // Constraint violation -> Fallback to Disable
                    await prisma.category.update({ where: { id }, data: { isActive: false } });
                    return NextResponse.json({
                        message: 'Category disabled (contains historical data/orders)',
                        action: 'disabled'
                    });
                }
                throw error; // Re-throw other errors
            }
        }
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
