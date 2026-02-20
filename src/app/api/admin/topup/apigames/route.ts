import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, nominal } = body; // action: 'BALANCE' | 'DEPOSIT'

    // Get Config
    const merchant = await prisma.siteContent.findUnique({ where: { slug: 'apigames_merchant_id' } });
    const secret = await prisma.siteContent.findUnique({ where: { slug: 'apigames_secret_key' } });

    if (!merchant?.content || !secret?.content) {
        return NextResponse.json({ error: 'Konfigurasi APIGames belum lengkap (Merchant ID / Secret Key).' }, { status: 400 });
    }

    const merchantId = merchant.content;
    const secretKey = secret.content;

    try {
        if (action === 'BALANCE') {
            // formula check info akun: md5(merchant_id:secret_key)  <-- Note the COLON based on user input
            const signature = crypto.createHash('md5').update(`${merchantId}:${secretKey}`).digest('hex');
            const url = `https://v1.apigames.id/merchant/${merchantId}?signature=${signature}`;

            const res = await fetch(url);
            const data = await res.json();
            return NextResponse.json(data);
        }

        if (action === 'DEPOSIT') {
            if (!nominal) return NextResponse.json({ error: 'Nominal wajib diisi' }, { status: 400 });

            // params: merchant, nominal, secret (GET)
            // https://v1.apigames.id/v2/deposit-get?merchant=...&nominal=...&secret=...
            const url = `https://v1.apigames.id/v2/deposit-get?merchant=${merchantId}&nominal=${nominal}&secret=${secretKey}`;

            const res = await fetch(url);
            const data = await res.json();
            return NextResponse.json(data);
        }

        if (action === 'CHECK_CONNECTION') {
            const { engine } = body;
            if (!engine) return NextResponse.json({ error: 'Engine parameter required' }, { status: 400 });

            // Signature: md5(merchant_id + secret_key) - NO COLON for connection check
            const signature = crypto.createHash('md5').update(merchantId + secretKey).digest('hex');
            const url = `https://v1.apigames.id/merchant/${merchantId}/cek-koneksi?engine=${engine}&signature=${signature}`;

            const res = await fetch(url);
            const data = await res.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
