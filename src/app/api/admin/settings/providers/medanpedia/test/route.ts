
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { checkBalance } from '@/lib/medanpedia';

export async function POST(req: NextRequest) {
    // const session = await getSession();
    // if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // For test route, params typically passed in body to allow testing without saving
    const body = await req.json();
    const { apiId, apiKey } = body;

    if (!apiId || !apiKey) {
        return NextResponse.json({ success: false, error: 'Kredensial tidak valid' });
    }

    try {
        // Manually check via API but use provided creds overrides
        // However, checkBalance imports getMedanPediaConfig inside which uses DB.
        // So we need to hack verify or update lib to accept overrides.
        // Update: I will just use fetch manually here or update checkBalance to accept config optional. 
        // Let's rely on standard fetch here to avoid modifying lib excessively.

        const formData = new FormData();
        formData.append('api_id', apiId);
        formData.append('api_key', apiKey);

        const res = await fetch('https://api.medanpedia.co.id/profile', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.status) {
            return NextResponse.json({
                success: true,
                balance: Number(data.data.balance),
                memberName: data.data.full_name // Assuming it returns name like docs say
            });
        } else {
            return NextResponse.json({ success: false, error: data.msg || 'Gagal koneksi' });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
