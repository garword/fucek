
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserTier } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const categorySlug = searchParams.get('category');
        const query = searchParams.get('q');

        const where: any = {
            isActive: true,
            isDeleted: false,
        };

        if (categorySlug) {
            where.category = {
                slug: categorySlug,
            };
        }

        if (query) {
            where.OR = [
                { name: { contains: query } }, // sqlite is case-insensitive by default roughly, usually need mode: insensitive for postgres
                { description: { contains: query } },
            ];
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                category: { select: { name: true, slug: true, type: true } }, // Include type for tier logic
                variants: {
                    where: { isActive: true, isDeleted: false },
                    orderBy: { price: 'asc' },
                    take: 1, // Only need the cheapest variant for "Start from"
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get User Tier for "Start From" price calculation
        const session = await getSession();
        const userTier = await getUserTier(session?.user?.id);

        // Format response
        const formatted = products.map((p) => {
            // Calculate Min Price based on Tier
            let minPrice = 0;
            const firstVariant = p.variants[0];

            if (firstVariant) {
                // Manual Tier Calculation for List View (Optimization to avoid full applyTierPricing loop)
                // Logic mirrors applyTierPricing but simplified for "Start From"
                const originalPrice = Number(firstVariant.price);
                const isEligible = ['GAME', 'DIGITAL'].includes(p.category.type);

                if (isEligible) {
                    // For List View, we assumes the 'price' in DB is the Base Price (Bronze)
                    // So we apply the tier discount relative to Base Margin
                    // Formula: BasePrice * (1 - (BaseMargin - UserMargin)/100)
                    // Wait, this is only for 'DIGITAL' manual. 
                    // For 'GAME' connected, price is dynamic. 
                    // To be safe and accurate without fetching providers, we can just show the Base Price 
                    // OR if we want to be fancy, we try to estimate. 
                    // BUT, for simplicity and performance in list view, let's just apply 
                    // a generic discount estimate if it's a manual digital item, 
                    // or just return the base price for connected items (since we don't have provider price here easily).

                    // ACTUALLY, simpler approach: Just show the price as is (Base/Bronze) for list 
                    // OR apply the simple discount logic for Digital.

                    // Let's refine:
                    // 1. Digital Manual: Apply discount formula.
                    // 2. Game/Connected: Price is unknown/dynamic anyway usually, but we have a stored 'price' in variant?
                    // In seed, variants have price.

                    const baseMargin = 10; // Default Bronze
                    const userMargin = userTier.marginPercent;

                    if (p.category.type === 'DIGITAL') {
                        const discountPercent = baseMargin - userMargin;
                        minPrice = Math.round(originalPrice * (1 - discountPercent / 100));
                    } else {
                        // Game/Other: use stored price (which usually is a base estimation or placeholder)
                        // If we really want accurate "Start From" for Games, we'd need provider checks, too slow for List.
                        // So just use stored price.
                        minPrice = originalPrice;
                    }
                } else {
                    minPrice = originalPrice;
                }
            }

            return {
                id: p.id,
                name: p.name,
                description: p.description,
                imageUrl: p.imageUrl,
                category: p.category,
                minPrice,
                originalPrice: (p.variants[0] as any)?.originalPrice || null,
                socialProofMode: p.socialProofMode,
                soldCount: p.soldCount,
            };
        });

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Products API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
