
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { applyTierPricing } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getSession();
        const userId = session?.user?.id;

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                variants: {
                    where: { isActive: true, isDeleted: false },
                    orderBy: { price: 'asc' },
                },
            },
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Apply Tier Pricing
        const { product: productWithTier, tier } = await applyTierPricing(product, userId);

        // Format response
        const formatted = {
            ...productWithTier,
            soldCount: product.soldCount,
            tierApplied: tier // Optional: info tier for frontend
        };

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Product API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
