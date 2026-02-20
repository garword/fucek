import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.paymentGatewayConfig.findUnique({
        where: { name: 'tokovoucher' }
    });

    if (!config) {
        return NextResponse.json({
            config: { name: 'tokovoucher', isActive: false }
        });
    }

    // Parse combined key (SecretKey|SignatureDefault|BaseUrl)
    const fullKey = config.apiKey || '';
    const parts = fullKey.split('|');

    const secretKey = parts[0] || '';
    const signatureDefault = parts[1] || '';
    const baseUrl = parts[2] || 'https://api.tokovoucher.net/v1';

    return NextResponse.json({
        config: {
            ...config,
            secretKey,
            signatureDefault,
            baseUrl
        }
    });
}

export async function POST(req: Request) {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { memberCode, secretKey, signatureDefault, baseUrl, isActive } = await req.json();

        // Validate required fields if active
        if (isActive && (!memberCode || !secretKey || !signatureDefault)) {
            return NextResponse.json({ error: 'Missing required credentials' }, { status: 400 });
        }

        // Combined API Key = "SECRET_KEY|SIGNATURE_DEFAULT|BASE_URL"
        // This is a workaround since PaymentGatewayConfig schema doesn't have dedicated fields
        const combinedKey = `${secretKey}|${signatureDefault}|${baseUrl || 'https://api.tokovoucher.net/v1'}`;

        const config = await prisma.paymentGatewayConfig.upsert({
            where: { name: 'tokovoucher' },
            update: {
                slug: memberCode,
                apiKey: combinedKey,
                isActive: isActive,
                updatedAt: new Date()
            },
            create: {
                name: 'tokovoucher',
                slug: memberCode,
                apiKey: combinedKey,
                isActive: isActive,
                feePercentage: 0,
                feeFixed: 0
            }
        });

        return NextResponse.json({ success: true, config });

    } catch (error) {
        console.error('Save Provider Config Error:', error);
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }
}
