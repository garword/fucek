
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                orderItems: {
                    include: { variant: true }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const merchant = await prisma.siteContent.findUnique({ where: { slug: 'apigames_merchant_id' } });
        const secret = await prisma.siteContent.findUnique({ where: { slug: 'apigames_secret_key' } });

        if (!merchant?.content || !secret?.content) {
            return NextResponse.json({ error: 'Provider config missing' }, { status: 500 });
        }

        const updates = [];

        for (const item of order.orderItems) {
            if (item.variant.bestProvider === 'APIGAMES') {
                // Reconstruct Ref ID logic from transaction route
                const refId = `${order.invoiceCode}-${item.id.slice(-4)}`;
                const signature = crypto.createHash('md5').update(`${merchant.content}:${secret.content}:${refId}`).digest('hex');

                const url = `https://v1.apigames.id/v2/transaksi/status?merchant_id=${merchant.content}&ref_id=${refId}&signature=${signature}`;

                try {
                    const res = await fetch(url);
                    const resData = await res.json();

                    if (resData.status === 1 && resData.data) {
                        const status = resData.data.status; // "Sukses", "Pending", "Gagal", "Validasi Provider"
                        const sn = resData.data.sn;
                        const message = resData.data.message;

                        // Map Provider Status to our Schema
                        // We use the raw string from provider usually, or standardize it.
                        // APIGames: "Sukses", "Pending", "Gagal", "Proses"

                        await prisma.orderItem.update({
                            where: { id: item.id },
                            data: {
                                providerStatus: status,
                                sn: sn,
                                note: message
                            }
                        });
                        updates.push({ itemId: item.id, status, sn });
                    }
                } catch (err: any) {
                    console.error(`Check Status Error Item ${item.id}:`, err);
                }
            }
        }

        return NextResponse.json({ message: 'Sync complete', updates });

    } catch (error) {
        console.error('Check Status Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
