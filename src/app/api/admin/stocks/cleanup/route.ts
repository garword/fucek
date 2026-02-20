
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force TS Re-evaluation
    try {
        // Delete stocks where status is AVAILABLE AND expiryDate < now
        const result = await prisma.digitalStock.deleteMany({
            where: {
                status: 'AVAILABLE',
                // @ts-ignore
                expiryDate: {
                    lt: new Date()
                }
            }
        });

        if (result.count > 0) {
            await logAdminAction(session.userId, 'CLEANUP_STOCKS', `Deleted ${result.count} expired stock items.`);
        }

        return NextResponse.json({
            message: `Cleanup successful. Deleted ${result.count} expired items.`,
            count: result.count
        });

    } catch (error: any) {
        console.error('Cleanup Error:', error);
        return NextResponse.json({ error: 'Failed to cleanup stocks' }, { status: 500 });
    }
}
