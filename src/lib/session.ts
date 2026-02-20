
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is mandatory in production');
}

const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'your-super-secret-nextauth-secret';
const key = new TextEncoder().encode(SECRET_KEY);

export async function encryptSession(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(key);
}

export async function decryptSession(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;
    return await decryptSession(session);
}

export async function createSession(userId: string, role: string) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encryptSession({ userId, role, expires });
    const cookieStore = await cookies();

    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires,
        sameSite: 'lax',
        path: '/',
    });
}

export async function login(userData: any) {
    return createSession(userData.id, userData.role);
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', {
        expires: new Date(0),
        path: '/',
    });
}

export async function updateSession(request: NextRequest) {
    const session = request.cookies.get('session')?.value;
    if (!session) return;

    const parsed = await decryptSession(session);
    if (!parsed) return;

    const res = NextResponse.next();
    res.cookies.set({
        name: 'session',
        value: await encryptSession(parsed),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        sameSite: 'lax',
        path: '/',
    });
    return res;
}
