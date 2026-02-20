import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch from SiteContent
        const username = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
        const apiKey = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });
        const webhookSecret = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_webhook_secret' } });

        // For now, we don't have isActive field for Digiflazz in SiteContent
        // You may want to add it later or check based on existence of credentials
        const isActive = !!(username?.content && apiKey?.content);

        return NextResponse.json({
            config: {
                username: username?.content || '',
                apiKey: apiKey?.content || '',
                webhookSecret: webhookSecret?.content || '',
                isActive: isActive
            }
        });

    } catch (error) {
        console.error('[Digiflazz Config] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { username, apiKey, webhookSecret, isActive } = await req.json();

        // Update SiteContent
        await prisma.siteContent.upsert({
            where: { slug: 'digiflazz_username' },
            update: { content: username || '' },
            create: {
                slug: 'digiflazz_username',
                content: username || ''
            }
        });

        await prisma.siteContent.upsert({
            where: { slug: 'digiflazz_key' },
            update: { content: apiKey || '' },
            create: {
                slug: 'digiflazz_key',
                content: apiKey || ''
            }
        });

        if (webhookSecret !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'digiflazz_webhook_secret' },
                update: { content: webhookSecret || '' },
                create: {
                    slug: 'digiflazz_webhook_secret',
                    content: webhookSecret || ''
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Digiflazz configuration saved successfully'
        });

    } catch (error) {
        console.error('[Digiflazz Config] Error:', error);
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
