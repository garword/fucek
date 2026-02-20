import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/topup/digiflazz/import-single
 * Import single product by SKU from Digiflazz
 * Auto-creates new product or adds variant to existing product
 */
export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { productCode, action: userAction, productName, existingProductId } = body;

        // Validate input
        if (!productCode || !productCode.trim()) {
            return NextResponse.json({ error: 'Kode produk harus diisi' }, { status: 400 });
        }

        if (!userAction || !['create_new', 'add_to_existing'].includes(userAction)) {
            return NextResponse.json({ error: 'Action harus "create_new" atau "add_to_existing"' }, { status: 400 });
        }

        if (userAction === 'create_new' && (!productName || !productName.trim())) {
            return NextResponse.json({ error: 'Nama produk harus diisi untuk membuat produk baru' }, { status: 400 });
        }

        if (userAction === 'add_to_existing' && !existingProductId) {
            return NextResponse.json({ error: 'Product ID harus diisi untuk menambahkan ke produk existing' }, { status: 400 });
        }

        // 1. Get Digiflazz credentials
        const usernameItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
        const keyItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });
        const username = usernameItem?.content;
        const key = keyItem?.content;

        if (!username || !key) {
            return NextResponse.json({ error: 'Kredensial Digiflazz belum dikonfigurasi' }, { status: 500 });
        }

        // 2. Fetch price list from cache or API
        const CACHE_KEY = 'digiflazz_raw_pricelist';
        let pricelistData: any[] = [];

        const cache = await prisma.digiflazzCache.findUnique({ where: { cacheKey: CACHE_KEY } });

        if (cache && new Date(cache.expiresAt) > new Date()) {
            console.log('[Digiflazz Import] Using cached price list');
            pricelistData = JSON.parse(cache.data);
        } else {
            // Fetch fresh data
            const sign = crypto.createHash('md5').update(username + key + 'pricelist').digest('hex');
            const res = await fetch('https://api.digiflazz.com/v1/price-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cmd: 'prepaid', username, sign })
            });

            const data = await res.json();
            if (!data.data || !Array.isArray(data.data)) {
                return NextResponse.json({ error: 'Gagal fetch data dari Digiflazz' }, { status: 500 });
            }

            pricelistData = data.data;
            console.log(`[Digiflazz Import] Fetched fresh data: ${pricelistData.length} products`);

            // Update cache
            await prisma.digiflazzCache.upsert({
                where: { cacheKey: CACHE_KEY },
                update: {
                    data: JSON.stringify(pricelistData),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
                },
                create: {
                    cacheKey: CACHE_KEY,
                    data: JSON.stringify(pricelistData),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
                }
            });
        }

        // 3. Find product by SKU
        const normalizedCode = productCode.trim().toLowerCase();
        console.log(`[Digiflazz Import] Searching for SKU: "${normalizedCode}"`);

        const productData = pricelistData.find((item: any) => {
            const itemSku = item.buyer_sku_code?.toString().toLowerCase().trim();
            return itemSku === normalizedCode;
        });

        if (!productData) {
            return NextResponse.json({
                error: `Produk dengan kode "${productCode}" tidak ditemukan di Digiflazz`
            }, { status: 404 });
        }

        // 4. Extract product info
        const sku = productData.buyer_sku_code;
        const variantName = productData.product_name;
        const providerPrice = productData.price;
        const brandName = productData.brand || extractBrandName(variantName);
        const category = productData.category || 'Games';
        const status = productData.buyer_product_status && productData.seller_product_status;

        // 5. Get margin (Bronze tier)
        let effectiveMargin = 10; // Default
        try {
            // @ts-ignore
            const bronzeTier = await prisma.tierConfig?.findFirst({
                where: { name: 'Bronze' }
            });
            if (bronzeTier) {
                effectiveMargin = Number(bronzeTier.marginPercent);
            }
        } catch (e) {
            console.warn('[Import Single] TierConfig not available, using default margin');
        }

        const sellingPrice = Math.ceil(providerPrice * (1 + effectiveMargin / 100));

        // 6. Ensure Games category exists
        let categoryRecord = await prisma.category.findFirst({ where: { name: 'Games' } });
        if (!categoryRecord) {
            categoryRecord = await prisma.category.create({
                data: { name: 'Games', slug: 'games', type: 'GAME' }
            });
        }

        // 7. Get or create product based on user choice
        let product;
        let action: 'created' | 'added_variant';

        if (userAction === 'create_new') {
            // Create new product with user-provided name
            const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            product = await prisma.product.create({
                data: {
                    name: productName,
                    slug: slug,
                    categoryId: categoryRecord.id,
                    description: `<p>Topup ${productName} Resmi via Digiflazz</p>`,
                    imageUrl: `https://placehold.co/400x400/png?text=${encodeURIComponent(productName)}`,
                    isActive: true
                }
            });
            action = 'created';
        } else {
            // Add to existing product
            product = await prisma.product.findUnique({
                where: { id: existingProductId }
            });

            if (!product) {
                return NextResponse.json({
                    error: `Produk dengan ID ${existingProductId} tidak ditemukan`
                }, { status: 404 });
            }
            action = 'added_variant';
        }

        // 8. Check if variant already exists
        const existingVariant = await prisma.productVariant.findFirst({
            where: {
                productId: product.id,
                OR: [
                    { sku: sku },
                    { name: variantName }
                ]
            }
        });

        if (existingVariant) {
            // Check if soft deleted
            if (existingVariant.isDeleted) {
                // RESTORE
                const restoredVariant = await prisma.productVariant.update({
                    where: { id: existingVariant.id },
                    data: {
                        isDeleted: false,
                        isActive: status, // Update with current provider status
                        price: sellingPrice,
                        stock: 999999, // Reset stock if provider is unlimited
                        // providerStatus is on VariantProvider, not ProductVariant
                    }
                });

                // Update VariantProvider
                await prisma.variantProvider.upsert({
                    where: {
                        providerCode_providerSku: {
                            providerCode: 'DIGIFLAZZ',
                            providerSku: sku // Assuming SKU didn't change, or we match by variantId
                        }
                    },
                    update: {
                        providerSku: sku,
                        providerPrice: providerPrice,
                        providerStatus: status
                    },
                    create: {
                        variantId: restoredVariant.id,
                        providerCode: 'DIGIFLAZZ',
                        providerSku: sku,
                        providerPrice: providerPrice,
                        providerStatus: status
                    }
                });

                return NextResponse.json({
                    success: true,
                    action: 'restored',
                    message: `Varian "${variantName}" berhasil dipulihkan (restore) ke produk "${product.name}"`,
                    product,
                    variant: restoredVariant
                });
            }

            return NextResponse.json({
                error: `Varian dengan SKU "${sku}" atau nama "${variantName}" sudah ada di produk "${product.name}"`,
                product,
                variant: existingVariant
            }, { status: 409 });
        }

        // 9. Create variant
        const variant = await prisma.productVariant.create({
            data: {
                productId: product.id,
                name: variantName,
                sku: sku,
                price: sellingPrice,
                originalPrice: providerPrice,
                stock: 999999,
                isActive: status,
                durationDays: 0,
                warrantyDays: 0,
                deliveryType: 'instant',
                bestProvider: 'DIGIFLAZZ'
            }
        });

        // 10. Create VariantProvider record
        await prisma.variantProvider.create({
            data: {
                variantId: variant.id,
                providerCode: 'DIGIFLAZZ',
                providerSku: sku,
                providerPrice: providerPrice,
                providerStatus: status
            }
        });

        return NextResponse.json({
            success: true,
            action,
            message: action === 'created'
                ? `Produk baru "${product.name}" berhasil dibuat dengan 1 varian`
                : `Varian "${variantName}" berhasil ditambahkan ke produk "${product.name}"`,
            product,
            variant
        });

    } catch (error: any) {
        console.error('[Digiflazz Import Single Error]', error);
        return NextResponse.json({
            error: error.message || 'Terjadi kesalahan saat import produk'
        }, { status: 500 });
    }
}

/**
 * Extract brand name from product name
 * Example: "Mobile Legends 5 Diamonds" -> "Mobile Legends"
 */
function extractBrandName(productName: string): string {
    // Common patterns to remove
    const patterns = [
        /\d+\s*(diamond|dm|diamonds|coin|coins|uc|gold|gems|voucher|token)/gi,
        /\(.*?\)/g, // Remove parentheses content
        /weekly|monthly|membership|subscription/gi
    ];

    let cleaned = productName;
    patterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // Trim and clean up extra spaces
    cleaned = cleaned.trim().replace(/\s+/g, ' ');

    return cleaned || productName; // Fallback to original if empty
}
