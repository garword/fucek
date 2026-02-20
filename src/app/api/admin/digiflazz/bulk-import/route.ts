import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getCachedData } from '@/lib/cache';

interface BulkImportRequest {
    selectedBrands: string[]; // Array of "brand_category_type" keys
    categoryId: string;
    cmd?: 'prepaid' | 'pasca';
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body: BulkImportRequest = await req.json();
        const { selectedBrands, categoryId, cmd = 'prepaid' } = body;

        if (!selectedBrands || selectedBrands.length === 0) {
            return NextResponse.json({ error: 'No brands selected' }, { status: 400 });
        }

        if (!categoryId) {
            return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
        }

        // Verify category exists
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // Get price list from cache
        const cacheKey = `digiflazz_pricelist_${cmd}`;
        const cachedData = getCachedData<{ brands: any[] }>(cacheKey, 10);

        if (!cachedData) {
            return NextResponse.json({
                error: 'Price list not cached. Please load price list first.'
            }, { status: 400 });
        }

        // Filter selected brands
        const brandsToImport = cachedData.brands.filter(brand => {
            const key = `${brand.name}_${brand.category}_${brand.type}`;
            return selectedBrands.includes(key);
        });

        console.log(`[Digiflazz Bulk Import] Importing ${brandsToImport.length} brand groups...`);

        let created = 0;
        let updated = 0;
        let failed = 0;
        const errors: Array<{ product: string, error: string }> = [];

        // Get tier config for Bronze (base price)
        const tierConfig = await prisma.tierConfig.findFirst();
        const bronzeMargin = tierConfig?.marginPercent || 10;

        // Pre-fetch all products in this category for fuzzy matching
        const existingProducts = await prisma.product.findMany({
            where: { categoryId: categoryId },
            select: { id: true, name: true, slug: true }
        });

        for (const brandGroup of brandsToImport) {
            // Fuzzy Match Logic
            // Check if existing product name matches brand name (ignoring case, spaces, special chars)
            // Bidirectional check: pName in bName OR bName in pName
            const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const bNameNorm = normalize(brandGroup.name);

            let product = existingProducts.find(p => {
                const pNameNorm = normalize(p.name);
                return pNameNorm.includes(bNameNorm) || bNameNorm.includes(pNameNorm);
            });

            if (!product) {
                // Create new product
                // Generate slug from brand name
                const slug = brandGroup.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

                const newProduct = await prisma.product.create({
                    data: {
                        name: brandGroup.name,
                        slug: slug,
                        description: `${brandGroup.category} - ${brandGroup.type}`,
                        categoryId: categoryId
                    }
                });
                product = newProduct;
                console.log(`[Bulk Import] Created product: ${product.name}`);

                // Add to existingProducts list to prevent duplicate creation in this loop if brandGroup repeats?
                // (brandGroup should be unique by name in this loop per brand name)
                existingProducts.push(product);
            } else {
                console.log(`[Bulk Import] Found existing product: ${product.name} (Matched: ${brandGroup.name})`);
            }

            // Import each SKU as variant
            for (const sku of brandGroup.products) {
                try {
                    // Check if variant already exists
                    // Check if variant already exists (by Name OR SKU)
                    const existingVariant = await prisma.productVariant.findFirst({
                        where: {
                            productId: product.id,
                            OR: [
                                { name: sku.product_name },
                                { sku: sku.buyer_sku_code }
                            ]
                        },
                        include: {
                            providers: {
                                where: { providerCode: 'DIGIFLAZZ' }
                            }
                        }
                    });

                    if (existingVariant) {
                        // Update existing variant
                        await prisma.productVariant.update({
                            where: { id: existingVariant.id },
                            data: {
                                price: Math.ceil(sku.price * (1 + bronzeMargin / 100)),
                                isDeleted: false, // RESTORE if soft deleted
                                isActive: sku.buyer_product_status && sku.seller_product_status // Sync status
                            }
                        });

                        // Update provider entry
                        await prisma.variantProvider.updateMany({
                            where: {
                                variantId: existingVariant.id,
                                providerCode: 'DIGIFLAZZ'
                            },
                            data: {
                                providerSku: sku.buyer_sku_code,
                                providerPrice: sku.price,
                                providerStatus: sku.buyer_product_status && sku.seller_product_status
                            }
                        });

                        updated++;
                        console.log(`[Bulk Import] Updated: ${sku.product_name}`);
                    } else {
                        // Create new variant
                        const variant = await prisma.productVariant.create({
                            data: {
                                productId: product.id,
                                name: sku.product_name,
                                price: Math.ceil(sku.price * (1 + bronzeMargin / 100)),
                                stock: sku.unlimited_stock ? 999999 : sku.stock,
                                durationDays: 0,
                                warrantyDays: 0,
                                isActive: sku.buyer_product_status && sku.seller_product_status
                            }
                        });

                        // Create provider entry
                        await prisma.variantProvider.create({
                            data: {
                                variantId: variant.id,
                                providerCode: 'DIGIFLAZZ',
                                providerSku: sku.buyer_sku_code,
                                providerPrice: sku.price,
                                providerStatus: sku.buyer_product_status && sku.seller_product_status
                            }
                        });

                        created++;
                        console.log(`[Bulk Import] Created: ${sku.product_name}`);
                    }

                } catch (error) {
                    failed++;
                    errors.push({
                        product: sku.product_name,
                        error: (error as Error).message
                    });
                    console.error(`[Bulk Import] Failed to import ${sku.product_name}:`, error);
                }
            }
        }

        console.log(`[Digiflazz Bulk Import] Complete: ${created} created, ${updated} updated, ${failed} failed`);

        return NextResponse.json({
            success: true,
            summary: {
                created,
                updated,
                failed,
                total: created + updated + failed
            },
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('[Digiflazz Bulk Import] Error:', error);
        return NextResponse.json({
            error: 'Bulk import failed',
            message: (error as Error).message
        }, { status: 500 });
    }
}
