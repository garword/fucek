
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const username = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
    const key = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });
    const margin = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_margin' } });
    const webhookSecret = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_webhook_secret' } });
    const webhookId = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_webhook_id' } });
    const apigamesMerchant = await prisma.siteContent.findUnique({ where: { slug: 'apigames_merchant_id' } });
    const apigamesSecret = await prisma.siteContent.findUnique({ where: { slug: 'apigames_secret_key' } });

    return NextResponse.json({
        username: username?.content || '',
        key: key?.content || '',
        margin: margin?.content || '5',
        webhook_secret: webhookSecret?.content || '',
        webhook_id: webhookId?.content || '',
        apigames_merchant_id: apigamesMerchant?.content || '',
        apigames_secret_key: apigamesSecret?.content || ''
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const reqBody = await req.json();
        const { username, key } = reqBody;

        if (username !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'digiflazz_username' },
                update: { content: username },
                create: { slug: 'digiflazz_username', title: 'Digiflazz Username', content: username }
            });
        }

        if (key !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'digiflazz_key' },
                update: { content: key },
                create: { slug: 'digiflazz_key', title: 'Digiflazz API Key', content: key }
            });
        }

        if (reqBody.margin !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'digiflazz_margin' },
                update: { content: String(reqBody.margin) },
                create: { slug: 'digiflazz_margin', title: 'Digiflazz Margin (%)', content: String(reqBody.margin) }
            });
        }

        if (reqBody.webhook_secret !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'digiflazz_webhook_secret' },
                update: { content: reqBody.webhook_secret },
                create: { slug: 'digiflazz_webhook_secret', title: 'Digiflazz Webhook Secret', content: reqBody.webhook_secret }
            });
        }

        if (reqBody.webhook_id !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'digiflazz_webhook_id' },
                update: { content: reqBody.webhook_id },
                create: { slug: 'digiflazz_webhook_id', title: 'Digiflazz Webhook ID', content: reqBody.webhook_id }
            });
        }

        if (reqBody.apigames_merchant_id !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'apigames_merchant_id' },
                update: { content: reqBody.apigames_merchant_id },
                create: { slug: 'apigames_merchant_id', title: 'APIGames Merchant ID', content: reqBody.apigames_merchant_id }
            });
        }

        if (reqBody.apigames_secret_key !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'apigames_secret_key' },
                update: { content: reqBody.apigames_secret_key },
                create: { slug: 'apigames_secret_key', title: 'APIGames Secret Key', content: reqBody.apigames_secret_key }
            });
        }

        await logAdminAction(session.userId, 'UPDATE_CONFIG', 'Update Konfigurasi Digiflazz');

        return NextResponse.json({ message: 'Konfigurasi berhasil disimpan' });
    } catch (error: any) {
        console.error('Error saving config:', error);
        return NextResponse.json({ error: error.message || 'Gagal menyimpan konfigurasi' }, { status: 500 });
    }
}
