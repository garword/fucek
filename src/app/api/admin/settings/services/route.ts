import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

const CONFIG_KEY = 'MAIN_CATEGORY_STATUS';

const DEFAULT_CONFIG = {
    GAME: true,
    DIGITAL: true,
    PULSA: true,
    SOSMED: true
};

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // @ts-ignore
        const config = await prisma.systemConfig.findUnique({
            where: { key: CONFIG_KEY }
        });

        const status = config ? JSON.parse(config.value) : DEFAULT_CONFIG;
        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        // @ts-ignore
        const config = await prisma.systemConfig.upsert({
            where: { key: CONFIG_KEY },
            update: { value: JSON.stringify(body) },
            create: {
                key: CONFIG_KEY,
                value: JSON.stringify(body),
                description: 'Status of Main Category Types (Game, Digital, Pulsa, Sosmed)'
            }
        });

        await logAdminAction(session.userId, 'UPDATE_SERVICES', `Updated Main Category Status: ${JSON.stringify(body)}`);

        return NextResponse.json(JSON.parse(config.value));
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
