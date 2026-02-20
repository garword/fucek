import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/session';
import { getSystemConfig } from '@/lib/config';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const clientId = await getSystemConfig('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_ID');
    const clientSecret = await getSystemConfig('GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET');

    // Fetch dynamic APP_URL
    const appUrl = await getSystemConfig('APP_URL') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (!code || !clientId || !clientSecret) {
        return NextResponse.redirect(new URL('/login?error=InvalidConfig', req.url));
    }

    try {
        // Exchange code for token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Failed to get token');

        // Get User Info
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = await userRes.json();
        if (!userRes.ok) throw new Error('Failed to get user info');

        const { email, id: googleId, name, picture } = userData;

        // Find or Create User
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Create new user
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    // @ts-ignore: googleId new field
                    googleId,
                    emailVerifiedAt: new Date(),
                    passwordHash: '', // No password for Google users
                    // You might want to store picture if User model has imageUrl
                },
            });
        } else {
            // Link Google ID if not linked
            // @ts-ignore: googleId new field
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        // @ts-ignore: googleId new field
                        googleId,
                        emailVerifiedAt: user.emailVerifiedAt || new Date()
                    },
                });
            }
        }

        // Create Session
        await createSession(user.id, user.role);

        return NextResponse.redirect(new URL('/', req.url));

    } catch (error) {
        console.error('Google Auth Error:', error);
        return NextResponse.redirect(new URL('/login?error=GoogleAuthFailed', req.url));
    }
}
