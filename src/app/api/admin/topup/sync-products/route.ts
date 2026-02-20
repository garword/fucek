import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import crypto from 'crypto';
import prisma from '@/lib/prisma'; // Ensure prisma import

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow execution up to 60s (Vercel Pro/Hobby limit)

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetProvider = body.provider; // 'DIGIFLAZZ' | 'APIGAMES' | undefined (All)

    // 1. Get Config
    const configItems = await prisma.siteContent.findMany({
        where: {
            slug: {
                in: [
                    'digiflazz_username', 'digiflazz_key', 'digiflazz_margin',
                    'apigames_merchant_id', 'apigames_secret_key'
                ]
            }
        }
    });

    const getConfig = (slug: string) => configItems.find(c => c.slug === slug)?.content || '';

    const username = getConfig('digiflazz_username');
    const key = getConfig('digiflazz_key');
    const marginPercent = parseFloat(getConfig('digiflazz_margin') || '5');

    // APIGames Config
    const apigamesMerchant = getConfig('apigames_merchant_id');
    const apigamesSecret = getConfig('apigames_secret_key');

    let processedDigi = 0;
    let processedApi = 0;
    let allVariants = [];

    // ---------------------------------------------------------
    // 2. Fetch Digiflazz (if target matches)
    // ---------------------------------------------------------
    if (!targetProvider || targetProvider === 'DIGIFLAZZ') {
        if (username && key) {
            try {
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

                if (result.data) {
                    const gameProducts = result.data.filter((item: any) => item.category === 'Games');
                    console.log(`Digiflazz: Found ${gameProducts.length} games.`);
                } else {
                    console.error('Digiflazz Sync Error:', result);
                    // If result.data is missing, it's likely an error message from Digiflazz
                    return NextResponse.json({
                        success: false,
                        message: 'Gagal Sync: ' + (result.message || 'Respons API Kosong/Error'),
                        full_response: result
                    });
                }

                if (result.data) {
                    const gameProducts = result.data.filter((item: any) => item.category === 'Games');

                    for (const item of gameProducts) {
                        const brand = item.brand;
                        // const type = item.type; // e.g. "Umum"
                        const sku = item.buyer_sku_code;
                        const name = item.product_name;
                        const price = item.price;
                        const status = item.buyer_product_status && item.seller_product_status; // Both must be true? Usually buyer_product_status is enough.
                        const unlimitedStock = item.stock > 0;

                        // Identify/Create Product Wrapper (Brand)
                        const productSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        let category = await prisma.category.findFirst({ where: { slug: productSlug } }); // Using brand as category slug for now based on prev logic

                        // Wait, previous logic treated Brand as Category name? 
                        // "where: { name: brand, type: 'GAME' }"
                        // Let's stick to the previous logic of creating Category if missing
                        let cat = await prisma.category.findFirst({ where: { name: brand, type: 'GAME' } });
                        if (!cat) {
                            cat = await prisma.category.create({
                                data: { name: brand, type: 'GAME', slug: productSlug }
                            });
                        }

                        let product = await prisma.product.findFirst({ where: { slug: productSlug } });
                        if (!product) {
                            product = await prisma.product.create({
                                data: {
                                    name: brand,
                                    slug: productSlug,
                                    categoryId: cat.id,
                                    description: `Topup ${brand} Termurah`,
                                    imageUrl: 'https://placehold.co/400x400/png?text=Game',
                                    isActive: true
                                }
                            });
                        }

                        // Upsert VariantProvider
                        // Find Variant first by SKU (Digiflazz SKU is usually unique enough, or we match by Name?)
                        // To allow multi-provider, we should match by NAME if possible, but names differ.
                        // For now, let's assume if we sync Digiflazz, we create/update the variant based on Digiflazz SKU.

                        // Upsert ProductVariant
                        const sellPrice = Math.ceil(price * (1 + marginPercent / 100));

                        // We need to use "upsert" but we also need the ID to create VariantProvider.
                        // Let's try to find variant by existing SKU OR Name matching?
                        // Simple approach: Use SKU as the unique identifier for the variant for now.
                        // BUT if we want 2 providers for 1 variant, we need a common ID.
                        // Challenge: Digiflazz SKU "ML5" vs APIGames SKU "ML5". If matches, great. If "ML-5" vs "ML5", they won't match.
                        // Smart Routing requires them to point to the SAME Variant ID.
                        // Fallback: Try to match by "Normalized Name". 

                        let variant = await prisma.productVariant.findFirst({
                            where: {
                                productId: product.id,
                                OR: [
                                    { sku: sku },
                                    { name: name } // basic name matching
                                ]
                            }
                        });

                        if (!variant) {
                            variant = await prisma.productVariant.create({
                                data: {
                                    productId: product.id,
                                    name: name,
                                    sku: sku, // Main SKU defaults to Digiflazz
                                    price: sellPrice,
                                    originalPrice: price,
                                    stock: unlimitedStock ? 999 : 0,
                                    isActive: status,
                                    durationDays: 0,
                                    warrantyDays: 0
                                }
                            });
                        }

                        // Update VariantProvider
                        await prisma.variantProvider.upsert({
                            where: {
                                providerCode_providerSku: {
                                    providerCode: 'DIGIFLAZZ',
                                    providerSku: sku
                                }
                            },
                            update: {
                                variantId: variant.id,
                                providerPrice: price,
                                providerStatus: status,
                                lastUpdated: new Date()
                            },
                            create: {
                                variantId: variant.id,
                                providerCode: 'DIGIFLAZZ',
                                providerSku: sku,
                                providerPrice: price,
                                providerStatus: status
                            }
                        });


                        allVariants.push(variant.id);
                        processedDigi++;
                    }
                }
            } catch (e) {
                console.error("Digiflazz Sync Error", e);
            }
        }
    }

    // ---------------------------------------------------------
    // 3. Fetch APIGames (if target matches)
    // ---------------------------------------------------------
    if (!targetProvider || targetProvider === 'APIGAMES') {
        if (apigamesMerchant && apigamesSecret) {
            try {
                const signature = crypto.createHash('md5').update(apigamesMerchant + apigamesSecret).digest('hex');
                // Try v1 endpoint instead of v2 (v2 returns 404)
                const apiUrl = `https://v1.apigames.id/v1/price-list?merchant_id=${apigamesMerchant}&signature=${signature}`;
                console.log('Fetching APIGames:', apiUrl);

                const response = await fetch(apiUrl);
                const result = await response.json();

                console.log('APIGames Full Response:', JSON.stringify(result, null, 2));

                if (result.data && Array.isArray(result.data)) {
                    console.log(`APIGames: Found ${result.data.length} items.`);

                    for (const item of result.data) {
                        // APIGames Structure: { code, product_name, price: { basic, gold, etc }, status, game, category }
                        const brand = item.game;
                        const sku = item.code;
                        const name = item.product_name;
                        const price = item.price.basic || item.price; // Handle if price is object or number
                        const status = item.status === 1;

                        // Create/Find Product (Brand)
                        const productSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        // ... (Similar logic to Digiflazz, find category/product)
                        let cat = await prisma.category.findFirst({ where: { name: brand, type: 'GAME' } });
                        if (!cat) {
                            cat = await prisma.category.create({ data: { name: brand, type: 'GAME', slug: productSlug } });
                        }

                        let product = await prisma.product.findFirst({ where: { slug: productSlug } });
                        if (!product) {
                            product = await prisma.product.create({
                                data: {
                                    name: brand,
                                    slug: productSlug,
                                    categoryId: cat.id,
                                    description: `Topup ${brand}`,
                                    imageUrl: 'https://placehold.co/400x400/png?text=Game',
                                    isActive: true
                                }
                            });
                        }

                        // Match Variant
                        let variant = await prisma.productVariant.findFirst({
                            where: {
                                productId: product.id,
                                OR: [
                                    { sku: sku }, // Match by SKU if same
                                    { name: name } // Match by Name
                                ]
                            }
                        });

                        // If not found, create new? 
                        // Note: If we ran Digiflazz sync first, we might have created it.
                        // If we run APIGames sync only, we create it.
                        const sellPrice = Math.ceil(price * (1 + marginPercent / 100));

                        if (!variant) {
                            variant = await prisma.productVariant.create({
                                data: {
                                    productId: product.id,
                                    name: name,
                                    sku: sku,
                                    price: sellPrice,
                                    originalPrice: price,
                                    stock: 999,
                                    isActive: status,
                                    durationDays: 0,
                                    warrantyDays: 0
                                }
                            });
                        }

                        // Upsert VariantProvider
                        await prisma.variantProvider.upsert({
                            where: {
                                providerCode_providerSku: {
                                    providerCode: 'APIGAMES',
                                    providerSku: sku
                                }
                            },
                            update: {
                                variantId: variant.id,
                                providerPrice: price,
                                providerStatus: status,
                                lastUpdated: new Date()
                            },
                            create: {
                                variantId: variant.id,
                                providerCode: 'APIGAMES',
                                providerSku: sku,
                                providerPrice: price,
                                providerStatus: status
                            }
                        });

                        allVariants.push(variant.id);
                        processedApi++;
                    }
                } else {
                    console.error('APIGames Error or Empty Data:', result);
                }
            } catch (e) {
                console.error("APIGames Sync Error", e);
            }
        }
    }

    // ---------------------------------------------------------
    // 4. Smart Routing Update (Calculate Best Price)
    // ---------------------------------------------------------
    // If we processed anything, we should re-calculate best prices for touched variants
    if (allVariants.length > 0) {
        const uniqueVariantIds = Array.from(new Set(allVariants));

        for (const variantId of uniqueVariantIds) {
            const providers = await prisma.variantProvider.findMany({
                where: { variantId: variantId, providerStatus: true },
                orderBy: { providerPrice: 'asc' } // Cheapest first
            });

            if (providers.length > 0) {
                const best = providers[0];
                const bestModal = Number(best.providerPrice);
                const bestSellPrice = Math.ceil(bestModal * (1 + marginPercent / 100));

                await prisma.productVariant.update({
                    where: { id: variantId },
                    data: {
                        bestProvider: best.providerCode,
                        originalPrice: bestModal,
                        price: bestSellPrice,
                        // Update SKU to match the best provider's SKU? 
                        // Often better to keep internal SKU stable, but for direct passthrough we might need provider SKU.
                        // We will store provider SKU in VariantProvider. 
                        // The main SKU can be the "Display" SKU or the Best Provider SKU.
                        // Let's update it to Best Provider SKU for simplicity in transaction flow.
                        sku: best.providerSku
                    }
                });
            }
        }
    }

    return NextResponse.json({
        success: true,
        message: `Sync Selesai. Digiflazz: ${processedDigi}, APIGames: ${processedApi}. Smart Routing Updated.`
    });
}
