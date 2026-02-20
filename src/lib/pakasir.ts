
import { PrismaClient } from '@prisma/client';

import prisma from '@/lib/prisma';

export async function getPakasirConfig() {
    return await prisma.paymentGatewayConfig.findUnique({
        where: { name: 'pakasir' }
    });
}

export async function createPakasirTransaction(config: any, params: {
    orderId: string;
    amount: number;
}) {
    const payload = {
        project: config.slug,
        order_id: params.orderId,
        amount: Math.round(params.amount),
        api_key: config.apiKey,
    };

    console.log('[Pakasir] Request:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(
            'https://app.pakasir.com/api/transactioncreate/qris',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        );

        const data = await response.json();
        console.log('[Pakasir] Response:', JSON.stringify(data, null, 2));

        return data;
    } catch (error) {
        console.error('[Pakasir] Fetch Error:', error);
        return { error: 'Fetch failed' };
    }
}

export async function cancelPakasirTransaction(config: any, params: {
    orderId: string;
    amount: number;
}) {
    const response = await fetch(
        'https://app.pakasir.com/api/transactioncancel',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project: config.slug,
                order_id: params.orderId,
                amount: Math.round(params.amount),
                api_key: config.apiKey,
            }),
        }
    );

    return response.json();
}
