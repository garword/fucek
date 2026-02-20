
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';
import { login } from '@/lib/session';
import { generateOtp } from '@/lib/utils';
import { sendOtpEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }


        if (!user.passwordHash) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Set Session Cookie
        // User requested: "Login user pakai email + password."
        // Also "User harus verify OTP sebelum bisa checkout."
        // Plan: Login sets session. OTP is for verification (emailVerifiedAt).
        // If user is not verified, they can still login but can't checkout?
        // User said: "Wajib login sebelum membeli." and "User harus verify OTP sebelum bisa checkout."
        // This implies login is enough for browsing, but checkout needs verify.
        // AND "Setelah register, kirim OTP... User harus verify OTP sebelum bisa checkout."
        // Wait, typical flow is register -> verify -> login OR register -> login -> verify.
        // The prompt says: "Register/Login + verifikasi email via OTP".
        // Let's allow login. If not verified, UI shows "Please verify email".

        await login({
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: !!user.emailVerifiedAt,
        });

        // Check if verified, if not send OTP?
        // "Setelah register, kirim OTP".
        // If user logs in but not verified, maybe trigger OTP resend?
        // For now, just login.

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                emailVerifiedAt: user.emailVerifiedAt,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
