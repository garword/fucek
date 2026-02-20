import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getTokoVoucherConfig, getTokoVoucherProducts } from '@/lib/tokovoucher';
import { filterBrandsByType } from '@/lib/category-filter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getTokoVoucherConfig();
    if (!config) {
        return NextResponse.json({ error: 'TokoVoucher configuration missing' }, { status: 500 });
    }

    // 1. Get filter parameter
    const { searchParams } = new URL(req.url);
    const categoryTypeFilter = (searchParams.get('type') as 'GAME' | 'PULSA' | 'ALL') || 'ALL';
    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheKey = 'tokovoucher_brands_grouped';

    // 2. Check Cache
    if (!forceRefresh) {
        const cached = await prisma.digiflazzCache.findUnique({
            where: { cacheKey }
        });

        if (cached && !cached.isStale && cached.expiresAt > new Date()) {
            console.log('Serving TokoVoucher Brands from Cache');
            try {
                const brands = JSON.parse(cached.data);

                // Apply filter even on cached data
                const filteredBrands = filterBrandsByType(brands, categoryTypeFilter);

                return NextResponse.json({
                    success: true,
                    brands: filteredBrands,
                    totalBrands: brands.length,
                    filteredCount: filteredBrands.length,
                    filter: categoryTypeFilter,
                    source: 'cache',
                    expiresAt: cached.expiresAt
                });
            } catch (e) {
                console.error('Cache Parse Error:', e);
            }
        }
    }

    // 3. Fetch Fresh Data
    try {
        const products = await getTokoVoucherProducts(config);

        if (!products || products.length === 0) {
            return NextResponse.json({ success: false, message: 'No products found from TokoVoucher' });
        }

        // 4. Group by Brand AND Category
        const brandMap = new Map();

        products.forEach((item: any) => {
            // Validate required fields
            if (!item.code || !item.price) return;

            const brand = item.brand_name || item.brand || 'General'; // Fallback
            const category = item.category_name || item.category || 'Games'; // Fallback
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
                sku: item.code,
                name: item.product_name || item.nama_produk || `${brand} ${item.code}`,
                price: item.price,
                stock: item.status === 1 ? 999 : 0, // 1 = active
                status: item.status === 1,
                description: item.desc || `Topup ${brand} - ${item.product_name}`,
                brand: brand, // Explicitly add brand
                category: category // Explicitly add category
            });
        });

        const brands = Array.from(brandMap.values()).sort((a: any, b: any) =>
            (a.name || '').localeCompare(b.name || '')
        );

        // Apply category filter
        const filteredBrands = filterBrandsByType(brands, categoryTypeFilter);

        // 5. Save to Cache (1 Hour Expiry) - only save ALL, not filtered
        if (categoryTypeFilter === 'ALL') {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // 1 Hour Cache

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
            brands: filteredBrands,
            totalBrands: brands.length,
            filteredCount: filteredBrands.length,
            filter: categoryTypeFilter,
            source: 'api'
        });

    } catch (error: any) {
        console.error('TokoVoucher Brand Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
