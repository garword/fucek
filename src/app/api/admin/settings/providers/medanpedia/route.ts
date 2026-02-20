
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    const session = await getSession();
    // if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiId = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_api_id' } });
    const apiKey = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_api_key' } });
    const margin = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_margin_percent' } });
    const isActive = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_is_active' } });

    return NextResponse.json({
        config: {
            apiId: apiId?.content || '',
            apiKey: apiKey?.content || '',
            marginPercent: margin?.content || '10',
            isActive: isActive?.content === 'true'
        }
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    // if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { apiId, apiKey, marginPercent, isActive } = body;

    await prisma.siteContent.upsert({
        where: { slug: 'medanpedia_api_id' },
        create: { slug: 'medanpedia_api_id', content: apiId },
        update: { content: apiId }
    });

    await prisma.siteContent.upsert({
        where: { slug: 'medanpedia_api_key' },
        create: { slug: 'medanpedia_api_key', content: apiKey },
        update: { content: apiKey }
    });

    await prisma.siteContent.upsert({
        where: { slug: 'medanpedia_margin_percent' },
        create: { slug: 'medanpedia_margin_percent', content: String(marginPercent) },
        update: { content: String(marginPercent) }
    });

    await prisma.siteContent.upsert({
        where: { slug: 'medanpedia_is_active' },
        create: { slug: 'medanpedia_is_active', content: String(isActive) },
        update: { content: String(isActive) }
    });

    return NextResponse.json({ success: true });
}
