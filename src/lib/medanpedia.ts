
import crypto from 'crypto';
import prisma from '@/lib/prisma';

interface MedanPediaConfig {
    apiId: string;
    apiKey: string;
    marginPercent: number;
}

export interface MedanPediaResponse {
    status: boolean;
    data?: any;
    msg?: string;
    orders?: any; // For mass status
}

export async function getMedanPediaConfig(): Promise<MedanPediaConfig> {
    const apiId = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_api_id' } });
    const apiKey = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_api_key' } });
    const margin = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_margin_percent' } });

    if (!apiId?.content || !apiKey?.content) {
        throw new Error('MedanPedia Configuration Missing (API ID or Key)');
    }

    return {
        apiId: apiId.content,
        apiKey: apiKey.content,
        marginPercent: margin?.content ? Number(margin.content) : 10 // Default 10%
    };
}

async function postMedanPedia(endpoint: string, formParams: Record<string, any>): Promise<MedanPediaResponse> {
    try {
        const formData = new URLSearchParams();
        for (const key in formParams) {
            formData.append(key, String(formParams[key]));
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        const data = await res.json();
        return data;
    } catch (error: any) {
        console.error(`MedanPedia Error (${endpoint}):`, error);
        return { status: false, msg: error.message || 'Connection Error' };
    }
}

export async function checkBalance(): Promise<number> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/profile', {
        api_id: config.apiId,
        api_key: config.apiKey
    });

    if (res.status && res.data) {
        return Number(res.data.balance);
    }
    throw new Error(res.msg || 'Failed to check balance');
}

export async function getServices(): Promise<any[]> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/services', {
        api_id: config.apiId,
        api_key: config.apiKey
    });

    if (res.status && Array.isArray(res.data)) {
        return res.data;
    }
    throw new Error(res.msg || 'Failed to fetch services');
}

export async function createOrder(params: {
    serviceId: string | number;
    target: string;
    quantity: number;
    customComments?: string;
    customLink?: string;
}): Promise<{ id: string, msg: string }> {
    const config = await getMedanPediaConfig();
    const payload: any = {
        api_id: config.apiId,
        api_key: config.apiKey,
        service: params.serviceId,
        target: params.target,
        quantity: params.quantity
    };

    if (params.customComments) payload.custom_comments = params.customComments;
    if (params.customLink) payload.custom_link = params.customLink;

    const res = await postMedanPedia('https://api.medanpedia.co.id/order', payload);

    if (res.status && res.data?.id) {
        return { id: String(res.data.id), msg: res.msg || 'Order created' };
    }
    throw new Error(res.msg || 'Failed to create order');
}

export async function checkStatus(orderId: string): Promise<{ status: string, start_count: number, remains: number }> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/status', {
        api_id: config.apiId,
        api_key: config.apiKey,
        id: orderId
    });

    if (res.status && res.data) {
        return {
            status: res.data.status,
            start_count: Number(res.data.start_count),
            remains: Number(res.data.remains)
        };
    }
    throw new Error(res.msg || 'Failed to check status');
}

export async function refillOrder(orderId: string): Promise<{ id: string, msg: string }> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/refill', {
        api_id: config.apiId,
        api_key: config.apiKey,
        id_order: orderId
    });

    if (res.status && res.data?.id_refill) {
        return { id: String(res.data.id_refill), msg: res.msg || 'Refill request submitted' };
    }
    throw new Error(res.msg || 'Failed to request refill');
}

export async function checkRefillStatus(refillId: string): Promise<{ status: string }> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/refill_status', {
        api_id: config.apiId,
        api_key: config.apiKey,
        id_refill: refillId
    });

    if (res.status && res.data) {
        return {
            status: res.data.status,
            // Add other fields if needed
        };
    }
    throw new Error(res.msg || 'Failed to check refill status');
}
