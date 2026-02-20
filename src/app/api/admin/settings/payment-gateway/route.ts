
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [config, iconContent] = await prisma.$transaction([
            prisma.paymentGatewayConfig.findUnique({ where: { name: 'pakasir' } }),
            prisma.siteContent.findUnique({ where: { slug: 'wallet_topup_icon' } })
        ]);

        return NextResponse.json({
            ...(config || {}),
            walletIconUrl: iconContent?.content || ''
        });
    } catch (error) {
        console.error('Error fetching Pakasir config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        // Transaction to update both config and icon
        const [config] = await prisma.$transaction([
            prisma.paymentGatewayConfig.upsert({
                where: { name: 'pakasir' },
                update: {
                    slug: data.slug,
                    apiKey: data.apiKey,
                    mode: data.mode,
                    feePercentage: parseFloat(data.feePercentage || 0),
                    feeFixed: data.feeFixed,
                    isActive: data.isActive
                },
                create: {
                    name: 'pakasir',
                    slug: data.slug,
                    apiKey: data.apiKey,
                    mode: data.mode || 'SANDBOX',
                    feePercentage: parseFloat(data.feePercentage || 0),
                    feeFixed: data.feeFixed,
                    isActive: data.isActive
                }
            }),
            prisma.siteContent.upsert({
                where: { slug: 'wallet_topup_icon' },
                update: { content: data.walletIconUrl || '', title: 'Wallet Topup Icon' },
                create: { slug: 'wallet_topup_icon', content: data.walletIconUrl || '', title: 'Wallet Topup Icon' }
            })
        ]);

        return NextResponse.json({ ...config, walletIconUrl: data.walletIconUrl });
    } catch (error) {
        console.error('Error saving Pakasir config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
