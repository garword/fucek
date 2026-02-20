import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (!type) {
            return NextResponse.json({ error: 'Type is required' }, { status: 400 });
        }

        // Delete all products of this category type
        // First find categories of this type
        const categories = await prisma.category.findMany({
            where: { type: type },
            select: { id: true }
        });

        const categoryIds = categories.map(c => c.id);

        if (categoryIds.length === 0) {
            return NextResponse.json({ message: 'No categories found for this type', count: 0 });
        }

        // 1. Get all Product IDs for this type
        const products = await prisma.product.findMany({
            where: { category: { type: type } },
            select: { id: true }
        });
        const productIds = products.map(p => p.id);

        if (productIds.length === 0) {
            return NextResponse.json({ message: 'No products found.', count: 0 });
        }

        // 2. Get all Variant IDs
        const variants = await prisma.productVariant.findMany({
            where: { productId: { in: productIds } },
            select: { id: true }
        });
        const variantIds = variants.map(v => v.id);

        console.log(`Deleting ${productIds.length} products and ${variantIds.length} variants...`);

        // 3. Transactions for Deep Clean (Order Matters!)
        await prisma.$transaction([
            // Dependents of Variants
            prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } }),
            prisma.wishlistItem.deleteMany({ where: { variantId: { in: variantIds } } }),
            prisma.orderItem.deleteMany({ where: { variantId: { in: variantIds } } }), // CAUTION: Deletes order history details
            prisma.digitalStock.deleteMany({ where: { variantId: { in: variantIds } } }),
            prisma.variantProvider.deleteMany({ where: { variantId: { in: variantIds } } }),

            // Dependents of Products
            prisma.review.deleteMany({ where: { productId: { in: productIds } } }),

            // The Variants themselves
            prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } }),

            // The Products themselves
            prisma.product.deleteMany({ where: { id: { in: productIds } } }),
        ]);

        return NextResponse.json({
            success: true,
            message: `Berhasil menghapus ${productIds.length} produk dan data terkait.`,
            count: productIds.length
        });

    } catch (error: any) {
        console.error('Delete All Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
