import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getTierConfig } from '@/lib/tiers';

export async function POST(req: Request) {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { mode, tokovoucherData, targetProductId, productName, categoryId } = await req.json();

        // Get Bronze tier margin for pricing base
        const tiers = await getTierConfig();
        const bronzeTier = tiers.find((t: any) => t.name === 'Bronze');
        const marginPercent = bronzeTier?.marginPercent || 10;

        const providerPrice = Number(tokovoucherData.price);
        // Base Price (Bronze) = Provider Price + Margin
        const sellPrice = Math.round(providerPrice * (1 + marginPercent / 100));

        if (mode === 'ADD_VARIANT') {
            // Mode 1: Add as Variant to existing product
            const product = await prisma.product.findUnique({
                where: { id: targetProductId }
            });

            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }

            // Check if SKU exists to prevent dupe
            const existingVariant = await prisma.productVariant.findFirst({
                where: { sku: `TV-${tokovoucherData.code}` }
            });

            let variant;
            if (existingVariant) {
                // Update existing variant
                variant = await prisma.productVariant.update({
                    where: { id: existingVariant.id },
                    data: {
                        name: tokovoucherData.nama_produk,
                        price: sellPrice,
                        stock: 999999,
                        deliveryType: 'instant'
                    }
                });

                // Update provider
                await prisma.variantProvider.upsert({
                    where: {
                        // Cannot upsert by non-unique, find first or create
                        // But we assume one provider per variant for now or use deleteMany
                        id: 'temp_id_placeholder' // Prisma needs unique constraint
                    },
                    update: {}, // We will handle this manually via delete-create
                    create: {
                        variantId: variant.id,
                        providerCode: 'TOKOVOUCHER',
                        providerSku: tokovoucherData.code,
                        providerPrice: providerPrice,
                        providerStatus: true
                    } // Placeholder
                }).catch(() => { }); // Ignore error, handle below

                // Cleanest way: Delete existing TV provider for this variant and re-create
                await prisma.variantProvider.deleteMany({
                    where: {
                        variantId: variant.id,
                        providerCode: 'TOKOVOUCHER'
                    }
                });

            } else {
                // Create new variant
                variant = await prisma.productVariant.create({
                    data: {
                        productId: targetProductId,
                        name: tokovoucherData.nama_produk,
                        price: sellPrice,
                        stock: 999999, // Unlimited via API
                        deliveryType: 'instant',
                        sku: `TV-${tokovoucherData.code}`,
                        sortOrder: 0,
                        durationDays: 0,
                        warrantyDays: 0
                    }
                });
            }

            // Create provider entry (Active)
            await prisma.variantProvider.create({
                data: {
                    variantId: variant.id,
                    providerCode: 'TOKOVOUCHER',
                    providerSku: tokovoucherData.code,
                    providerPrice: providerPrice,
                    providerStatus: true
                }
            });

            // Note: Tier pricing is handled dynamically by applyTierPricing()
            // which reads providerPrice and calculates prices for all tiers on-the-fly
            // The variant.price stored in DB is Bronze tier price (base margin)

            return NextResponse.json({
                success: true,
                message: 'Variant added/updated successfully',
                variant
            });

        } else if (mode === 'CREATE_PRODUCT') {
            // Mode 2: Create new product + first variant
            if (!productName || !categoryId) {
                return NextResponse.json({ error: 'Product name and category required' }, { status: 400 });
            }

            // Generate slug
            const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            // Create product
            const product = await prisma.product.create({
                data: {
                    name: productName,
                    slug: slug + '-' + Math.floor(Math.random() * 1000), // Random suffix to avoid slug collision
                    description: tokovoucherData.deskripsi || '',
                    categoryId: categoryId,
                    imageUrl: '', // Admin needs to upload image later
                    isActive: true, // Default active? Or draft?
                    isDeleted: false,
                    soldCount: 0
                }
            });

            // Create variant
            const variant = await prisma.productVariant.create({
                data: {
                    productId: product.id,
                    name: tokovoucherData.nama_produk,
                    price: sellPrice,
                    stock: 999999,
                    deliveryType: 'instant',
                    sku: `TV-${tokovoucherData.code}`,
                    sortOrder: 0,
                    durationDays: 0,
                    warrantyDays: 0
                }
            });

            // Create provider entry
            await prisma.variantProvider.create({
                data: {
                    variantId: variant.id,
                    providerCode: 'TOKOVOUCHER',
                    providerSku: tokovoucherData.code,
                    providerPrice: providerPrice,
                    providerStatus: true
                }
            });

            // Note: Tier pricing is handled dynamically by applyTierPricing()
            // The variant.price is Bronze tier price (base margin)

            return NextResponse.json({
                success: true,
                message: 'Product created successfully',
                product,
                variant
            });
        }

        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    } catch (error) {
        console.error('[TokoVoucher Import] Error:', error);
        return NextResponse.json({ error: 'Import failed: ' + (error as Error).message }, { status: 500 });
    }
}
