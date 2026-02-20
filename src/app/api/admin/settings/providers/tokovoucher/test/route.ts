import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getTokoVoucherConfig } from '@/lib/tokovoucher';

export async function POST() {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getTokoVoucherConfig();

    if (!config) {
        return NextResponse.json({ error: 'Config not found or inactive' }, { status: 400 });
    }

    // Test connection using /member endpoint to check saldo
    // Endpoint: https://api.tokovoucher.net/member (NO /v1/ in path!)
    try {
        // Remove /v1 from baseUrl for /member endpoint
        const baseUrlWithoutVersion = config.baseUrl.replace('/v1', '');
        const url = `${baseUrlWithoutVersion}/member?member_code=${config.memberCode}&signature=${config.signatureDefault}`;

        console.log('[TokoVoucher Test] URL:', url.replace(config.signatureDefault, 'SIG***'));
        console.log('[TokoVoucher Test] Config:', {
            memberCode: config.memberCode,
            baseUrl: baseUrlWithoutVersion,
            hasSignature: !!config.signatureDefault
        });

        const response = await fetch(url);
        const data = await response.json();

        console.log('[TokoVoucher Test] Response:', data);

        // Status 1 means success
        if (data.status === 1 && data.data) {
            return NextResponse.json({
                success: true,
                balance: data.data.saldo,
                memberName: data.data.nama,
                memberCode: data.data.member_code
            });
        } else {
            return NextResponse.json({
                error: data.error_msg || 'Connection failed/Invalid credentials',
                debug: data
            }, { status: 400 });
        }
    } catch (error) {
        console.error('[TokoVoucher Test Connection] Error:', error);
        return NextResponse.json({
            error: 'Network error: ' + (error as Error).message
        }, { status: 500 });
    }
}
