
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { mapCategoryType } from '@/lib/category-filter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { brands, customMargin, provider = 'DIGIFLAZZ', brandMapping = {} } = body; // brandMapping: { "Brand Name": "target_product_id" }

    if (!brands || !Array.isArray(brands) || brands.length === 0) {
        return NextResponse.json({ error: 'No brands selected' }, { status: 400 });
    }

    // 1. Get Config & Margin
    // We reuse Digiflazz margin config as global margin for now
    const marginItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_margin' } });

    // Determine Margin: Use Custom if provided, else Fetch Bronze Tier, else 5%
    let effectiveMargin = 5;

    // Fetch Bronze Tier Config
    let bronzeTier = null;
    try {
        // @ts-ignore
        if (prisma.tierConfig) {
            // @ts-ignore
            bronzeTier = await prisma.tierConfig.findFirst({
                where: { name: 'Bronze' }
            });
        }
    } catch (e) {
        console.warn('[Import] TierConfig access failed, using fallback.');
    }

    if (customMargin !== undefined && customMargin !== '' && !isNaN(Number(customMargin))) {
        effectiveMargin = Number(customMargin);
        console.log(`[Import] Using Custom Margin: ${effectiveMargin}%`);
    } else if (bronzeTier) {
        effectiveMargin = Number(bronzeTier.marginPercent);
        console.log(`[Import] Using Bronze Tier Margin: ${effectiveMargin}%`);
    } else {
        effectiveMargin = parseFloat(marginItem?.content || '5');
        console.log(`[Import] Using Default Margin: ${effectiveMargin}%`);
    }

    let processedCount = 0;

    try {
        let pricelistData: any[] = [];

        // ============ PROVIDER SPECIFIC LOGIC ============
        if (provider === 'TOKOVOUCHER') {
            console.log('[Import] Processing TOKOVOUCHER import...');
            // For TokoVoucher, we expect products to be sent from frontend (which fetched from brands endpoint)
            if (body.products && Array.isArray(body.products) && body.products.length > 0) {
                pricelistData = body.products;
            } else {
                return NextResponse.json({ error: 'Product data missing for TokoVoucher import' }, { status: 400 });
            }
        } else {
            // DIGIFLAZZ LOGIC (Existing)
            console.log('[Import] Processing DIGIFLAZZ import...');

            // Get Digiflazz Credentials
            const usernameItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
            const keyItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });
            const username = usernameItem?.content;
            const key = keyItem?.content;

            if (!username || !key) {
                return NextResponse.json({ error: 'Digiflazz credentials missing' }, { status: 500 });
            }

            // Check if products are filtered from frontend
            if (body.products && Array.isArray(body.products) && body.products.length > 0) {
                console.log('[Digiflazz] Using product data from request body');
                pricelistData = body.products;
            } else {
                // Fallback: Check Cache or Fetch
                // ... (Existing caching logic omitted for brevity as frontend now sends products)
                // For safety vs old frontend, we keep simple fetch if no products sent
                const CACHE_KEY = 'pricelist_prepaid';
                const cache = await prisma.digiflazzCache.findUnique({ where: { cacheKey: CACHE_KEY } });

                if (cache && new Date(cache.expiresAt) > new Date()) {
                    pricelistData = JSON.parse(cache.data);
                } else {
                    // Fetch fresh if needed (simplified fallback)
                    const sign = crypto.createHash('md5').update(username + key + 'pricelist').digest('hex');
                    const res = await fetch('https://api.digiflazz.com/v1/price-list', {
                        method: 'POST',
                        body: JSON.stringify({ cmd: 'prepaid', username, sign })
                    });
                    const data = await res.json();
                    if (data.data) pricelistData = data.data;
                }
            }
        }

        if (pricelistData.length === 0) {
            return NextResponse.json({ error: 'No products found to import from provider' }, { status: 400 });
        }

        // ============ CORE IMPORT LOGIC ============

        // Helper: Get or Create Category by Name and Type
        const getOrCreateCategory = async (categoryName: string, categoryType: 'GAME' | 'PULSA') => {
            const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            let cat = await prisma.category.findFirst({ where: { slug } });
            if (!cat) {
                cat = await prisma.category.create({
                    data: { name: categoryName, slug, type: categoryType }
                });
                console.log(`[Import] Created category: ${categoryName} (${categoryType})`);
            }
            return cat;
        };

        // 3. Process Each Selected Brand
        for (const brandName of brands) {
            console.log(`[Import] Processing Brand: ${brandName}`);

            // Get first product for this brand to detect category
            const sampleProduct = pricelistData.find((item: any) =>
                (item.brand && item.brand.toLowerCase() === brandName.toLowerCase()) ||
                (item.brand_name && item.brand_name.toLowerCase() === brandName.toLowerCase())
            );

            if (!sampleProduct) {
                console.warn(`[Import] No products found for brand ${brandName}. Skipping.`);
                continue;
            }

            // Detect category type from product category
            const productCategory = sampleProduct.category || 'Games';
            const categoryType = mapCategoryType(productCategory) || 'GAME'; // Fallback to GAME
            console.log(`[Import] Brand: ${brandName}, Category: ${productCategory}, Type: ${categoryType}`);

            // Get or create category
            const category = await getOrCreateCategory(productCategory, categoryType);

            // Fetch existing products in this category for fuzzy matching
            const categoryProducts = await prisma.product.findMany({
                where: { categoryId: category.id },
                select: { id: true, name: true, slug: true }
            });

            // Check if there is a manual mapping for this brand
            const targetProductId = brandMapping[brandName];
            let product;

            if (targetProductId) {
                // Fetch EXISTING product
                product = await prisma.product.findUnique({
                    where: { id: targetProductId }
                });

                if (!product) {
                    console.warn(`[Import] Target Product ID ${targetProductId} not found for brand ${brandName}. Skipping.`);
                    continue;
                }
                console.log(`[Import] Mapped brand '${brandName}' to Existing Product: ${product.name} (${product.id})`);

                // Ensure product is active/restored
                await prisma.product.update({
                    where: { id: product.id },
                    data: { isDeleted: false, isActive: true }
                });
            } else {
                // Default: Create or Update by Name (Fuzzy Match)

                // Fuzzy Match Logic
                const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                const bNameNorm = normalize(brandName);

                // Bidirectional include check
                product = categoryProducts.find(p => {
                    const pNameNorm = normalize(p.name);
                    return pNameNorm.includes(bNameNorm) || bNameNorm.includes(pNameNorm);
                });

                if (product) {
                    console.log(`[Import] Found Existing Product (Fuzzy): ${product.name} (${product.id})`);
                    // Restore if soft deleted
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { isDeleted: false, isActive: true }
                    });
                } else {
                    // Create NEW Product
                    const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now(); // Add timestamp to avoid slug collision

                    product = await prisma.product.create({
                        data: {
                            name: brandName,
                            slug: slug,
                            categoryId: category.id,
                            description: `<p>Topup ${brandName} Resmi via ${provider}</p>`,
                            imageUrl: 'https://placehold.co/400x400/png?text=' + brandName.replace(' ', '+'),
                            isActive: true
                        }
                    });
                    console.log(`[Import] Created New Product: ${product.name} (${product.id})`);
                }
            }

            // Filter products for this brand from the pricelistData
            const brandProducts = pricelistData.filter((item: any) =>
                (item.brand && item.brand.toLowerCase() === brandName.toLowerCase()) ||
                (item.brand_name && item.brand_name.toLowerCase() === brandName.toLowerCase())
            );
            console.log(`[Import] Found ${brandProducts.length} variants for ${brandName}`);

            if (!product) {
                console.warn(`[Import] No product found or created for brand ${brandName}. Skipping variants.`);
                continue;
            }

            const targetProvider = provider;

            for (const item of brandProducts) {
                // Normalization
                const brand = item.brand || item.brand_name || brandName;
                const sku = item.sku || item.buyer_sku_code || item.code;
                const name = item.name || item.product_name || item.nama_produk;
                const price = item.price;

                // Status Handling
                let status = true;
                if (item.status !== undefined) {
                    status = item.status === true || item.status === 1;
                } else if (item.buyer_product_status !== undefined) {
                    status = item.buyer_product_status && item.seller_product_status;
                }

                if (!sku || !name || !price) continue;

                // 3. Upsert Variant
                const sellPrice = Math.ceil(price * (1 + effectiveMargin / 100));

                let variant = await prisma.productVariant.findUnique({
                    where: { sku: sku }
                });

                if (!variant) {
                    // Fallback: Check by Name within same product (in case SKU changed)
                    variant = await prisma.productVariant.findFirst({
                        where: {
                            productId: product.id,
                            name: name
                        }
                    });
                }

                if (!variant) {
                    // Create New Variant
                    variant = await prisma.productVariant.create({
                        data: {
                            product: { connect: { id: product.id } },
                            name: name,
                            sku: sku,
                            price: sellPrice,
                            originalPrice: price,
                            stock: 999999,
                            isActive: status, // Use provider status
                            isDeleted: false,
                            durationDays: 0,
                            warrantyDays: 0,
                            deliveryType: 'instant',
                            bestProvider: targetProvider
                        }
                    });
                } else {
                    // Update variant (Move to correct product if needed)
                    // If variant was found by SKU on another product, this moves it.
                    if (variant.productId !== product.id) {
                        console.log(`[Import] Moving Variant ${variant.sku} from Product ${variant.productId} to ${product.id}`);
                    }

                    await prisma.productVariant.update({
                        where: { id: variant.id },
                        data: {
                            productId: product.id, // Ensure it belongs to current product
                            stock: 999999,
                            isActive: status, // Sync status
                            isDeleted: false, // RESTORE SOFT DELETED
                            price: sellPrice,
                            originalPrice: price,
                            // Update name if match by SKU and name changed? Optional but good.
                            name: name
                        }
                    });
                }

                // 4. Upsert VariantProvider
                await prisma.variantProvider.upsert({
                    where: {
                        providerCode_providerSku: {
                            providerCode: targetProvider,
                            providerSku: sku
                        }
                    },
                    update: {
                        providerPrice: price,
                        providerStatus: status,
                        lastUpdated: new Date()
                    },
                    create: {
                        variantId: variant.id,
                        providerCode: targetProvider,
                        providerSku: sku,
                        providerPrice: price,
                        providerStatus: status
                    }
                });

                processedCount++;
            }
        } // End of brands loop

        return NextResponse.json({ success: true, message: `Imported ${processedCount} products via ${provider}` });


    } catch (error: any) {
        console.error("Import Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
