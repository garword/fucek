import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { filterBrandsByType } from '@/lib/category-filter';
import { getPriceList } from '@/lib/digiflazz';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get filter parameter
    const { searchParams } = new URL(req.url);
    const categoryTypeFilter = (searchParams.get('type') as 'GAME' | 'PULSA' | 'ALL') || 'ALL';

    const usernameItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
    const keyItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });

    const username = usernameItem?.content;
    const key = keyItem?.content;

    if (!username || !key) {
        return NextResponse.json({ error: 'Digiflazz config missing' }, { status: 500 });
    }

    // 2. Refresh Check
    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheKey = 'digiflazz_brands_grouped';

    // 3. Check Cache (if not forced)
    if (!forceRefresh) {
        const cached = await prisma.digiflazzCache.findUnique({
            where: { cacheKey }
        });

        if (cached && !cached.isStale && cached.expiresAt > new Date()) {
            console.log('Serving Digiflazz Brands from Cache');
            try {
                const brands = JSON.parse(cached.data);

                // Apply filter even on cached data
                const filteredBrands = filterBrandsByType(brands, categoryTypeFilter);

                const isDevelopment = key.startsWith('dev-');
                return NextResponse.json({
                    success: true,
                    brands: filteredBrands,
                    totalBrands: brands.length,
                    filteredCount: filteredBrands.length,
                    filter: categoryTypeFilter,
                    isDevelopment,
                    source: 'cache'
                });
            } catch (e) {
                console.error('Cache Parse Error:', e);
                // Continue to fetch if cache is corrupted
            }
        }
    }

    // 4. Fetch Fresh Data
    try {
        // Fetch price list using the centralized library (throws if invalid)
        const rawBrands = await getPriceList('prepaid');

        if (Array.isArray(rawBrands)) {
            const isDevelopment = key.startsWith('dev-');

            // Group by Brand AND Category with full product details
            const brandMap = new Map();

            rawBrands.forEach((item: any) => {
                const brand = item.brand || 'Unknown Brand'; // Fallback for undefined/null
                const category = item.category || 'Uncategorized';
                const key = `${brand}-${category}`;

                if (!brandMap.has(key)) {
                    brandMap.set(key, {
                        name: brand,
                        category: category,
                        count: 0,
                        products: []
                    });
                }
                const entry = brandMap.get(key);
                entry.count++;
                entry.products.push({
                    sku: item.buyer_sku_code,
                    name: item.product_name,
                    price: item.price,
                    stock: item.stock > 0 ? 999 : 0,
                    status: item.buyer_product_status && item.seller_product_status,
                    description: item.desc || `Topup ${brand} - ${item.product_name}`
                });
            });

            const brands = Array.from(brandMap.values()).sort((a: any, b: any) =>
                (a.name || '').localeCompare(b.name || '')
            );

            // Apply category filter
            const filteredBrands = filterBrandsByType(brands, categoryTypeFilter);

            // 5. Save to Cache (only save ALL, not filtered)
            if (categoryTypeFilter === 'ALL') {
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 Minutes Cache

                await prisma.digiflazzCache.upsert({
                    where: { cacheKey },
                    update: {
                        data: JSON.stringify(brands),
                        lastFetch: new Date(),
                        expiresAt: expiresAt,
                        isStale: false
                    },
                    create: {
                        cacheKey,
                        data: JSON.stringify(brands),
                        lastFetch: new Date(),
                        expiresAt: expiresAt,
                        isStale: false
                    }
                });
            }

            return NextResponse.json({
                success: true,
                brands: filteredBrands, // Return filtered
                totalBrands: brands.length, // Track original count
                filteredCount: filteredBrands.length,
                filter: categoryTypeFilter,
                isDevelopment,
                source: 'api'
            });
        } else {
            console.error('Digiflazz Error or Invalid Data');
            return NextResponse.json({
                success: false,
                message: 'Gagal mengambil data dari Digiflazz (Format Data Invalid)',
            });
        }
    } catch (error: any) {
        console.error('Brand Fetch API Error:', error);

        // Failover: Try to serve stale cache if API fails (Rate Limit, Network Error, etc)
        try {
            const cachedFallback = await prisma.digiflazzCache.findUnique({
                where: { cacheKey }
            });

            if (cachedFallback) {
                console.warn('Serving Stale Cache due to API Failure');
                const brands = JSON.parse(cachedFallback.data);
                const filteredBrands = filterBrandsByType(brands, categoryTypeFilter);

                return NextResponse.json({
                    success: true,
                    brands: filteredBrands,
                    totalBrands: brands.length,
                    filteredCount: filteredBrands.length,
                    filter: categoryTypeFilter,
                    isDevelopment: false,
                    source: 'cache-stale',
                    warning: error.message
                });
            }
        } catch (cacheError) {
            console.error('Cache Fallback Error:', cacheError);
        }

        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
