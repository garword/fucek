
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await prisma.order.findMany({
        include: {
            user: true,
            orderItems: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const csvRows = [];
    // Header
    csvRows.push(['Invoice', 'Date', 'User Email', 'Status', 'Total', 'Items'].join(','));

    // Rows
    for (const order of orders) {
        const items = order.orderItems.map(i => `${i.productName} (${i.variantName}) x${i.quantity}`).join('; ');
        const row = [
            order.invoiceCode,
            new Date(order.createdAt).toISOString(),
            order.user.email,
            order.status,
            order.totalAmount,
            `"${items.replace(/"/g, '""')}"` // Escape quotes
        ];
        csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`
        }
    });
}
