
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { setSystemConfig } from '@/lib/config';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await prisma.systemConfig.findMany({
        orderBy: { key: 'asc' }
    });

    return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { key, value, isSecret, description } = body;

        if (!key || value === undefined) {
            return NextResponse.json({ error: 'Key and Value are required' }, { status: 400 });
        }

        const config = await setSystemConfig(key, value, isSecret, description);

        return NextResponse.json(config);
    } catch (error) {
        console.error('Failed to update config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
