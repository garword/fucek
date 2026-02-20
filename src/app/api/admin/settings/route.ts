
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const geminiConfig = await prisma.siteContent.findUnique({ where: { slug: 'gemini_api_key' } });
    const openRouterConfig = await prisma.siteContent.findUnique({ where: { slug: 'openrouter_api_key' } });
    const openRouterModelConfig = await prisma.siteContent.findUnique({ where: { slug: 'openrouter_model' } });
    const turnstileSiteConfig = await prisma.siteContent.findUnique({ where: { slug: 'turnstile_site_key' } });
    const turnstileSecretConfig = await prisma.siteContent.findUnique({ where: { slug: 'turnstile_secret_key' } });

    return NextResponse.json({
        geminiApiKey: geminiConfig?.content || '',
        openRouterApiKey: openRouterConfig?.content || '',
        openRouterModel: openRouterModelConfig?.content || '',
        turnstileSiteKey: turnstileSiteConfig?.content || '',
        turnstileSecretKey: turnstileSecretConfig?.content || '',
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { geminiApiKey, openRouterApiKey, openRouterModel, turnstileSiteKey, turnstileSecretKey } = await req.json();

        if (geminiApiKey !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'gemini_api_key' },
                update: { content: geminiApiKey },
                create: { slug: 'gemini_api_key', title: 'Gemini API Key', content: geminiApiKey }
            });
        }

        if (openRouterApiKey !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'openrouter_api_key' },
                update: { content: openRouterApiKey },
                create: { slug: 'openrouter_api_key', title: 'OpenRouter API Key', content: openRouterApiKey }
            });
        }

        if (openRouterModel !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'openrouter_model' },
                update: { content: openRouterModel },
                create: { slug: 'openrouter_model', title: 'OpenRouter Model', content: openRouterModel }
            });
        }

        if (turnstileSiteKey !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'turnstile_site_key' },
                update: { content: turnstileSiteKey },
                create: { slug: 'turnstile_site_key', title: 'Turnstile Site Key', content: turnstileSiteKey }
            });
        }

        if (turnstileSecretKey !== undefined) {
            await prisma.siteContent.upsert({
                where: { slug: 'turnstile_secret_key' },
                update: { content: turnstileSecretKey },
                create: { slug: 'turnstile_secret_key', title: 'Turnstile Secret Key', content: turnstileSecretKey }
            });
        }

        await logAdminAction(session.userId, 'UPDATE_SETTINGS', 'Updated AI API Keys');

        return NextResponse.json({ message: 'Settings saved' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
