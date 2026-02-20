import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const q = searchParams.get('q'); // Search query

    const where: any = { isDeleted: false };
    if (type) {
        where.category = { type: type };
    }
    if (q) {
        where.name = { contains: q }; // Case-insensitive in SQLite usually needing mode: 'insensitive' if Postgres
    }

    const productsRaw = await prisma.product.findMany({
        where,
        include: {
            category: true,
            // Count active variants only (exclude soft deleted)
            variants: {
                where: { isDeleted: false },
                select: { id: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: q ? 20 : undefined // Limit results if searching
    });

    // Transform to match expected frontend structure with _count
    const products = productsRaw.map(p => ({
        ...p,
        variants: undefined, // Don't send array to client
        _count: { variants: p.variants.length }
    }));

    return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await req.json();
        const product = await prisma.product.create({
            // @ts-ignore
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                imageUrl: data.imageUrl,
                categoryId: data.categoryId,
                isActive: data.isActive,
                instantDeliveryInfo: data.instantDeliveryInfo,
                warrantyInfo: data.warrantyInfo,
                supportInfo: data.supportInfo,
                ratingValue: Number(data.ratingValue) || 5.0,
                reviewCount: Number(data.reviewCount) || 10,
                soldCount: Number(data.soldCount) || 0,
                wishlistCount: Number(data.wishlistCount) || 0
            } as any
        });
        await logAdminAction(session.userId, 'CREATE_PRODUCT', `Created product: ${data.name}`);
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

