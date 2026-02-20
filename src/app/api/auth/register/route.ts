
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateOtp } from '@/lib/utils';
import { sendOtpEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, username, name } = body;

        if (!email || !password || !username || !name) {
            return NextResponse.json({ error: 'All fields (Name, Username, Email, Password) are required' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // Check if username taken
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
        }

        // Hash password & OTP
        const passwordHash = await hashPassword(password);
        const otp = generateOtp();
        const otpHash = await hashPassword(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        const user = await prisma.user.create({
            data: {
                // @ts-ignore: Schema updated but types might be stale
                name,
                email,
                username,
                passwordHash,
                otpHash,
                otpExpiresAt,
                otpAttempts: 0,
            },
        });

        // Send OTP
        const emailSent = await sendOtpEmail(email, otp);

        return NextResponse.json({
            message: 'User registered. Please verify OTP.',
            userId: user.id,
            emailSent,
        });
    } catch (error) {
        console.error('Register Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
