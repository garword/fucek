
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    const where = productId ? { productId } : {};

    const variants = await prisma.productVariant.findMany({
        where,
        include: {
            product: {
                select: { name: true }
            },
            _count: {
                select: { stocks: { where: { status: 'AVAILABLE' } } }
            }
        },
        orderBy: [
            { product: { name: 'asc' } },
            { sortOrder: 'asc' }
        ]
    });

    return NextResponse.json(variants);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { productId, name, price, originalPrice, durationDays, warrantyDays, sortOrder, isActive } = body;

        if (!productId || !name || !price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const variant = await prisma.productVariant.create({
            data: {
                productId,
                name,
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                durationDays: parseInt(durationDays),
                warrantyDays: parseInt(warrantyDays),
                sortOrder: parseInt(sortOrder || 0),
                isActive: isActive ?? true
            } as any
        });

        await logAdminAction(session.userId, 'CREATE_VARIANT', `Created variant ${name} for product ${productId}`);

        return NextResponse.json(variant);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
