
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const variants = await prisma.productVariant.findMany({
        where: { productId: params.id, isDeleted: false },
        orderBy: { sortOrder: 'asc' }
    });
    return NextResponse.json(variants);
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await req.json();
        const variant = await prisma.productVariant.create({
            data: {
                productId: params.id,
                name: data.name,
                price: Number(data.price),
                durationDays: Number(data.durationDays),
                warrantyDays: Number(data.warrantyDays),
                sortOrder: Number(data.sortOrder) || 0,
                isActive: data.isActive
            }
        });
        return NextResponse.json(variant);
    } catch (error) {
        console.error('Create Variant Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
