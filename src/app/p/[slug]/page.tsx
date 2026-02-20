
import prisma from '@/lib/prisma';
import ProductDetailClient from '@/components/features/product/ProductDetailClient';
import { getSession } from '@/lib/session';
import { notFound } from 'next/navigation';
import { applyTierPricing } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const session = await getSession();

    let user = null;
    if (session?.userId) {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                balance: true, // Crucial for PaymentModal
                emailVerifiedAt: true,
            }
        });

        if (dbUser) {
            user = {
                ...dbUser,
                balance: Number(dbUser.balance)
            };
        }
    }

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            category: true,
            variants: {
                where: { isActive: true, isDeleted: false },
                orderBy: { price: 'asc' },
                include: {
                    stocks: {
                        where: { status: 'AVAILABLE' },
                        select: { id: true },
                    },
                    providers: true, // Include providers to get SKU for Realtime Check
                },
            }
        }
    });

    if (!product || product.isDeleted) {
        notFound();
    }

    // Check Service Status
    let serviceStatus = { GAME: true, DIGITAL: true, PULSA: true, SOSMED: true };
    try {
        // @ts-ignore
        const config = await prisma.systemConfig.findUnique({ where: { key: 'MAIN_CATEGORY_STATUS' } });
        if (config) serviceStatus = JSON.parse(config.value);
    } catch (e) { }

    // @ts-ignore
    const isServiceOffline = serviceStatus[product.category.type] === false;

    // Force inactive if service offline
    if (isServiceOffline) {
        // We modify the object in-memory for the view
        product.isActive = false;
        product.category.isActive = false; // Double ensure
    }

    // Apply Dynamic Tier Pricing if user is logged in
    // This returns a plain object with serialized prices
    const { product: tieredProduct, tier } = await applyTierPricing(product, session?.userId); // Use serialized base to avoid Decimal issues if passed directly

    // Calculate minPrice from variants since it might not be in the product object directly
    const prices = tieredProduct.variants.map((v: any) => v.price); // v.price is already number from applyTierPricing
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    // Additional serialization if needed (applyTierPricing handles most)
    const serializedProduct = {
        ...tieredProduct,
        minPrice: minPrice,
        // Ensure standard fields are preserved
        variants: tieredProduct.variants.map((v: any) => ({
            ...v,
            price: Number(v.price),
            originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
            providers: v.providers?.map((p: any) => ({
                ...p,
                providerPrice: Number(p.providerPrice)
            })),
        })),
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ProductDetailClient
                product={serializedProduct}
                user={user}
                tierName={tier?.name} // Pass tier name to client if needed for UI badge
            />
        </div>
    );
}
