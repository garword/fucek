
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';
import { login } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerifiedAt) {
            return NextResponse.json({ message: 'Email already verified' });
        }

        if (!user.otpHash || !user.otpExpiresAt) {
            return NextResponse.json({ error: 'No OTP request found' }, { status: 400 });
        }

        if (new Date() > user.otpExpiresAt) {
            return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
        }

        if (user.otpAttempts >= 5) {
            return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
        }

        const isValid = await comparePassword(otp, user.otpHash);
        if (!isValid) {
            await prisma.user.update({
                where: { id: user.id },
                data: { otpAttempts: { increment: 1 } },
            });
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // Success
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                otpHash: null,
                otpExpiresAt: null,
                otpAttempts: 0,
            },
        });

        // Refresh session to update isVerified status
        await login({
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: true
        });

        return NextResponse.json({ message: 'Email verified successfully' });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
