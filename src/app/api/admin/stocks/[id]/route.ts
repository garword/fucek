
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const stock = await prisma.digitalStock.delete({
            where: { id }
        });

        await logAdminAction(session.userId, 'DELETE_STOCK', `Deleted stock ID: ${id}`);

        return NextResponse.json({ message: 'Stock deleted successfully' });
    } catch (error: any) {
        console.error('Delete Stock Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete stock' }, { status: 500 });
    }
}
