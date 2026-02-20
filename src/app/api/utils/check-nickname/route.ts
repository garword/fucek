import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { game, id, server } = body;

        if (!game || !id) {
            return NextResponse.json({ error: 'Game and ID required' }, { status: 400 });
        }

        // URL API Custom User (Andxin Store)
        // User recommends ?decode=false to handle special chars safely
        const url = `https://cekid.andxinstore.eu.org/nickname/${game}?decode=false`;

        console.log(`[Nickname API] Calling: ${url} | ID: ${id} | Server: ${server || '-'}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: id,
                server: server || ''
            })
        });

        const data = await response.json();
        console.log('[Nickname API] Response:', data);

        if (data.success) {
            let safeName = data.name;
            try {
                // Decode if encode param is effective
                safeName = decodeURIComponent(data.name);
            } catch (e) {
                console.warn('Failed to decode name:', data.name);
            }

            return NextResponse.json({
                success: true,
                game: data.game || game,
                name: safeName,
                id: data.id,
                server: data.server
            });
        } else {
            return NextResponse.json({
                success: false,
                error: data.message || 'Akun tidak ditemukan',
            }, { status: 404 });
        }

    } catch (error: any) {
        console.error('[Nickname API] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Gagal memvalidasi akun: ' + error.message,
        }, { status: 500 });
    }
}
