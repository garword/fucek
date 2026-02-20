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

        const product = await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                imageUrl: data.imageUrl,
                categoryId: data.categoryId,
                isActive: data.isActive,
                ratingValue: Number(data.ratingValue),
                reviewCount: Number(data.reviewCount),
                soldCount: Number(data.soldCount),
                wishlistCount: Number(data.wishlistCount) || 0
            } as any
        });
        await logAdminAction(session.userId, 'UPDATE_PRODUCT', `Updated product: ${data.name}`);
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        // Soft delete
        await prisma.product.update({
            where: { id },
            data: { isDeleted: true, isActive: false }
        });
        await logAdminAction(session.userId, 'DELETE_PRODUCT', `Soft deleted product ID: ${id}`);
        return NextResponse.json({ message: 'Product deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
