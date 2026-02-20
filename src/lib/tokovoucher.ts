import crypto from 'crypto';

interface TokoVoucherConfig {
    memberCode: string;
    secretKey: string;
    signatureDefault: string;
    baseUrl: string;
}

interface TokoVoucherOrderParams {
    code: string;        // Product code (e.g., "FF5")
    target: string;      // User ID/No HP
    refId: string;       // Unique reference ID
    serverId?: string;   // Server ID (optional, for games)
}

interface TokoVoucherResponse {
    status: number | string;
    data?: {
        trx_id: string;
        ref_id: string;
        code: string;
        name: string;
        target: string;
        price: number;
        status: number | string;    // 0=pending, 1=success, 2=failed, or 'gagal' string
        sn?: string;
        message: string;
    };
    error_msg?: string;
    // Top-level fields for flat responses
    trx_id?: string;
    sn?: string;
    message?: string;
    ref_id?: string;
}

/**
 * Generate MD5 signature for TokoVoucher API
 * Formula: md5(MEMBER_CODE:SECRET:REF_ID)
 */
function generateSignature(config: TokoVoucherConfig, refId: string): string {
    const signatureString = `${config.memberCode}:${config.secretKey}:${refId}`;
    return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Create order transaction via TokoVoucher API
 * Uses POST request with JSON body
 */
export async function createTokoVoucherOrder(
    config: TokoVoucherConfig,
    params: TokoVoucherOrderParams
): Promise<TokoVoucherResponse> {
    const signature = generateSignature(config, params.refId);

    const payload = {
        ref_id: params.refId,
        produk: params.code,
        tujuan: params.target,
        server_id: params.serverId || '',
        member_code: config.memberCode,
        signature: signature,
    };

    console.log('[TokoVoucher] Request:', {
        ...payload,
        signature: signature.substring(0, 10) + '...' // Hide full signature
    });

    try {
        // Normalize baseUrl and ensure /v1 is present
        let cleanBaseUrl = config.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
        if (!cleanBaseUrl.endsWith('/v1')) {
            cleanBaseUrl += '/v1';
        }

        const response = await fetch(`${cleanBaseUrl}/transaksi`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        // Sanitize response - remove balance info
        const sanitizedData: any = {
            status: data.status,
            ref_id: data.ref_id,
            trx_id: data.trx_id || data.sn || '',
            produk: data.produk || '',
            sn: data.sn || '',
            message: data.message
                ? data.message.replace(/Saldo member tidak cukup/i, 'Proses Gagal').replace(/Sisa Saldo.*$/i, '').trim()
                : ''
        };

        console.log('[TokoVoucher] Response:', sanitizedData);

        return sanitizedData;
    } catch (error) {
        console.error('[TokoVoucher] Fetch Error:', error);
        return {
            status: 0,
            error_msg: 'Network error: ' + (error as Error).message
        };
    }
}

/**
 * Check transaction status via TokoVoucher API
 */
/**
 * Check transaction status via TokoVoucher API
 * Using GET Method on /transaksi endpoint as per documentation
 * Endpoint: https://api.tokovoucher.net/v1/transaksi?ref_id=...&member_code=...&signature=...
 */
export async function checkTokoVoucherStatus(
    config: TokoVoucherConfig,
    refId: string
): Promise<TokoVoucherResponse> {
    // Signature: md5(MEMBER_CODE:SECRET:REF_ID)
    const signature = generateSignature(config, refId);

    try {
        // Build URL for POST request to check transaction status
        // Normalize baseUrl to remove trailing slash and ensure /v1 is not duplicated
        let cleanBaseUrl = config.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes

        // If baseUrl doesn't end with /v1, add it
        if (!cleanBaseUrl.endsWith('/v1')) {
            cleanBaseUrl += '/v1';
        }

        const url = new URL(`${cleanBaseUrl}/transaksi/status`);

        // Use POST method with JSON body (not GET with query params)
        const payload = {
            ref_id: refId,
            member_code: config.memberCode,
            signature: signature
        };

        console.log(`[TokoVoucher] Checking status for ref_id: ${refId}`);

        const response = await fetch(url.toString(), {
            method: 'POST',  // Changed from GET to POST
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)  // Send as JSON body
        });

        if (!response.ok) {
            console.error('[TokoVoucher] HTTP Error:', response.status);
            return {
                status: 'pending',
                message: `HTTP Error: ${response.status}`
            };
        }

        const data = await response.json();

        // Sanitize response - remove balance info
        const sanitizedData: any = {
            status: data.status,
            ref_id: data.ref_id,
            trx_id: data.trx_id || data.sn || '',
            produk: data.produk || '',
            sn: data.sn || '',
            message: data.message
                ? data.message.replace(/Saldo member tidak cukup/i, 'Proses Gagal').replace(/Sisa Saldo.*$/i, '').trim()
                : ''
        };

        console.log('[TokoVoucher] Status Response:', sanitizedData);

        return sanitizedData;

    } catch (error) {
        console.error('[TokoVoucher] Status Check Error:', error);
        return {
            status: 0,
            error_msg: 'Network error: ' + (error as Error).message
        };
    }
}

/**
 * Get TokoVoucher configuration from database
 */
/**
 * Get TokoVoucher configuration from database
 */
export async function getTokoVoucherConfig(): Promise<TokoVoucherConfig | null> {
    const prisma = (await import('@/lib/prisma')).default;

    // Using PaymentGatewayConfig table (same structure as Pakasir)
    const config = await prisma.paymentGatewayConfig.findUnique({
        where: { name: 'tokovoucher' }
    });

    if (!config || !config.isActive) {
        return null;
    }

    // Parse combined key (SecretKey|SignatureDefault|BaseUrl)
    const fullKey = config.apiKey || '';
    const parts = fullKey.split('|');

    const secretKey = parts[0] || '';
    const signatureDefault = parts[1] || '';
    const baseUrl = parts[2] || 'https://api.tokovoucher.net'; // Fallback to default (no /v1)

    return {
        memberCode: config.slug || '',
        secretKey: secretKey,
        signatureDefault: signatureDefault,
        baseUrl: baseUrl,
    };
}

export interface TokoVoucherProduct {
    id: number;
    code: string;
    category_name: string;
    brand_name: string;
    product_name: string;
    price: number;
    status: number; // 1 = active, 0 = inactive
    desc: string;
}

/**
 * Fetch product list from TokoVoucher API
 * Endpoint: /produk
 * Signature: md5(member_code:secret:pricelist) - Assumption
 */
export async function getTokoVoucherProducts(config: TokoVoucherConfig): Promise<TokoVoucherProduct[]> {
    // According to docs, we should use the Default Signature
    const signature = config.signatureDefault;

    try {
        // Construct URL: Ensure we don't have double /v1 or missing /v1 issues
        // User docs say: https://api.tokovoucher.net/produk
        // Config might have /v1, so we clean it for this specific endpoint if needed
        let cleanBaseUrl = config.baseUrl;
        if (cleanBaseUrl.endsWith('/v1')) {
            cleanBaseUrl = cleanBaseUrl.replace('/v1', '');
        }

        const url = new URL(`${cleanBaseUrl}/produk`);
        url.searchParams.append('member_code', config.memberCode);
        url.searchParams.append('signature', signature);

        console.log(`[TokoVoucher] Fetching products from ${url.toString()}...`);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        // Debug: Log the raw text response
        const rawText = await res.text();
        console.log('[TokoVoucher] Raw Response:', rawText);

        if (!res.ok) {
            console.error('[TokoVoucher] HTTP Error:', res.status, res.statusText);
            throw new Error(`HTTP Error: ${res.status}`);
        }

        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            throw new Error('Invalid JSON response from TokoVoucher');
        }

        // Handle error responses
        if (result.status === 0 || result.error_msg) {
            console.error('[TokoVoucher] API Error:', result);
            throw new Error(result.error_msg || 'API returned error status');
        }

        // Handle the nested structure from TokoVoucher "All Data" endpoint
        // Response: { data: { produk: [], operator: [], category: [], jenis: [] } }
        if (result.data && Array.isArray(result.data.produk)) {
            const rawProducts = result.data.produk;
            const operators = result.data.operator || [];
            const categories = result.data.category || [];

            // Build Lookup Maps
            const operatorMap = new Map<number, string>();
            operators.forEach((op: any) => operatorMap.set(op.id, op.nama));

            const categoryMap = new Map<number, string>();
            categories.forEach((cat: any) => categoryMap.set(cat.id, cat.nama));

            // Map products to internal interface
            return rawProducts.map((p: any) => ({
                id: p.id,
                code: p.kode_produk,
                product_name: p.nama,
                price: p.price,
                status: p.status, // 1 = active, 0 = inactive
                desc: p.deskripsi,
                // Enrich with relational data
                brand_name: operatorMap.get(p.operator_id) || 'Unknown Brand',
                category_name: categoryMap.get(p.kategori_id) || 'Unknown Category',
                // Keep raw IDs just in case
                operator_id: p.operator_id,
                category_id: p.kategori_id
            }));
        }

        // Fallback for flat array (if endpoint changes or legacy)
        if (Array.isArray(result.data)) {
            return result.data as TokoVoucherProduct[];
        } else if (Array.isArray(result)) {
            return result as TokoVoucherProduct[];
        } else {
            console.warn('[TokoVoucher] Unexpected data format:', result);
            return [];
        }

    } catch (error) {
        console.error('[TokoVoucher] Product Fetch Error:', error);
        return [];
    }
}
