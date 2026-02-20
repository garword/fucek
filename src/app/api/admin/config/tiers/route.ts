
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tiers = await prisma.tierConfig.findMany({
            orderBy: { minTrx: 'asc' }
        });
        return NextResponse.json(tiers);
    } catch (error) {
        console.error('Error fetching tiers:', error);
        return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { tiers } = body;

        if (!Array.isArray(tiers)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Update each tier
        const updates = tiers.map((tier: any) =>
            prisma.tierConfig.update({
                where: { id: tier.id },
                data: {
                    minTrx: Number(tier.minTrx),
                    marginPercent: Number(tier.marginPercent),
                    isActive: tier.isActive
                }
            })
        );

        await prisma.$transaction(updates);

        return NextResponse.json({ message: 'Tiers updated successfully' });
    } catch (error) {
        console.error('Error updating tiers:', error);
        return NextResponse.json({ error: 'Failed to update tiers' }, { status: 500 });
    }
}
