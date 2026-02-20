
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const email = 'test@example.com';
        const password = 'password123';
        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                role: 'USER',
                emailVerifiedAt: new Date(),
            },
            create: {
                email,
                name: 'Test User',
                username: 'testuser',
                passwordHash: hashedPassword,
                role: 'USER',
                emailVerifiedAt: new Date(),
            }
        });

        return NextResponse.json({
            message: 'User created/updated',
            email,
            password,
            loginUrl: 'http://localhost:3000/login'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
