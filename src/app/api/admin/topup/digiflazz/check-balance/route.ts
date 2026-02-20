import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // 1. Get Config
        const configItems = await prisma.siteContent.findMany({
            where: { slug: { in: ['digiflazz_username', 'digiflazz_key'] } }
        });
        const getConfig = (slug: string) => configItems.find(c => c.slug === slug)?.content || '';
        const username = getConfig('digiflazz_username');
        const key = getConfig('digiflazz_key');

        if (!username || !key) return NextResponse.json({ error: 'Digiflazz config missing' }, { status: 400 });

        // 2. Fetch Balance (Cek Saldo)
        const sign = crypto.createHash('md5').update(username + key + 'depo').digest('hex');
        const response = await fetch('https://api.digiflazz.com/v1/cek-saldo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cmd: 'deposit',
                username: username,
                sign: sign
            })
        });

        const result = await response.json();

        // 3. Handle Response
        if (result.data) {
            return NextResponse.json({
                success: true,
                data: {
                    balance: result.data.deposit,
                    raw: result.data
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.message || 'Unknown error triggers',
                full_response: result
            });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
