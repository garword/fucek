
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' }
    });
    return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, slug, iconKey, sortOrder, isActive } = body;

        const category = await prisma.category.create({
            data: {
                name,
                slug,
                iconKey,
                sortOrder: Number(sortOrder),
                isActive,
                // @ts-ignore
                type: body.type || 'DIGITAL'
            }
        });
        await logAdminAction(session.userId, 'CREATE_CATEGORY', `Created category: ${name} (${slug})`);
        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}

