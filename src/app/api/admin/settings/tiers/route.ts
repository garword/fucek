
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_TIERS } from '@/lib/tiers';

export async function GET() {
    try {
        const tiers = await prisma.tierConfig.findMany({
            orderBy: { minTrx: 'asc' }
        });

        // If no tiers in DB, return default tiers
        if (tiers.length === 0) {
            return NextResponse.json(DEFAULT_TIERS);
        }

        return NextResponse.json(tiers);
    } catch (error) {
        console.error('[TIER_GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tiers } = body;

        if (!Array.isArray(tiers)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Apply updates
        await prisma.$transaction(
            tiers.map((tier: any) =>
                prisma.tierConfig.upsert({
                    where: { name: tier.name },
                    update: {
                        minTrx: Number(tier.minTrx),
                        marginPercent: Number(tier.marginPercent),
                        isActive: tier.isActive ?? true
                    },
                    create: {
                        name: tier.name,
                        minTrx: Number(tier.minTrx),
                        marginPercent: Number(tier.marginPercent),
                        isActive: true
                    }
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[TIER_POST]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
