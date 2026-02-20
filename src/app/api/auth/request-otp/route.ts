import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateOtp } from '@/lib/utils';
import { sendOtpEmail } from '@/lib/mailer';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { email, turnstileToken } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Verify Turnstile Token (Backend)
        // 1. Get Secret Key
        const secretKeyRecord = await prisma.siteContent.findUnique({ where: { slug: 'turnstile_secret_key' } });
        const secretKey = secretKeyRecord?.content || process.env.TURNSTILE_SECRET_KEY; // Use non-public ENV as fallback

        if (secretKey) {
            if (!turnstileToken) {
                return NextResponse.json({ error: 'Security check failed (missing token)' }, { status: 400 });
            }

            // 2. Verify with Cloudflare
            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: secretKey,
                    response: turnstileToken,
                }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                return NextResponse.json({ error: 'Security check failed (invalid token)' }, { status: 400 });
            }
        }


        // Check if user exists and is already verified
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.emailVerifiedAt) {
            return NextResponse.json({ error: 'Email is already registered. Please login.' }, { status: 400 });
        }

        // Generate OTP
        const otp = generateOtp();
        const otpHash = await hashPassword(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (existingUser) {
            // Update existing unverified user
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    otpHash,
                    otpExpiresAt,
                    otpAttempts: 0,
                },
            });
        } else {
            // Create temporary user record (or update if implementation allows upsert logic, but here we prefer explicit create/update)
            // Ideally for a "clean" flow we might want a separate OTP table, but reusing User table with null fields is fine for this scale
            // However, to avoid "partial" users cluttering check logic, we can just upsert
            await prisma.user.upsert({
                where: { email },
                update: {
                    otpHash,
                    otpExpiresAt,
                    otpAttempts: 0,
                },
                create: {
                    email,
                    role: 'USER',
                    otpHash,
                    otpExpiresAt,
                    otpAttempts: 0,
                },
            });
        }

        // Send Email
        const sent = await sendOtpEmail(email, otp);
        if (!sent) {
            return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
        console.error('Request OTP Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
