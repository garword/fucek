
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServices, getMedanPediaConfig } from '@/lib/medanpedia';

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function getPlatform(categoryName: string): string {
    const lower = categoryName.toLowerCase();
    if (lower.includes('instagram')) return 'Instagram';
    if (lower.includes('youtube')) return 'Youtube';
    if (lower.includes('tiktok')) return 'TikTok';
    if (lower.includes('facebook')) return 'Facebook';
    if (lower.includes('twitter') || lower.includes('x ')) return 'Twitter';
    if (lower.includes('threads')) return 'Threads';
    if (lower.includes('telegram')) return 'Telegram';
    if (lower.includes('spotify')) return 'Spotify';
    if (lower.includes('google')) return 'Google';
    if (lower.includes('shopee')) return 'Shopee';
    if (lower.includes('tokopedia')) return 'Tokopedia';
    if (lower.includes('discord')) return 'Discord';
    if (lower.includes('netflix')) return 'Netflix';
    if (lower.includes('vidio')) return 'Vidio';
    if (lower.includes('twitch')) return 'Twitch';
    if (lower.includes('linkedin')) return 'LinkedIn';
    if (lower.includes('soundcloud')) return 'Soundcloud';
    if (lower.includes('pinterest')) return 'Pinterest';
    if (lower.includes('clubhouse')) return 'Clubhouse';
    if (lower.includes('website') || lower.includes('traffic')) return 'Website Traffic';
    return 'Other';
}

function getSubCategory(categoryName: string, platform: string): string {
    // Remove platform name from category to get sub-category
    // e.g. "Instagram Followers" -> "Followers"
    const regex = new RegExp(platform, 'gi');
    let sub = categoryName.replace(regex, '').trim();
    // Remove extra symbols like "-", ":", "[]"
    sub = sub.replace(/^[-:|]+/, '').trim();
    return sub || 'General';
}

export const dynamic = 'force-dynamic';
// Set max duration to avoid timeout during large sync
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const config = await getMedanPediaConfig();
        const services = await getServices();

        let createdProducts = 0;
        let createdVariants = 0;
        let updatedVariants = 0;

        // 1. Ensure "SMM" Category Exists
        let smmCategory = await prisma.category.findFirst({
            where: { type: 'SOSMED', name: 'SMM' }
        });

        if (!smmCategory) {
            // Check if there is a 'Social Media' category
            smmCategory = await prisma.category.findFirst({
                where: { type: 'SOSMED', name: 'Social Media' }
            });

            if (!smmCategory) {
                smmCategory = await prisma.category.create({
                    data: {
                        name: 'SMM',
                        slug: 'smm-services',
                        type: 'SOSMED',
                        iconKey: 'users'
                    }
                });
            }
        }

        // 2. Group Services by Platform
        const platforms: Record<string, any[]> = {};
        for (const service of services) {
            const platform = getPlatform(service.category);
            if (!platforms[platform]) platforms[platform] = [];
            platforms[platform].push(service);
        }

        // 3. Process Each Platform
        for (const platform of Object.keys(platforms)) {
            const platformServices = platforms[platform];

            // Create/Update Product for this Platform
            const productSlug = slugify(platform);
            const productName = platform;

            let product = await prisma.product.findFirst({
                where: {
                    slug: productSlug,
                    category: { type: 'SOSMED' }
                },
                include: { variants: true }
            });

            if (!product) {
                // If not exists by slug, try by name to be safe
                product = await prisma.product.findFirst({
                    where: {
                        name: productName,
                        category: { type: 'SOSMED' }
                    },
                    include: { variants: true }
                });
            }

            if (!product) {
                product = await prisma.product.create({
                    data: {
                        name: productName,
                        slug: productSlug,
                        description: `Layanan SMM untuk ${platform}. Pilih layanan yang Anda butuhkan.`,
                        categoryId: smmCategory.id,
                        isActive: true,
                        ratingValue: 5.0,
                        soldCount: 0,
                    },
                    include: { variants: true }
                });
                createdProducts++;
            } else {
                // Update existing product to ensure it's in the correct SMM category
                // This fixes the issue where products were stuck in "Instagram" category
                if (product.categoryId !== smmCategory.id) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { categoryId: smmCategory.id }
                    });
                }
            }

            // Sync Services as Variants
            for (const service of platformServices) {
                const subCategory = getSubCategory(service.category, platform);

                // Construct Variant Name: "[SubCategory] Service Name"
                // Used for frontend parsing
                const variantName = `[${subCategory}] ${service.name}`;

                // Calculate Price
                const basePrice = Number(service.price) / 1000;
                const sellingPrice = basePrice * (1 + config.marginPercent / 100);

                // Check if variant exists (by Provider SKU)
                // We need to look up via VariantProvider, but `product` include doesn't go deep reliably here without more queries.
                // Better strategy: Check if a variant with this providerSKU already exists attached to this product?
                // Or just find variant by name? Name might change.
                // Best: Find VariantProvider with code 'MEDANPEDIA' and sku = service.id

                const existingProvider = await prisma.variantProvider.findFirst({
                    where: {
                        providerCode: 'MEDANPEDIA',
                        providerSku: String(service.id),
                        variant: { productId: product.id }
                    },
                    include: { variant: true }
                });

                if (existingProvider) {
                    // Update
                    await prisma.productVariant.update({
                        where: { id: existingProvider.variantId },
                        data: {
                            name: variantName, // Update name if changed
                            price: sellingPrice,
                            stock: 999999,
                            isActive: true // Ensure active
                        }
                    });

                    await prisma.variantProvider.update({
                        where: { id: existingProvider.id },
                        data: {
                            providerPrice: service.price,
                            providerStatus: true
                        }
                    });
                    updatedVariants++;
                } else {
                    // Create New Variant
                    await prisma.productVariant.create({
                        data: {
                            productId: product.id,
                            name: variantName,
                            price: sellingPrice,
                            durationDays: 0,
                            warrantyDays: 0,
                            deliveryType: 'instant',
                            stock: 999999,
                            bestProvider: 'MEDANPEDIA',
                            providers: {
                                create: {
                                    providerCode: 'MEDANPEDIA',
                                    providerSku: String(service.id),
                                    providerPrice: service.price,
                                    providerStatus: true
                                }
                            }
                        }
                    });
                    createdVariants++;
                }
            }
        }

        // Optional: Deactivate variants that are no longer in the source?
        // That's complex for now.

        // 4. CLEANUP: Delete obsolete SMM products (e.g. old split products)
        // We only want to keep the Platform Products we just touched.
        // Be careful not to delete non-Medanpedia SOSMED products if possible, 
        // but for now we assume this sync manages the SOSMED catalog.

        const validPlatformNames = Object.keys(platforms);

        // Find products that are SOSMED but NOT in our valid platform list
        // and DELETE them to clean up the "Soundcloud Followers..." bloat.
        const obsoleteProducts = await prisma.product.findMany({
            where: {
                category: { type: 'SOSMED' },
                name: { notIn: validPlatformNames }
            },
            select: { id: true, name: true }
        });

        if (obsoleteProducts.length > 0) {
            console.log(`Cleaning up ${obsoleteProducts.length} obsolete SMM products...`);
            await prisma.product.deleteMany({
                where: {
                    id: { in: obsoleteProducts.map(p => p.id) }
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `Sync complete. Grouped into ${Object.keys(platforms).length} platforms. Created/Updated ${createdProducts} products, ${createdVariants} new variants, ${updatedVariants} updated variants. Cleaned ${obsoleteProducts.length} old products.`,
            platforms: Object.keys(platforms)
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
