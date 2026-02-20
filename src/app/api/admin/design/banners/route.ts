import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const BANNER_SLUG = 'home_banners';

/**
 * GET /api/admin/design/banners
 * Get all configured banners
 */
export async function GET(req: Request) {
    try {
        const content = await prisma.siteContent.findUnique({
            where: { slug: BANNER_SLUG }
        });

        const banners = content?.content ? JSON.parse(content.content) : [];

        return NextResponse.json({ success: true, banners });
    } catch (error: any) {
        console.error('[Banner API Error]', error);
        return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
    }
}

/**
 * POST /api/admin/design/banners
 * Update banners list
 * Body: { banners: [{ id, imageUrl, linkUrl, active }] }
 */
export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { banners } = body;

        if (!Array.isArray(banners)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        if (banners.length > 4) {
            return NextResponse.json({ error: 'Maksimal 4 banner diizinkan' }, { status: 400 });
        }

        // Validate structure
        const validBanners = banners.map((b: any) => ({
            id: b.id || crypto.randomUUID(),
            imageUrl: b.imageUrl,
            linkUrl: b.linkUrl || '#',
            active: b.active !== false // Default true
        }));

        await prisma.siteContent.upsert({
            where: { slug: BANNER_SLUG },
            update: {
                content: JSON.stringify(validBanners),
                title: 'Home Banners'
            },
            create: {
                slug: BANNER_SLUG,
                title: 'Home Banners',
                content: JSON.stringify(validBanners)
            }
        });

        return NextResponse.json({ success: true, banners: validBanners });
    } catch (error: any) {
        console.error('[Banner Save Error]', error);
        return NextResponse.json({ error: error.message || 'Failed to save banners' }, { status: 500 });
    }
}
