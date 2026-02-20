
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit
        include: { user: { select: { email: true, username: true } } }
    });

    return NextResponse.json(logs);
}

export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { id, clearAll } = body;

        if (clearAll) {
            await prisma.auditLog.deleteMany({});
            return NextResponse.json({ success: true, message: 'All logs cleared' });
        }

        if (id) {
            await prisma.auditLog.delete({
                where: { id }
            });
            return NextResponse.json({ success: true, message: 'Log deleted' });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete logs' }, { status: 500 });
    }
}
