
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateOtp } from '@/lib/utils';
import { sendOtpEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerifiedAt) {
            return NextResponse.json({ message: 'Email already verified' });
        }

        // Rate Limit (Simple check)
        if (user.otpRetryAfter && new Date() < user.otpRetryAfter) {
            return NextResponse.json({ error: 'Please wait before resending OTP' }, { status: 429 });
        }

        const otp = generateOtp();
        const otpHash = await hashPassword(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        const otpRetryAfter = new Date(Date.now() + 60 * 1000); // 1 min wait between resends

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpHash,
                otpExpiresAt,
                otpRetryAfter,
                otpAttempts: 0,
            },
        });

        await sendOtpEmail(email, otp);

        return NextResponse.json({ message: 'OTP resent successfully' });

    } catch (error) {
        console.error('Resend OTP Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
