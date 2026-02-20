import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDigiflazzConfig, generateSignature } from '@/lib/digiflazz';
import { getCachedData, setCachedData } from '@/lib/cache';

interface DigiflazzProduct {
    product_name: string;
    category: string;
    brand: string;
    type: string;
    seller_name: string;
    price: number;
    buyer_sku_code: string;
    buyer_product_status: boolean;
    seller_product_status: boolean;
    unlimited_stock: boolean;
    stock: number;
    multi: boolean;
    start_cut_off: string;
    end_cut_off: string;
    desc: string;
}

interface BrandGroup {
    name: string;
    category: string;
    type: string;
    productCount: number;
    products: DigiflazzProduct[];
}

export async function GET(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const cmd = searchParams.get('cmd') || 'prepaid'; // 'prepaid' or 'pasca'
        const forceRefresh = searchParams.get('refresh') === 'true';

        const cacheKey = `digiflazz_pricelist_${cmd}`;
        const CACHE_EXPIRY_MINUTES = 10;

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = getCachedData<{ brands: BrandGroup[], cachedAt: string, expiresAt: string }>(cacheKey, CACHE_EXPIRY_MINUTES);
            if (cachedData) {
                return NextResponse.json({
                    success: true,
                    brands: cachedData.brands,
                    cachedAt: cachedData.cachedAt,
                    expiresAt: cachedData.expiresAt,
                    fromCache: true
                });
            }
        }

        // Fetch from Digiflazz API
        const config = await getDigiflazzConfig();
        if (!config) {
            return NextResponse.json({ error: 'Digiflazz not configured' }, { status: 400 });
        }

        const signature = generateSignature(config.username, config.key, 'pricelist');

        const payload = {
            cmd,
            username: config.username,
            sign: signature
        };

        console.log(`[Digiflazz Price List] Fetching ${cmd} products...`);
        console.log(`[Digiflazz Price List] Payload:`, { cmd, username: config.username, sign: signature.substring(0, 10) + '...' });

        const response = await fetch('https://api.digiflazz.com/v1/price-list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('[Digiflazz Price List] HTTP Error:', response.status, response.statusText);
            return NextResponse.json({
                error: 'Digiflazz API returned error',
                status: response.status,
                statusText: response.statusText
            }, { status: 500 });
        }

        const result = await response.json();
        console.log('[Digiflazz Price List] Response:', JSON.stringify(result).substring(0, 200));

        // Check for error in response
        if (result.rc && result.rc !== '00') {
            console.error('[Digiflazz Price List] API Error:', result);
            return NextResponse.json({
                error: 'Digiflazz API error',
                message: result.message || 'Unknown error',
                rc: result.rc,
                debug: result
            }, { status: 400 });
        }

        if (!result.data || !Array.isArray(result.data)) {
            console.error('[Digiflazz Price List] Invalid response format:', result);
            return NextResponse.json({
                error: 'Invalid response from Digiflazz',
                debug: result
            }, { status: 500 });
        }

        // Group products by brand
        const brandMap = new Map<string, BrandGroup>();

        result.data.forEach((product: DigiflazzProduct) => {
            // Create unique key: brand_category_type
            const key = `${product.brand}_${product.category}_${product.type}`;

            if (!brandMap.has(key)) {
                brandMap.set(key, {
                    name: product.brand,
                    category: product.category,
                    type: product.type,
                    productCount: 0,
                    products: []
                });
            }

            const brandGroup = brandMap.get(key)!;
            brandGroup.products.push(product);
            brandGroup.productCount = brandGroup.products.length;
        });

        const brands = Array.from(brandMap.values()).sort((a, b) => {
            // Sort by brand name, then category
            if (a.name !== b.name) return a.name.localeCompare(b.name);
            return a.category.localeCompare(b.category);
        });

        console.log(`[Digiflazz Price List] Fetched ${result.data.length} products, ${brands.length} brand groups`);

        // Cache the result
        const now = new Date();
        const expiresAt = new Date(now.getTime() + CACHE_EXPIRY_MINUTES * 60 * 1000);

        const cacheData = {
            brands,
            cachedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString()
        };

        setCachedData(cacheKey, cacheData, CACHE_EXPIRY_MINUTES);

        return NextResponse.json({
            success: true,
            brands,
            cachedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            fromCache: false
        });

    } catch (error) {
        console.error('[Digiflazz Price List] Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch price list',
            message: (error as Error).message
        }, { status: 500 });
    }
}
