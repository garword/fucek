
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/session';
import { comparePassword } from '@/lib/auth';

// Simple in-memory rate limiter for demo
const rateLimit = new Map<string, { count: number, resetAt: number }>();

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();
        const windowMs = 10 * 60 * 1000; // 10 minutes
        const maxAttempts = 5;

        let record = rateLimit.get(ip);
        if (!record || now > record.resetAt) {
            record = { count: 0, resetAt: now + windowMs };
        }

        if (record.count >= maxAttempts) {
            return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
        }

        record.count++;
        rateLimit.set(ip, record);

        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
        }

        const start = Date.now();
        const user = await prisma.user.findUnique({
            where: { username },
        });

        // Timing safe check? (Not strictly here, but standard practice)
        if (!user || user.role !== 'ADMIN' || !user.passwordHash) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await comparePassword(password, user.passwordHash);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Success - Create Session
        await createSession(user.id, user.role);

        // Reset rate limit on success? Not necessarily, to prevent brute force on other accounts? 
        // Usually reset on success for that IP.
        rateLimit.delete(ip);

        return NextResponse.json({ message: 'Login successful' });

    } catch (error) {
        console.error('Admin Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
