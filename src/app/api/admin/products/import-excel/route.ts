
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { items } = body; // Array of product objects

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No data to import' }, { status: 400 });
        }

        let successCount = 0;
        let skippedCount = 0;
        let errors = [];

        console.log(`[ImportExcel] Received ${items.length} items`);

        for (const item of items) {
            try {
                // Expected fields: category, brand, productName, sku, priceModal, priceJual, stock, description
                // Optional: image

                console.log('[ImportExcel] Processing Item:', JSON.stringify(item));

                const categoryName = item['Category'] || 'Uncategorized';
                const brand = item['Brand'] || 'Generic';
                const productName = item['Product Name'] || item['Name'];
                const sku = String(item['SKU'] || '').trim();
                const priceModal = Number(item['Price Modal'] || 0);
                const priceJual = Number(item['Price Jual'] || item['Price'] || 0);
                const stock = Number(item['Stock'] || 0);
                const description = item['Description'] || '';
                const imageUrl = item['Image URL'] || '';

                if (!sku || !productName) {
                    console.log(`[ImportExcel] SKIPPED: Missing SKU (${sku}) or Product Name (${productName})`);
                    errors.push(`Skipped row (missing SKU/Name): ${JSON.stringify(item)}`);
                    skippedCount++;
                    continue;
                }

                // 1. Ensure Category
                const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                // Determine Type: Simple heuristic
                let type: 'DIGITAL' | 'GAME' | 'PULSA' | 'SOSMED' = 'DIGITAL';
                const catLower = categoryName.toLowerCase();
                if (catLower.includes('game') || catLower.includes('topup')) type = 'GAME';
                else if (catLower.includes('pulsa') || catLower.includes('data')) type = 'PULSA';
                else if (catLower.includes('sosmed') || catLower.includes('follower')) type = 'SOSMED';

                let category = await prisma.category.findFirst({ where: { slug: categorySlug } });
                if (!category) {
                    category = await prisma.category.create({
                        data: {
                            name: categoryName,
                            slug: categorySlug,
                            type: type
                        }
                    });
                }

                console.log('[ImportExcel] Category OK:', category.name);

                // 2. Ensure Product (Parent) based on Brand/Name Grouping?
                // For Excel import, we assume `Product Name` is the Variant Name usually.
                // Parent Product logic needs to be flexible.
                // Strategy: Use Brand as Product Parent (like Digiflazz logic) OR use Product Name as Parent?
                // Let's use "Product Name" as the Parent Name, unless "Brand" exists and is distinct.
                // But usually Excel rows are VARIANTS (e.g. "Weekly Diamond Pass", "Twilight Pass").
                // If we use Brand as parent, it groups nicely.

                const productSlug = (brand + '-' + categoryName).toLowerCase().replace(/[^a-z0-9]/g, '-');
                let product = await prisma.product.findFirst({ where: { slug: productSlug } });

                if (!product) {
                    product = await prisma.product.create({
                        data: {
                            name: brand, // Using Brand as Product Name for grouping variants
                            slug: productSlug,
                            categoryId: category.id,
                            description: description || `Produk ${brand} terbaik.`,
                            imageUrl: imageUrl || `https://placehold.co/400x400/png?text=${brand.replace(/ /g, '+')}`,
                            isActive: true
                        }
                    });
                }

                if (!product || !product.id) {
                    throw new Error(`Failed to create/find product for brand: ${brand}`);
                }

                console.log('[ImportExcel] Product OK:', product.name, 'ID:', product.id);

                // 3. Upsert Variant
                let variant = await prisma.productVariant.findFirst({
                    where: { sku: sku, productId: product.id }
                });

                if (variant) {
                    variant = await prisma.productVariant.update({
                        where: { id: variant.id },
                        data: {
                            name: productName,
                            price: priceJual,
                            originalPrice: priceModal,
                            stock: stock,
                            // description? Variant usually doesn't have desc field in schema yet, uses Parent's.
                        }
                    });
                } else {
                    variant = await prisma.productVariant.create({
                        data: {
                            product: {
                                connect: { id: product.id }
                            },
                            name: productName,
                            sku: sku,
                            price: priceJual,
                            originalPrice: priceModal,
                            stock: stock,
                            isActive: true,
                            bestProvider: 'MANUAL',
                            durationDays: 0,
                            warrantyDays: 0
                        }
                    });
                }

                // 4. Create/Update VariantProvider
                if (variant) {
                    await prisma.variantProvider.upsert({
                        where: {
                            providerCode_providerSku: {
                                providerCode: 'MANUAL',
                                providerSku: sku
                            }
                        },
                        update: {
                            providerPrice: priceModal,
                            lastUpdated: new Date()
                        },
                        create: {
                            variantId: variant.id,
                            providerCode: 'MANUAL',
                            providerSku: sku,
                            providerPrice: priceModal,
                            providerStatus: true
                        }
                    });
                }


                successCount++;
                console.log(`[ImportExcel] SUCCESS ITEM: ${productName} (SKU: ${sku})`);

            } catch (err: any) {
                console.error('Import Row Error:', err);
                errors.push(`Error on item "${item['Product Name']}": ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Berhasil: ${successCount}. Skipped: ${skippedCount}.`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Excel Import API Error:', error);
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
    }
}
