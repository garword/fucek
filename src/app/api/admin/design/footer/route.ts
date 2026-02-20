import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

const DEFAULT_CONFIG = {
    description: "Marketplace produk digital terpercaya. Solusi hemat untuk kebutuhan streaming, desain, dan produktivitas Anda.",
    contact: [
        { type: "Email", value: "support@store.com", icon: "Mail" },
        { type: "WhatsApp", value: "+62 812 3456 7890", icon: "Phone" },
        { type: "Alamat", value: "Jakarta, Indonesia", icon: "MapPin" }
    ],
    socials: [
        { platform: "Instagram", url: "#", icon: "Instagram" },
        { platform: "Twitter", url: "#", icon: "Twitter" },
        { platform: "Facebook", url: "#", icon: "Facebook" }
    ],
    menus: [
        {
            title: "Informasi",
            links: [
                { label: "Tentang Kami", url: "/info/about" },
                { label: "Cara Beli", "url": "/info/how-to-buy" },
                { label: "FAQ", "url": "/info/faq" },
                { label: "Blog", "url": "/info/blog" }
            ]
        },
        {
            title: "Bantuan & Legal",
            links: [
                { label: "Syarat & Ketentuan", "url": "/info/terms" },
                { label: "Kebijakan Privasi", "url": "/info/privacy" },
                { label: "Kebijakan Refund", "url": "/info/refund" },
                { label: "Hubungi Kami", "url": "/info/contact" }
            ]
        }
    ]
};

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const setting = await prisma.siteSetting.findUnique({
            where: { key: 'footer_config' },
        });

        if (setting) {
            const config = JSON.parse(setting.value);
            // Merge with default menus if missing
            if (!config.menus) {
                config.menus = DEFAULT_CONFIG.menus;
            }
            return NextResponse.json(config);
        }

        return NextResponse.json(DEFAULT_CONFIG);
    } catch (error) {
        console.error("Failed to fetch footer config:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();

        // Basic validation
        if (!body.description || !body.contact || !body.socials) {
            return new NextResponse('Invalid data', { status: 400 });
        }

        const updatedSetting = await prisma.siteSetting.upsert({
            where: { key: 'footer_config' },
            update: { value: JSON.stringify(body) },
            create: {
                key: 'footer_config',
                value: JSON.stringify(body),
            },
        });

        revalidatePath('/', 'page');
        revalidatePath('/info/[slug]', 'page');

        return NextResponse.json(JSON.parse(updatedSetting.value));
    } catch (error) {
        console.error('[FOOTER_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
