
import crypto from 'crypto';
import prisma from '@/lib/prisma';

interface APIGamesConfig {
    merchantId: string;
    secretKey: string;
}

export async function getAPIGamesConfig(): Promise<APIGamesConfig | null> {
    const merchant = await prisma.siteContent.findUnique({ where: { slug: 'apigames_merchant_id' } });
    const secret = await prisma.siteContent.findUnique({ where: { slug: 'apigames_secret_key' } });

    if (!merchant?.content || !secret?.content) return null;

    return {
        merchantId: merchant.content,
        secretKey: secret.content
    };
}

export async function createAPIGamesOrder(
    config: APIGamesConfig,
    data: {
        code: string;
        target: string;
        refId: string; // Must be UNIQUE
        serverId?: string;
    }
) {
    const { merchantId, secretKey } = config;
    const { code, target, refId, serverId = '' } = data;

    // Signature formula for Transaction: md5(merchant_id:secret_key:ref_id)
    const signature = crypto.createHash('md5')
        .update(`${merchantId}:${secretKey}:${refId}`)
        .digest('hex');

    const payload = {
        ref_id: refId,
        merchant_id: merchantId,
        produk: code,
        tujuan: target,
        server_id: serverId,
        signature: signature
    };

    try {
        const response = await fetch('https://v1.apigames.id/v2/transaksi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resJson = await response.json();
        const responseData = resJson.data;

        // Map status
        // APIGames returns: "Pending", "Proses", "Sukses", "Gagal", "Validasi Provider"
        // We map to our internal providerStatus
        let status = 'PENDING';
        if (resJson.status === 1) {
            const apiStatus = responseData?.status?.toLowerCase();
            if (apiStatus === 'sukses') status = 'SUCCESS';
            else if (apiStatus === 'gagal') status = 'FAILED';
            else status = 'PROCESSING'; // Pending, Proses, Validasi Provider -> PROCESSING
        } else {
            status = 'FAILED';
        }

        return {
            success: resJson.status === 1,
            status: status,
            sn: responseData?.sn || '',
            message: responseData?.message || resJson.error_msg || 'Unknown error',
            trxId: responseData?.trx_id || '',
            raw: resJson
        };

    } catch (error: any) {
        console.error('APIGames Error:', error);
        return {
            success: false,
            status: 'FAILED',
            message: error.message || 'Connection Error',
            raw: null
        };
    }
}

export async function checkAPIGamesStatus(
    config: APIGamesConfig,
    refId: string
) {
    const { merchantId, secretKey } = config;

    // Signature: md5(merchant_id:secret_key:ref_id)
    const signature = crypto.createHash('md5')
        .update(`${merchantId}:${secretKey}:${refId}`)
        .digest('hex');

    const url = new URL('https://v1.apigames.id/v2/transaksi/status');
    url.searchParams.append('merchant_id', merchantId);
    url.searchParams.append('ref_id', refId);
    url.searchParams.append('signature', signature);

    try {
        const response = await fetch(url.toString());
        const resJson = await response.json();

        // Response format:
        // { status: "Sukses", ... } (Directly in body or data? Docs say: Status Response: Sukses, Pending etc.)
        // But docs also say "Contoh Response" for status check is not explicitly shown JSON structure, 
        // usually it follows the general pattern. 
        // Let's assume standard response structure or flat based on "Status Response" list.
        // Actually, let's look at the docs again. 
        // "Web hook Body JSON" has "status": "Sukses".
        // The check status endpoint likely returns JSON with `status` field.

        // Based on typical APIGames behavior (and docs overlap):
        // resJson.data.status OR resJson.status (if simple)
        // Let's safe check both.

        const rawStatus = resJson.data?.status || resJson.status || 'Pending';
        const sn = resJson.data?.sn || resJson.sn || '';
        const message = resJson.data?.message || resJson.message || '';

        let mappedStatus = 'PENDING';
        const s = String(rawStatus).toLowerCase();

        if (s === 'sukses') mappedStatus = 'SUCCESS';
        else if (s === 'gagal') mappedStatus = 'FAILED';
        else if (s === 'proses' || s === 'validasi provider' || s === 'pending') mappedStatus = 'PROCESSING';

        return {
            status: mappedStatus,
            sn: sn,
            message: message,
            originalStatus: rawStatus
        };

    } catch (error: any) {
        return {
            status: 'ERROR', // Network error, don't fail transaction yet
            message: error.message
        };
    }
}
