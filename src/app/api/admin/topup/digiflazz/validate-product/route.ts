import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/topup/digiflazz/validate-product?code=ml5
 * Validate and preview product from Digiflazz cache
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
            console.log('[Digiflazz Validate] Using cached price list');
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
            console.log(`[Digiflazz Validate] Fetched fresh data: ${pricelistData.length} products`);

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
        console.log(`[Digiflazz Validate] Searching for SKU: "${normalizedCode}" in ${pricelistData.length} items`);

        const productData = pricelistData.find((item: any) => {
            const itemSku = item.buyer_sku_code?.toString().toLowerCase().trim();
            return itemSku === normalizedCode;
        });

        if (!productData) {
            // Debug: Print first 5 SKUs to see format
            const sampleSkus = pricelistData.slice(0, 5).map((p: any) => p.buyer_sku_code);
            console.log('[Digiflazz Validate] Not found. Sample SKUs:', sampleSkus);

            return NextResponse.json({
                error: `Produk dengan kode "${productCode}" tidak ditemukan di Digiflazz (Total Data: ${pricelistData.length})`
            }, { status: 404 });
        }

        // 4. Extract product info
        const sku = productData.buyer_sku_code;
        const variantName = productData.product_name;
        const providerPrice = productData.price;
        const brandName = productData.brand || extractBrandName(variantName);
        const status = productData.buyer_product_status && productData.seller_product_status;

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
        console.error('[Digiflazz Validate Error]', error);
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
