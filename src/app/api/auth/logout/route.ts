
import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/session';

export async function POST(req: NextRequest) {
    await logout();
    return NextResponse.json({ message: 'Logged out successfully' });
}
