import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { product_code } = await req.json();

        if (!product_code) {
            return NextResponse.json({ error: 'Product code required' }, { status: 400 });
        }

        // Get APIGames credentials (for future use if endpoint becomes available)
        const merchantData = await prisma.siteContent.findUnique({ where: { slug: 'apigames_merchant_id' } });
        const secretData = await prisma.siteContent.findUnique({ where: { slug: 'apigames_secret_key' } });

        if (!merchantData?.content || !secretData?.content) {
            return NextResponse.json({ error: 'APIGames credentials not configured' }, { status: 400 });
        }

        // ===== CRITICAL WARNING =====
        // APIGames does NOT have a dedicated "product info" endpoint!
        // The v2/transaksi endpoint EXECUTES REAL TRANSACTIONS and CHARGES BALANCE!
        // Every call to v2/transaksi creates a real transaction and deducts from balance
        // For safety, we ONLY use manual product name inference from product code
        // ============================

        console.log(`Manual product name inference for code: ${product_code}`);

        // Try to infer product name from code
        const inferredName = inferProductName(product_code);

        if (inferredName) {
            return NextResponse.json({
                success: true,
                name: inferredName,
                base_price: 0, // Manual input required
                status: 'manual_entry',
                warning: 'Product name auto-detected from code. Please enter price manually based on your APIGames pricing.'
            });
        }

        // If cannot infer, return generic name with product code
        return NextResponse.json({
            success: true,
            name: `Product ${product_code}`,
            base_price: 0,
            status: 'manual_entry',
            warning: 'Could not auto-detect product name. Please enter product name and price manually.'
        });

    } catch (error: any) {
        console.error('Error validating product:', error);
        return NextResponse.json({ error: error.message || 'Failed to validate product' }, { status: 500 });
    }
}

// Helper function to infer product name from code
function inferProductName(code: string): string | null {
    const upperCode = code.toUpperCase();

    // Mobile Legends
    if (upperCode.startsWith('ML')) {
        const amount = upperCode.replace('ML', '').replace(/[^0-9]/g, '');
        return amount ? `Mobile Legends ${amount} Diamonds` : 'Mobile Legends';
    }

    // Free Fire
    if (upperCode.startsWith('FF')) {
        const amount = upperCode.replace('FF', '').replace(/[^0-9]/g, '');
        return amount ? `Free Fire ${amount} Diamonds` : 'Free Fire';
    }

    // PUBG Mobile
    if (upperCode.includes('PUBG')) {
        const amount = upperCode.replace(/[^0-9]/g, '');
        return amount ? `PUBG Mobile ${amount} UC` : 'PUBG Mobile';
    }

    // Genshin Impact
    if (upperCode.includes('GENSHIN') || upperCode.includes('GI')) {
        const amount = upperCode.replace(/[^0-9]/g, '');
        return amount ? `Genshin Impact ${amount} Genesis Crystals` : 'Genshin Impact';
    }

    // Valorant
    if (upperCode.includes('VALORANT') || upperCode.includes('VAL')) {
        const amount = upperCode.replace(/[^0-9]/g, '');
        return amount ? `Valorant ${amount} VP` : 'Valorant';
    }

    return null;
}
