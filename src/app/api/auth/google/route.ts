import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfig } from '@/lib/config';

export async function GET(req: NextRequest) {
    const clientId = await getSystemConfig('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_ID');

    // Support dynamic APP_URL for Cloudflare Tunnels etc.
    const appUrl = await getSystemConfig('APP_URL') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
        return NextResponse.json({ error: 'Google Client ID not configured properly (Default value detected)' }, { status: 500 });
    }

    const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(authUrl);
}
