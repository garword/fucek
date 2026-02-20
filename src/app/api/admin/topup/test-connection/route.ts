
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import crypto from 'crypto';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const usernameConfig = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
    const keyConfig = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });

    const username = usernameConfig?.content;
    const key = keyConfig?.content;

    if (!username || !key) {
        return NextResponse.json({ error: 'Konfigurasi Username & API Key belum diisi.' }, { status: 400 });
    }

    try {
        // Generate Sign: md5(username + apiKey + "depo")
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

        const data = await response.json();

        // Check if data.data exists (Digiflazz success format)
        if (data && data.data) {
            // Balance usually in data.data.deposit
            const balance = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.data.deposit);
            return NextResponse.json({ success: true, balance: balance, raw: data });
        } else {
            // Error from Digiflazz
            return NextResponse.json({ success: false, error: data.message || 'Respon tidak valid dari Digiflazz', raw: data });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
