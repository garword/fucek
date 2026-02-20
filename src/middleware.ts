
import { NextRequest, NextResponse } from 'next/server';
import { updateSession, decryptSession } from '@/lib/session';

export async function middleware(request: NextRequest) {
    // Update session expiry
    const sessionResponse = await updateSession(request);
    const res = sessionResponse || NextResponse.next();

    // Decrypt session
    const sessionCookie = request.cookies.get('session');
    let sessionData = null;

    if (sessionCookie) {
        try {
            sessionData = await decryptSession(sessionCookie.value);
        } catch (error) {
            console.error('Error decrypting session:', error);
        }
    }

    const path = request.nextUrl.pathname;

    // 1. USER PROTECTED ROUTES
    const protectedRoutes = ['/account', '/wishlist', '/cart/checkout', '/wallet'];
    const isProtected = protectedRoutes.some(route => path.startsWith(route));

    if (isProtected) {
        if (!sessionData) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('next', path);
            return NextResponse.redirect(loginUrl);
        }
    }

    // 2. ADMIN ROUTES
    if (path.startsWith('/admin') && path !== '/admin/login') {
        if (!sessionData || sessionData.role !== 'ADMIN') {
            // If logged in but not admin, redirect to home or error?
            // If not logged in, redirect to admin login
            if (!sessionData) {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }
            return NextResponse.redirect(new URL('/', request.url)); // Unauthorized
        }
    }

    // 3. API ADMIN PROTECTION
    if (path.startsWith('/api/admin') && path !== '/api/admin/auth/login') {
        if (!sessionData || sessionData.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    return res;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
