import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { token, password, confirmPassword } = await req.json();

        // 1. Validate Input
        if (!token || !password || !confirmPassword) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: 'Konfirmasi password tidak cocok' }, { status: 400 });
        }

        // 2. Find User by Token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date() // Must not be expired
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Link invalid atau sudah kadaluarsa.' }, { status: 400 });
        }

        // 3. Hash New Password
        const passwordHash = await bcrypt.hash(password, 10);

        // 4. Update User & Clear Token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return NextResponse.json({ success: true, message: 'Password berhasil diubah. Silakan login.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
    }
}
