import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getTokoVoucherConfig, getTokoVoucherProducts } from '@/lib/tokovoucher';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/topup/tokovoucher/validate-product?code=ML5D
 * Validate and preview product from TokoVoucher cache
 * Returns product details and suggested existing products for matching
 */
export async function GET(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const productCode = searchParams.get('code');

        if (!productCode || !productCode.trim()) {
            return NextResponse.json({ error: 'Kode produk harus diisi' }, { status: 400 });
        }

        // 1. Get TokoVoucher credentials via Lib
        const config = await getTokoVoucherConfig();
        if (!config) {
            return NextResponse.json({ error: 'Kredensial TokoVoucher belum dikonfigurasi' }, { status: 500 });
        }

        // 2. Fetch price list from cache or API
        const CACHE_KEY = 'tokovoucher_raw_pricelist';
        let pricelistData: any[] = [];

        // Use digiflazzCache table as generic cache
        const cache = await prisma.digiflazzCache.findUnique({ where: { cacheKey: CACHE_KEY } });

        if (cache && new Date(cache.expiresAt) > new Date()) {
            console.log('[TokoVoucher Validate] Using cached price list');
            pricelistData = JSON.parse(cache.data);
        } else {
            // Fetch fresh data using Robust Logic from Lib
            console.log('[TokoVoucher Validate] Fetching fresh data via Lib...');
            const products = await getTokoVoucherProducts(config);

            if (!products || products.length === 0) {
                return NextResponse.json({
                    error: 'Gagal fetch data dari TokoVoucher (List Kosong)'
                }, { status: 500 });
            }

            pricelistData = products;
            console.log(`[TokoVoucher Validate] Fetched fresh data: ${pricelistData.length} products`);

            // Update cache (using generic digiflazzCache)
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
        const normalizedCode = (productCode || '').trim().toLowerCase();
        console.log(`[TokoVoucher Validate] Searching for Code: "${normalizedCode}" in ${pricelistData.length} items`);

        // TokoVoucherProduct has `code`, `product_name`, `price`, `status`, `brand_name`
        const productData = pricelistData.find((item: any) =>
            item.code?.toString().toLowerCase().trim() === normalizedCode
        );

        if (!productData) {
            const sampleCodes = pricelistData.slice(0, 5).map((p: any) => p.code);
            console.log('[TokoVoucher Validate] Not found. Sample Codes:', sampleCodes);
            return NextResponse.json({
                error: `Produk dengan kode "${productCode}" tidak ditemukan di TokoVoucher`
            }, { status: 404 });
        }

        // 4. Extract product info (TokoVoucher-specific fields)
        const sku = productData.code;
        const variantName = productData.product_name;
        const providerPrice = parseFloat(productData.price);
        const brandName = productData.brand_name || extractBrandName(variantName);
        const status = productData.status === 1 || productData.status === true || productData.status === 'active';

        if (providerPrice <= 0) {
            return NextResponse.json({
                error: 'Harga produk tidak valid'
            }, { status: 400 });
        }

        // 5. Get margin (Bronze tier)
        let effectiveMargin = 10;
        try {
            // @ts-ignore
            const bronzeTier = await prisma.tierConfig?.findFirst({
                where: { name: 'Bronze' }
            });
            if (bronzeTier) {
                effectiveMargin = Number(bronzeTier.marginPercent);
            }
        } catch (e) {
            console.warn('[Validate] TierConfig not available, using default margin');
        }

        const sellingPrice = Math.ceil(providerPrice * (1 + effectiveMargin / 100));

        // 6. Search for similar existing products (for suggestions)
        const suggestedProducts = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: brandName } },
                    { name: { contains: brandName.split(' ')[0] } } // First word match
                ],
                category: {
                    type: 'GAME'
                }
            },
            select: {
                id: true,
                name: true,
                slug: true,
                _count: {
                    select: { variants: true }
                }
            },
            take: 5
        });

        // 7. Return preview data
        return NextResponse.json({
            success: true,
            product: {
                sku,
                name: variantName,
                providerPrice,
                sellingPrice,
                margin: effectiveMargin,
                brand: brandName,
                status
            },
            suggestedProducts: suggestedProducts.map(p => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                variantCount: p._count.variants
            }))
        });

    } catch (error: any) {
        console.error('[TokoVoucher Validate Error]', error);
        return NextResponse.json({
            error: error.message || 'Terjadi kesalahan saat validasi produk'
        }, { status: 500 });
    }
}

/**
 * Extract brand name from product name
 */
function extractBrandName(productName: string): string {
    const patterns = [
        /\d+\s*(diamond|dm|diamonds|coin|coins|uc|gold|gems|voucher|token)/gi,
        /\(.*?\)/g,
        /weekly|monthly|membership|subscription/gi
    ];

    let cleaned = productName;
    patterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    return cleaned || productName;
}
