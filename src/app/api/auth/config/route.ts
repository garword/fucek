
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const siteKeyRecord = await prisma.siteContent.findUnique({ where: { slug: 'turnstile_site_key' } });
        // Fallback to Env if not in DB
        const turnstileSiteKey = siteKeyRecord?.content || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

        return NextResponse.json({ turnstileSiteKey });
    } catch (error) {
        return NextResponse.json({ turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '' });
    }
}
