import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendResetPasswordEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { email, turnstileToken } = await req.json();

        // 1. Validate Input
        if (!email) {
            return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
        }

        // Optional: Validate Turnstile here if needed
        // ...

        // 2. Find User
        const user = await prisma.user.findUnique({ where: { email } });

        // Security: Don't reveal if user exists or not, always return success message
        if (!user) {
            // Fake delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            return NextResponse.json({ success: true, message: 'Jika email terdaftar, link reset akan dikirim.' });
        }

        // 3. Generate Token
        // Using crypto for secure random bytes
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // 4. Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry
            } as any
        });

        // 5. Send Email
        const sent = await sendResetPasswordEmail(email, resetToken);

        if (!sent) {
            return NextResponse.json({ error: 'Gagal mengirim email. Coba lagi nanti.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Jika email terdaftar, link reset akan dikirim.' });

    } catch (error: any) {
        console.error('Forgot Password Error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan sistem saat memproses permintaan.' }, { status: 500 });
    }
}
