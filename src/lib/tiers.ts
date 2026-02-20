
import prisma from '@/lib/prisma';
import { ProductVariant, User } from '@prisma/client';

export type TierLevel = {
    name: string;
    minTrx: number;
    marginPercent: number;
};

// Default fallback tiers if DB is empty
// Default fallback tiers (User Request: Start with Bronze pricing as normal)
export const DEFAULT_TIERS: TierLevel[] = [
    { name: 'Bronze', minTrx: 0, marginPercent: 10 },  // Base Price
    { name: 'Silver', minTrx: 2, marginPercent: 8 },
    { name: 'Gold', minTrx: 10, marginPercent: 6 },
    { name: 'Platinum', minTrx: 50, marginPercent: 4 },
    { name: 'Diamond', minTrx: 100, marginPercent: 2 },
];

/**
 * Get all active tier configurations
 */
export async function getTierConfig() {
    // @ts-ignore
    const tiers = await prisma.tierConfig.findMany({
        where: { isActive: true },
        orderBy: { minTrx: 'asc' }
    });

    return tiers.length > 0 ? tiers : DEFAULT_TIERS;
}

/**
 * Get user's current tier based on successful order count
 */
export async function getUserTier(userId?: string) {
    // 1. Fetch active tiers from DB
    const activeTiers = await getTierConfig();

    // 2. If no User ID (Guest), return Bronze equivalent from DB or Default
    if (!userId) {
        const bronzeTier = activeTiers.find((t: any) => t.name === 'Bronze') || activeTiers[0];
        return {
            name: bronzeTier.name,
            minTrx: bronzeTier.minTrx,
            marginPercent: Number(bronzeTier.marginPercent),
            trxCount: 0
        };
    }

    // 3. User Logic: Get success transaction count
    const trxCount = await prisma.order.count({
        where: {
            userId: userId,
            status: { in: ['DELIVERED', 'SUCCESS', 'PAID'] }
        }
    });

    // 4. Find highest tier where minTrx <= trxCount
    let currentTier = activeTiers[0];

    for (const tier of activeTiers) {
        if (trxCount >= tier.minTrx) {
            currentTier = tier;
        } else {
            break;
        }
    }

    // Return plain object with marginPercent as number
    return {
        name: currentTier.name,
        minTrx: currentTier.minTrx,
        marginPercent: Number(currentTier.marginPercent),
        trxCount
    };
}

/**
 * Calculate price based on provider price and margin
 */
export function calculateTierPrice(providerPrice: number, marginPercent: number, roundToHundreds: boolean = true): number {
    const margin = providerPrice * (marginPercent / 100);
    const totalPrice = providerPrice + margin;

    if (roundToHundreds) {
        // Round up to nearest 100 rupiah for cleaner pricing
        return Math.ceil(totalPrice / 100) * 100;
    } else {
        // For SMM/Precise: return exact decimals (e.g. 943.8)
        return Number(totalPrice.toFixed(2));
    }
}

/**
 * Adjust product variants with tier pricing
 * This function should be called in Server Components or API Routes
 */
export async function applyTierPricing(product: any, userId?: string) {
    // 0. CHECK CATEGORY TYPE: Only apply Tier Pricing to specific product types
    // Expanded list to cover more digital types
    const eligibleTypes = ['GAME', 'DIGITAL', 'SOSMED', 'PULSA', 'VOUCHER', 'TOKEN', 'EMONEY', 'PLN'];
    const type = product?.category?.type;

    if (!eligibleTypes.includes(type)) {
        return {
            product,
            tier: null // No tier info meant for UI to hide tier badge
        };
    }

    // 0.5 CHECK SYSTEM CONFIG TOGGLE
    // Fetch system config to see if tier system is enabled for this type
    let isTierEnabled = true;
    let categoryMarginPercent = 0;

    try {
        const configKeyEnable = `tier_enable_${type}`;
        const configKeyMargin = `margin_percent_${type}`;

        // @ts-ignore
        const configs = await prisma.systemConfig.findMany({
            where: {
                key: { in: [configKeyEnable, configKeyMargin] }
            }
        });

        const enableConfig = configs.find((c: any) => c.key === configKeyEnable);
        const marginConfig = configs.find((c: any) => c.key === configKeyMargin);

        if (enableConfig?.value === 'false') {
            isTierEnabled = false;
        }

        if (marginConfig?.value) {
            categoryMarginPercent = Number(marginConfig.value);
            // Safety check for NaN
            if (isNaN(categoryMarginPercent)) categoryMarginPercent = 0;
        }

    } catch (error) {
        console.warn('Failed to fetch tier config', error);
    }

    // CHECK: Even if Tier is disabled AND Category Margin is 0, we MUST NOT SKIP.
    // Why? Because if the product has a previously set price in the DB, we need to overwrite it 
    // with the raw Provider Price (Provider + 0%).
    // If we skip here, the UI will show the old (potentially marked up) price from the DB.

    // Removed optimization: if (!isTierEnabled && categoryMarginPercent === 0) return ...

    // 1. Get User Tier (or default to Bronze for Guest)
    const tier = await getUserTier(userId);
    const baseTier = await getUserTier(); // For original price calculation

    // ADDITIVE LOGIC: Total Margin = Category Base Margin + Tier Margin
    // If Tier System is DISABLED, we treat Tier Margin as 0 (Flat Category Margin only).
    const appliedTierMargin = isTierEnabled ? Number(tier.marginPercent) : 0;
    const appliedBaseTierMargin = isTierEnabled ? Number(baseTier.marginPercent) : 0;

    const marginPercent = categoryMarginPercent + appliedTierMargin;
    const baseMargin = categoryMarginPercent + appliedBaseTierMargin;

    // 2. Get all IDs of variants to fetch providers efficiently
    const variantIds = product.variants.map((v: any) => v.id);

    // 3. Fetch active providers for these variants
    const providers = await prisma.variantProvider.findMany({
        where: {
            variantId: { in: variantIds },
            providerStatus: true
        }
    });

    // Map variantId to providerPrice
    const providerMap = new Map();
    providers.forEach(p => {
        // Use the first active provider found (or best provider logic if implemented later)
        if (!providerMap.has(p.variantId)) {
            providerMap.set(p.variantId, Number(p.providerPrice));
        }
    });

    // 4. Process variants
    const updatedVariants = product.variants.map((variant: any) => {
        const providerPrice = providerMap.get(variant.id);
        const categoryType = product.category.type;

        // Case A: Has active provider (GAME, PULSA or DIGITAL with provider)
        if (providerPrice !== undefined) {

            const isSmm = categoryType === 'SOSMED';
            // Disable 100-rounding for SMM
            const roundToHundreds = !isSmm;

            // For connected products, calculate dynamic price
            let newPrice = calculateTierPrice(providerPrice, marginPercent, roundToHundreds);

            // Calculate "Original Price"
            let basePriceCalc = calculateTierPrice(providerPrice, baseMargin, roundToHundreds);

            // SOSMED Scaling: Convert "Per 1000" Price back to "Per Item" scale
            // Example: 943.8 (Per 1000) -> 0.9438 (Per Item)
            if (isSmm) {
                newPrice = newPrice / 1000;
                basePriceCalc = basePriceCalc / 1000;
            }

            let originalPrice = null;
            if (newPrice < basePriceCalc) {
                originalPrice = basePriceCalc;
            }

            return {
                ...variant,
                price: newPrice, // User Price
                originalPrice: originalPrice, // Strike-through price (Base)
                tierApplied: isTierEnabled ? tier.name : 'Standard'
            };
        }

        // Case B: Manual DIGITAL or Sosmed product (no provider) -> Apply Tier Discount
        // Logic: Price = DBPrice * (1 + (CategoryMargin + TierMargin - BaseTierMargin)/100)
        const isManualCategory = ['DIGITAL', 'SOSMED', 'VOUCHER', 'TOKEN'].includes(categoryType); // expanded types check

        if (isManualCategory) {
            const basePrice = Number(variant.price); // Database price is Base/Bronze Price

            // If Tier Enabled: Allow discount. If Disabled: Diff is 0.
            const tierDiff = isTierEnabled ? (Number(tier.marginPercent) - Number(baseTier.marginPercent)) : 0;
            const totalMarkupPercent = categoryMarginPercent + tierDiff;

            // Calculate user price
            const userPrice = Math.round(basePrice * (1 + totalMarkupPercent / 100));

            // Calculate Original Price (Bronze Price with Category Margin) to show strikethrough if discounted
            const basePriceWithMargin = Math.round(basePrice * (1 + categoryMarginPercent / 100));

            return {
                ...variant,
                price: userPrice,
                originalPrice: totalMarkupPercent < categoryMarginPercent ? basePriceWithMargin : null,
                tierApplied: isTierEnabled ? tier.name : 'Standard'
            };
        }

        // Case C: Manual product other than DIGITAL (no tier pricing)
        return {
            ...variant,
            price: Number(variant.price),
            originalPrice: variant.originalPrice ? Number(variant.originalPrice) : null
        };
    });

    return {
        product: {
            ...product,
            variants: updatedVariants
        },
        tier: isTierEnabled ? tier : null // Only return Tier Info if system is enabled
    };
}

/**
 * Get a map of variantId -> processed price for a list of variants
 * Useful for Cart/Checkout calculations
 */
export async function getTierPriceMap(variantIds: string[], userId?: string): Promise<Map<string, number>> {
    const tier = await getUserTier(userId);
    const baseTier = await getUserTier();

    // Fetch variants with category info to determine type
    const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
            product: {
                include: { category: true }
            }
        }
    });

    // 1. Fetch System Configs for relevant Types
    const categoryTypes = Array.from(new Set(variants.map(v => v.product?.category?.type).filter(Boolean)));
    const configKeys = categoryTypes.flatMap(type => [`margin_percent_${type}`, `tier_enable_${type}`]);

    // @ts-ignore
    const sysConfigs = await prisma.systemConfig.findMany({
        where: { key: { in: configKeys } }
    });

    const configMap = new Map<string, { enabled: boolean, margin: number }>();
    categoryTypes.forEach(type => {
        const enableKey = `tier_enable_${type}`;
        const marginKey = `margin_percent_${type}`;

        const isEnabled = sysConfigs.find((c: any) => c.key === enableKey)?.value !== 'false';
        const margin = Number(sysConfigs.find((c: any) => c.key === marginKey)?.value || 0);

        configMap.set(type as string, {
            enabled: isEnabled,
            margin: isNaN(margin) ? 0 : margin
        });
    });

    // Fetch active providers
    const providers = await prisma.variantProvider.findMany({
        where: {
            variantId: { in: variantIds },
            providerStatus: true
        }
    });

    const providerPriceMap = new Map<string, number>();
    providers.forEach(p => {
        if (!providerPriceMap.has(p.variantId)) {
            providerPriceMap.set(p.variantId, Number(p.providerPrice));
        }
    });

    const priceMap = new Map<string, number>();

    const GLOBAL_ELIGIBLE_TYPES = ['GAME', 'DIGITAL', 'SOSMED', 'PULSA', 'VOUCHER', 'TOKEN', 'EMONEY', 'PLN'];

    variants.forEach(variant => {
        const categoryType = variant.product?.category?.type;
        const config = configMap.get(categoryType) || { enabled: true, margin: 0 };

        // Logic decoupling: Use Category Margin even if Tier Disabled
        // If BOTH disabled AND margin 0, we still proceed to apply "0% margin" to provider price 
        // ensuring we get the raw provider price instead of the potentially stale DB price.

        // Removed early return optimization.

        const categoryMargin = config.margin;
        const tierMargin = config.enabled ? Number(tier.marginPercent) : 0;
        const baseTierMargin = config.enabled ? Number(baseTier.marginPercent) : 0;

        // Additive Logic
        const totalMarginPercent = categoryMargin + tierMargin;

        const providerPrice = providerPriceMap.get(variant.id);

        // Case A: Has Provider
        if (providerPrice && GLOBAL_ELIGIBLE_TYPES.includes(categoryType)) {
            const isSmm = categoryType === 'SOSMED';
            const roundToHundreds = !isSmm;

            let finalPrice = calculateTierPrice(providerPrice, totalMarginPercent, roundToHundreds);

            // SOSMED Fix: Convert Per-1000 Price back to Per-Item scale
            if (isSmm) {
                finalPrice = finalPrice / 1000;
            }
            priceMap.set(variant.id, finalPrice);
        }
        // Case B: Manual DIGITAL or SOSMED Product -> Discount Logic
        // Manual types usually fall into these buckets
        else if (GLOBAL_ELIGIBLE_TYPES.includes(categoryType)) {
            const basePrice = Number(variant.price);
            const tierDiff = tierMargin - baseTierMargin; // Discount relative to base
            const totalMarkupPercent = categoryMargin + tierDiff;

            let userPrice = basePrice * (1 + totalMarkupPercent / 100);

            if (categoryType !== 'SOSMED') {
                userPrice = Math.round(userPrice);
            } else {
                userPrice = Number(userPrice.toFixed(5));
            }

            priceMap.set(variant.id, userPrice);
        }
        // Case C: Manual Other (keep original)
        else {
            priceMap.set(variant.id, Number(variant.price));
        }
    });

    return priceMap;
}
