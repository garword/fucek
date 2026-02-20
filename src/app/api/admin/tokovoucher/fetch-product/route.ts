import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getTokoVoucherConfig } from '@/lib/tokovoucher';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { productId } = await req.json();

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        const config = await getTokoVoucherConfig();

        if (!config) {
            return NextResponse.json({ error: 'TokoVoucher not configured or inactive' }, { status: 400 });
        }

        // Fetch product details from TokoVoucher
        // Note: /produk/code endpoint is at base URL without /v1/
        const baseUrlWithoutVersion = config.baseUrl.replace('/v1', '');
        const url = `${baseUrlWithoutVersion}/produk/code?member_code=${config.memberCode}&signature=${config.signatureDefault}&kode=${productId}`;

        console.log('[TokoVoucher Fetch Product] URL:', url.replace(config.signatureDefault, 'SIG***'));
        console.log('[TokoVoucher Fetch Product] Product Code:', productId);

        const response = await fetch(url);
        const data = await response.json();

        console.log('[TokoVoucher Fetch Product] Response:', data);

        // Check if data exists
        if (data.status !== 1 || !data.data || data.data.length === 0) {
            console.error('[TokoVoucher Fetch Product] Product not found:', data);
            return NextResponse.json({
                error: data.error_msg || 'Product not found or invalid code',
                debug: data
            }, { status: 404 });
        }

        // TokoVoucher returns array, usually we want exact match
        const product = data.data[0];

        // Find existing products for suggestion (by operator/category/name)
        // Enhance search to find similar names
        const existingProducts = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: product.operator_produk } },
                    { name: { contains: product.nama_produk } },
                    { category: { name: { contains: product.operator_produk } } }
                ],
                isDeleted: false
            },
            include: {
                category: true
            },
            take: 10
        });

        // Find suggested category
        const suggestedCategory = await prisma.category.findFirst({
            where: {
                OR: [
                    { name: { contains: product.operator_produk } },
                    { name: { contains: product.category_name } }
                ],
                type: 'GAME'
            }
        });

        return NextResponse.json({
            status: 1,
            data: product,
            suggestions: {
                existingProducts: existingProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    categoryName: p.category.name
                })),
                suggestedCategory: suggestedCategory ? {
                    id: suggestedCategory.id,
                    name: suggestedCategory.name
                } : null
            }
        });

    } catch (error) {
        console.error('[TokoVoucher Fetch] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch product: ' + (error as Error).message }, { status: 500 });
    }
}
