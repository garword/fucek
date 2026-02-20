import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get('variantId');

    if (!variantId) return NextResponse.json([]);

    const stocks = await prisma.digitalStock.findMany({
        where: { variantId },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(stocks);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { variantId, payloads, expiryDate } = await req.json();

        if (!variantId || !payloads) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

        const lines = payloads.split('\n').filter((l: string) => l.trim().length > 0);

        const data = lines.map((line: string) => ({
            variantId,
            payloadEncrypted: line.trim(),
            status: 'AVAILABLE',
            expiryDate: expiryDate ? new Date(expiryDate) : null
        }));

        await prisma.$transaction([
            ...data.map((item: any) => prisma.digitalStock.create({ data: item })),
            prisma.productVariant.update({
                where: { id: variantId },
                data: { stock: { increment: lines.length } }
            })
        ]);

        await logAdminAction(session.userId, 'ADD_STOCKS', `Added ${lines.length} stocks to variant ID: ${variantId}`);

        revalidatePath('/', 'layout');
        revalidatePath('/admin/stocks');

        return NextResponse.json({ message: `Added ${lines.length} stocks` });
    } catch (error: any) {
        console.error('Add Stock Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to add stocks' }, { status: 500 });
    }
}

