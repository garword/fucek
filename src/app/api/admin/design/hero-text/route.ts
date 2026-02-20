
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const HERO_TEXT_SLUG = 'home_hero_text';

export async function GET(req: Request) {
    try {
        const content = await prisma.siteContent.findUnique({
            where: { slug: HERO_TEXT_SLUG }
        });

        const data = content?.content ? JSON.parse(content.content) : {
            title: "Topup Cepat, *Murah*, dan Aman",
            subtitle: "Platform topup game dan produk digital terpercaya. Proses otomatis 24 jam dengan harga terbaik.",
            buttonText: "Mulai Belanja",
            buttonLink: "#products"
        };

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('[Hero Text API Error]', error);
        return NextResponse.json({ error: 'Failed to fetch hero text' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, subtitle, buttonText, buttonLink } = body;

        const data = {
            title: title || "Topup Cepat, *Murah*, dan Aman",
            subtitle: subtitle || "",
            buttonText: buttonText || "Mulai Belanja",
            buttonLink: buttonLink || "#products"
        };

        await prisma.siteContent.upsert({
            where: { slug: HERO_TEXT_SLUG },
            update: {
                content: JSON.stringify(data),
                title: 'Home Hero Text'
            },
            create: {
                slug: HERO_TEXT_SLUG,
                title: 'Home Hero Text',
                content: JSON.stringify(data)
            }
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('[Hero Text Save Error]', error);
        return NextResponse.json({ error: 'Failed to save hero text' }, { status: 500 });
    }
}
