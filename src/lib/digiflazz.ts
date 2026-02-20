import crypto from 'crypto';
import prisma from '@/lib/prisma';

interface DigiflazzConfig {
    username: string;
    key: string;
    webhookSecret?: string;
}

// Data Interfaces
export interface DigiflazzResponse {
    data?: any;
    message?: string; // Sometimes message is outside data? No, docs say mostly inside or wrapper.
    // But wrapper usually has data key.
}

interface TopupRequest {
    buyer_sku_code: string;
    customer_no: string;
    ref_id: string;
    testing?: boolean;
    msg?: string; // For compatibility
}

interface TopupResponse {
    success: boolean;
    data?: any;
    message?: string;
    rc?: string;
    sn?: string;
}

export async function getDigiflazzConfig(): Promise<DigiflazzConfig> {
    const username = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
    const key = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });
    const webhookSecret = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_webhook_secret' } });

    if (!username?.content || !key?.content) {
        throw new Error('Digiflazz Configuration Missing (Username or Key)');
    }

    return {
        username: username.content,
        key: key.content,
        webhookSecret: webhookSecret?.content || undefined
    };
}

export function generateSignature(username: string, key: string, refId: string): string {
    return crypto.createHash('md5').update(username + key + refId).digest('hex');
}

export function verifyWebhookSignature(rawBody: string, secret: string, signatureHeader: string): boolean {
    const calculatedSignature = crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
    const expectedHeader = `sha1=${calculatedSignature}`;

    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expectedHeader);

    // Constant-time comparison
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

// --- API Functions ---

/**
 * Generic POST request to Digiflazz
 */
async function postDigiflazz(endpoint: string, payload: any): Promise<any> {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (error: any) {
        console.error(`Digiflazz Error (${endpoint}):`, error);
        return { data: { rc: '99', message: error.message || 'Connection Error' } };
    }
}

/**
 * Cek Saldo
 * Endpoint: /cek-saldo
 */
export async function checkBalance(): Promise<number> {
    const config = await getDigiflazzConfig();
    const signature = crypto.createHash('md5').update(config.username + config.key + 'depo').digest('hex');
    const payload = {
        cmd: 'deposit',
        username: config.username,
        sign: signature
    };
    const res = await postDigiflazz('https://api.digiflazz.com/v1/cek-saldo', payload);
    return res.data?.deposit || 0;
}

/**
 * Daftar Harga
 * Endpoint: /price-list
 */
export async function getPriceList(cmd: 'prepaid' | 'pasca' = 'prepaid', code?: string): Promise<any[]> {
    const config = await getDigiflazzConfig();
    const signature = crypto.createHash('md5').update(config.username + config.key + 'pricelist').digest('hex');
    const payload: any = {
        cmd,
        username: config.username,
        sign: signature
    };
    if (code) payload.code = code;

    const res = await postDigiflazz('https://api.digiflazz.com/v1/price-list', payload);

    if (res.data && Array.isArray(res.data)) {
        return res.data;
    }

    // If not array, it's likely an error object or empty
    throw new Error(res.data?.message || 'Failed to fetch price list (Invalid Format)');
}

/**
 * Request Deposit
 * Endpoint: /deposit
 */
export async function requestDeposit(amount: number, bank: string, ownerName: string): Promise<any> {
    const config = await getDigiflazzConfig();
    const signature = crypto.createHash('md5').update(config.username + config.key + 'deposit').digest('hex');
    const payload = {
        username: config.username,
        amount,
        Bank: bank,
        owner_name: ownerName,
        sign: signature
    };
    const res = await postDigiflazz('https://api.digiflazz.com/v1/deposit', payload);
    return res.data;
}

/**
 * Inquiry PLN (Cek Nama)
 * Endpoint: /inquiry-pln
 */
export async function inquiryPln(customerNo: string): Promise<any> {
    const config = await getDigiflazzConfig();
    const signature = crypto.createHash('md5').update(config.username + config.key + customerNo).digest('hex');
    const payload = {
        username: config.username,
        customer_no: customerNo,
        sign: signature
    };
    const res = await postDigiflazz('https://api.digiflazz.com/v1/inquiry-pln', payload);
    return res.data;
}

/**
 * Transaction (Topup / Payment / Check Status)
 * Endpoint: /transaction
 */
export async function transaction(params: {
    buyer_sku_code: string;
    customer_no: string;
    ref_id: string;
    commands?: string; // 'pay-pasca', 'inq-pasca', 'status-pasca'
    testing?: boolean;
    max_price?: number;
    cb_url?: string; // Callback URL
    allow_dot?: boolean;
}): Promise<any> {
    const config = await getDigiflazzConfig();
    const signature = generateSignature(config.username, config.key, params.ref_id);

    const payload: any = {
        username: config.username,
        buyer_sku_code: params.buyer_sku_code,
        customer_no: params.customer_no,
        ref_id: params.ref_id,
        sign: signature,
        testing: params.testing
    };

    if (params.commands) payload.commands = params.commands;
    if (params.max_price) payload.max_price = params.max_price;
    if (params.cb_url) payload.cb_url = params.cb_url;
    if (params.allow_dot) payload.allow_dot = params.allow_dot;

    const res = await postDigiflazz('https://api.digiflazz.com/v1/transaction', payload);
    return res; // Returns full response object, containing data
}

// --- Convenience Wrappers (Backward Compatibility) ---

/**
 * Topup (Prepaid)
 */
export async function topupDigiflazz(params: TopupRequest): Promise<TopupResponse> {
    try {
        const res = await transaction({
            buyer_sku_code: params.buyer_sku_code,
            customer_no: params.customer_no,
            ref_id: params.ref_id,
            testing: params.testing
        });

        // Parse Standard Response
        if (res.data) {
            const { rc, message, status, sn } = res.data;
            // RC 00: Sukses, 03: Pending. Both are "Accepted".
            const isSuccess = rc === '00';
            const isPending = rc === '03'; // Pending is OK for topup initiation

            // Allow 00 (Success) or 03 (Pending) as a successful "initiation"
            if (isSuccess || isPending) {
                return { success: true, data: res.data, message: message || 'Transaction Processed', rc, sn };
            }
            return { success: false, data: res.data, message: message || 'Transaction Failed', rc };
        }

        return { success: false, message: 'Invalid Response from Digiflazz', data: res };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Check Transaction Status
 * Supports both Prepaid (by re-sending request) and Postpaid (via status-pasca)
 */
export async function checkDigiflazzStatus(payload: {
    buyer_sku_code: string;
    customer_no: string;
    ref_id: string;
    isPostpaid?: boolean; // NEW: Distinguish logic
}): Promise<any> {
    const commands = payload.isPostpaid ? 'status-pasca' : undefined;

    // For Prepaid: Sending the same request again works as Status Check
    // For Postpaid: Use 'status-pasca' command

    // Note: If checking status, we might NOT want to re-trigger 'testing' mode if it was a test transaction?
    // But ref_id matches, so it's safe.

    const res = await transaction({
        buyer_sku_code: payload.buyer_sku_code,
        customer_no: payload.customer_no,
        ref_id: payload.ref_id,
        commands
    });

    return res; // Return full response
}
