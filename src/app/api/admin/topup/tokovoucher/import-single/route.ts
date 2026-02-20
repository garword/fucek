import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getTokoVoucherConfig, getTokoVoucherProducts } from '@/lib/tokovoucher';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/topup/tokovoucher/import-single
 * Import single product by SKU from TokoVoucher
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

        // 1. Get TokoVoucher credentials via Lib
        const config = await getTokoVoucherConfig();
        if (!config) {
            return NextResponse.json({ error: 'Kredensial TokoVoucher belum dikonfigurasi' }, { status: 500 });
        }

        // 2. Fetch price list from cache or API
        const CACHE_KEY = 'tokovoucher_raw_pricelist';
        let pricelistData: any[] = [];

        // Use generic digiflazzCache table
        const cache = await prisma.digiflazzCache.findUnique({ where: { cacheKey: CACHE_KEY } });

        if (cache && new Date(cache.expiresAt) > new Date()) {
            console.log('[TokoVoucher Import] Using cached price list');
            pricelistData = JSON.parse(cache.data);
        } else {
            // Fetch fresh data using Robust Logic from Lib
            console.log('[TokoVoucher Import] Fetching fresh data via Lib...');
            const products = await getTokoVoucherProducts(config);

            if (!products || products.length === 0) {
                return NextResponse.json({
                    error: 'Gagal fetch data dari TokoVoucher (List Kosong)'
                }, { status: 500 });
            }

            pricelistData = products;
            console.log(`[TokoVoucher Import] Fetched fresh data: ${pricelistData.length} products`);

            // Update cache (1 hour)
            await prisma.digiflazzCache.upsert({
                where: { cacheKey: CACHE_KEY },
                update: {
                    data: JSON.stringify(pricelistData),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
                },
                create: {
                    cacheKey: CACHE_KEY,
                    data: JSON.stringify(pricelistData),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
                }
            });
        }

        // 3. Find product by SKU (Robust Search)
        const normalizedCode = productCode.trim().toLowerCase();

        // TokoVoucherProduct has `code`, `product_name`, `price`, `status`, `brand_name`
        const productData = pricelistData.find((item: any) =>
            item.code?.toString().toLowerCase().trim() === normalizedCode
        );

        if (!productData) {
            return NextResponse.json({
                error: `Produk dengan kode "${productCode}" tidak ditemukan di TokoVoucher`
            }, { status: 404 });
        }

        // 4. Extract product info (TokoVoucher-specific fields)
        const sku = productData.code;
        const variantName = productData.product_name; // Field from library
        const providerPrice = parseFloat(productData.price);
        const brandName = productData.brand_name || extractBrandName(variantName);
        const category = productData.category_name || 'Games'; // Field from library
        const status = productData.status === 1 || productData.status === true || productData.status === 'active';

        if (providerPrice <= 0) {
            return NextResponse.json({
                error: 'Harga produk tidak valid'
            }, { status: 400 });
        }

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
                    description: `<p>Topup ${productName} Resmi via TokoVoucher</p>`,
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
                bestProvider: 'TOKOVOUCHER'
            }
        });

        // 10. Create VariantProvider record
        await prisma.variantProvider.create({
            data: {
                variantId: variant.id,
                providerCode: 'TOKOVOUCHER',
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
        console.error('[TokoVoucher Import Single Error]', error);
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
