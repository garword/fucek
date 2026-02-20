
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

export async function getDigiflazzConfig() {
    const username = await prisma.siteContent.findUnique({
        where: { slug: 'digiflazz_username' }
    });
    const apiKey = await prisma.siteContent.findUnique({
        where: { slug: 'digiflazz_key' }
    });

    if (!username || !apiKey || !username.content || !apiKey.content) return null;

    return {
        username: username.content,
        apiKey: apiKey.content
    };
}

export async function createDigiflazzOrder(config: { username: string; apiKey: string }, params: {
    buyerSkuCode: string;
    customerNo: string;
    refId: string;
}) {
    const sign = createHash('md5')
        .update(config.username + config.apiKey + params.refId)
        .digest('hex');

    const payload = {
        username: config.username,
        buyer_sku_code: params.buyerSkuCode,
        customer_no: params.customerNo,
        ref_id: params.refId,
        sign: sign
    };

    console.log('[Digiflazz] Request:', payload);

    const response = await fetch('https://api.digiflazz.com/v1/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('[Digiflazz] Response:', data);

    return data;
}
