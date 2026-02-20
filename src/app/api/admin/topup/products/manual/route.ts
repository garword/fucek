import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { sku, name, base_price, selling_price, category_name } = await req.json();

        if (!sku || !name || !base_price || !selling_price || !category_name) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // Check if product with this SKU already exists
        const existingVariant = await prisma.productVariant.findFirst({
            where: { sku: sku } as any
        });

        if (existingVariant) {
            return NextResponse.json({ error: 'Product with this SKU already exists' }, { status: 400 });
        }

        // Find or create category
        let category = await prisma.category.findFirst({
            where: { name: category_name }
        });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    name: category_name,
                    slug: category_name.toLowerCase().replace(/\s+/g, '-')
                }
            });
        }

        // Find or create product
        let product = await prisma.product.findFirst({
            where: {
                name: name,
                categoryId: category.id
            }
        });

        if (!product) {
            product = await prisma.product.create({
                data: {
                    name: name,
                    slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                    description: `${name} - APIGames`,
                    categoryId: category.id
                }
            });
        }

        // Create product variant
        const variant = await prisma.productVariant.create({
            data: {
                productId: product.id,
                name: name,
                price: selling_price,
                originalPrice: selling_price * 1.1, // Fake strikethrough price
                sku: sku,
                bestProvider: 'APIGAMES',
                stock: 999,
                durationDays: 0,
                warrantyDays: 0,
                isActive: true
            } as any
        });

        // Create variant provider entry
        await (prisma as any).variantProvider.create({
            data: {
                variantId: variant.id,
                providerCode: 'APIGAMES',
                providerSku: sku,
                providerPrice: base_price,
                providerStatus: true
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Product saved successfully',
            product: {
                id: product.id,
                variant_id: variant.id,
                name: name,
                sku: sku,
                selling_price: selling_price
            }
        });

    } catch (error: any) {
        console.error('Error saving manual product:', error);
        return NextResponse.json({ error: error.message || 'Failed to save product' }, { status: 500 });
    }
}
