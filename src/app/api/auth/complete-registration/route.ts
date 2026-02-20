import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, hashPassword } from '@/lib/auth';
import { login } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, otp, name, username, password } = body;

        // 1. Basic Validation
        if (!email || !otp || !name || !username || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // 2. Find User (Should exist from request-otp step)
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'User not found. Please request OTP first.' }, { status: 404 });
        }

        // 3. Verify OTP
        if (!user.otpHash || !user.otpExpiresAt) {
            return NextResponse.json({ error: 'OTP request invalid or expired.' }, { status: 400 });
        }

        if (new Date() > user.otpExpiresAt) {
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        const isValidOtp = await comparePassword(otp, user.otpHash);
        if (!isValidOtp) {
            await prisma.user.update({
                where: { id: user.id },
                data: { otpAttempts: { increment: 1 } }
            });
            return NextResponse.json({ error: 'Invalid OTP code.' }, { status: 400 });
        }

        // 4. Check Username Uniqueness (since we upserted email, another user might use this username)
        const existingUsername = await prisma.user.findUnique({
            where: { username },
            select: { id: true }
        });

        // Ensure the found username isn't THIS user (in case they are retrying with same username)
        if (existingUsername && existingUsername.id !== user.id) {
            return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
        }

        // 5. Hash Password & Finalize
        const passwordHash = await hashPassword(password);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                username,
                passwordHash,
                emailVerifiedAt: new Date(),
                otpHash: null,
                otpExpiresAt: null,
                otpAttempts: 0,
            }
        });

        // 6. Auto Login
        await login({
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role,
            isVerified: true,
            name: updatedUser.name || '',
            image: ''
        });

        return NextResponse.json({ success: true, message: 'Registration successful' });

    } catch (error) {
        console.error('Complete Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
