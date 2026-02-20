
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { provider, code } = await req.json();

        if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

        // 1. Get Config
        const configItems = await prisma.siteContent.findMany({
            where: {
                slug: { in: ['digiflazz_username', 'digiflazz_key', 'digiflazz_margin'] }
            }
        });
        const getConfig = (slug: string) => configItems.find(c => c.slug === slug)?.content || '';

        const username = getConfig('digiflazz_username');
        const key = getConfig('digiflazz_key');
        const marginPercent = parseFloat(getConfig('digiflazz_margin') || '5');

        if (!username || !key) return NextResponse.json({ error: 'Digiflazz config missing' }, { status: 500 });

        let importedCount = 0;
        let createdProduct = null;

        // 2. Fetch Digiflazz
        if (provider === 'DIGIFLAZZ') {
            const sign = crypto.createHash('md5').update(username + key + 'pricelist').digest('hex');
            const response = await fetch('https://api.digiflazz.com/v1/price-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cmd: 'prepaid',
                    username: username,
                    sign: sign
                })
            });
            const result = await response.json();

            if (!result.data) return NextResponse.json({ error: 'Failed to fetch from Digiflazz' }, { status: 500 });

            // Filter by Code (Brand match)
            // Normalize inputs: remove spaces, lowercase
            const normalizedCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');

            const matches = result.data.filter((item: any) => {
                const brand = item.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
                return brand === normalizedCode && item.category === 'Games';
            });

            if (matches.length === 0) return NextResponse.json({ error: `No games found for brand code: ${code}` }, { status: 404 });

            // 3. Process Matches
            // Assume all matches belong to the same Brand/Product
            const firstItem = matches[0];
            const brandName = firstItem.brand; // Use original casing
            const productSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');

            // A. Ensure Category
            let category = await prisma.category.findFirst({
                where: { OR: [{ slug: productSlug }, { name: brandName, type: 'GAME' }] }
            });

            if (!category) {
                category = await prisma.category.create({
                    data: {
                        name: brandName,
                        slug: productSlug,
                        type: 'GAME',
                        iconKey: 'gamepad-2' // Default icon
                    }
                });
            }

            // B. Ensure Product
            let product = await prisma.product.findFirst({ where: { slug: productSlug } });

            if (!product) {
                product = await prisma.product.create({
                    data: {
                        name: brandName,
                        slug: productSlug,
                        categoryId: category.id,
                        description: `Top Up ${brandName} Resmi & Legal 100%`,
                        imageUrl: 'https://placehold.co/400x400/png?text=' + brandName.replace(' ', '+'),
                        isActive: true,
                        instantDeliveryInfo: 'Otomatis 1-5 Detik',
                        warrantyInfo: 'Garansi 100%',
                        supportInfo: '24/7 Support'
                    }
                });
            }
            createdProduct = product;

            // C. Sync Variants
            for (const item of matches) {
                const sku = item.buyer_sku_code;
                const variantName = item.product_name;
                const price = item.price;
                const sellingPrice = Math.ceil(price + (price * (marginPercent / 100)));

                // Assuming unlimited stock if provider has stock
                // Note: Digiflazz 'unlimited' stock is usually indicated by stock > 0 or specific flag

                await prisma.productVariant.upsert({
                    where: { id: sku }, // Use SKU as ID for mapping simplicity
                    update: {
                        name: variantName,
                        price: sellingPrice,
                        // Update price but maybe keep other fields?
                    },
                    create: {
                        id: sku,
                        productId: product.id,
                        name: variantName,
                        price: sellingPrice,
                        durationDays: 0, // Instant
                        warrantyDays: 0
                    }
                });
                importedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${importedCount} variants for ${createdProduct?.name}`,
            product: createdProduct
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
