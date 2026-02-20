
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const content = await prisma.siteContent.findMany({
        orderBy: { slug: 'asc' }
    });
    return NextResponse.json(content);
}

import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
    // Upsert
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { slug, title, content } = await req.json();
        const item = await prisma.siteContent.upsert({
            where: { slug },
            update: { title, content },
            create: { slug, title, content }
        });
        await logAdminAction(session.userId, 'UPDATE_CONTENT', `Updated content: ${slug}`);
        return NextResponse.json(item);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

