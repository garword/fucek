import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import crypto from 'crypto';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { username, apiKey } = await req.json();

        if (!username || !apiKey) {
            return NextResponse.json({ error: 'Username and API Key required' }, { status: 400 });
        }

        // Test connection using /v1/cek-saldo endpoint
        // Signature formula: md5(username + apiKey + "depo")
        const signature = crypto
            .createHash('md5')
            .update(username + apiKey + 'depo')
            .digest('hex');

        const payload = {
            cmd: 'deposit',
            username: username,
            sign: signature
        };

        console.log('[Digiflazz Test] Request:', { cmd: payload.cmd, username, sign: signature.substring(0, 10) + '...' });

        const response = await fetch('https://api.digiflazz.com/v1/cek-saldo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log('[Digiflazz Test] Response:', data);

        // Check if request successful
        if (data.data && data.data.deposit !== undefined) {
            return NextResponse.json({
                success: true,
                balance: data.data.deposit,
                message: 'Connection successful'
            });
        } else {
            return NextResponse.json({
                error: 'Invalid credentials or API error',
                debug: data
            }, { status: 400 });
        }

    } catch (error) {
        console.error('[Digiflazz Test Connection] Error:', error);
        return NextResponse.json({
            error: 'Network error: ' + (error as Error).message
        }, { status: 500 });
    }
}
