
import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/medanpedia';

export const dynamic = 'force-dynamic';
// Cache services for a short duration (e.g., 5 minutes) to avoid rate limits
// Since Next.js API routes are serverless, we might need a dedicated cache solution (e.g. Redis)
// But for now, we'll just fetch each time or rely on basic internal caching if feasible.
// Given strict "Realtime" requirement, we fetch.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Service ID required' }, { status: 400 });
    }

    try {
        const services = await getServices();
        const service = services.find((s: any) => String(s.id) === String(id));

        if (!service) {
            return NextResponse.json({ error: 'Service not found in MedanPedia' }, { status: 404 });
        }

        // Return relevant fields
        return NextResponse.json({
            success: true,
            data: {
                id: service.id,
                name: service.name,
                category: service.category,
                price: service.price,
                min: service.min,
                max: service.max,
                description: service.description || '-', // Some APIs return empty description
                // Note: Average time might be in a different field or handled differently
                // Verify the field name from a debug run if possible
                average_time: service.average_time || service.time || '-',
                rate: service.rate, // Price per 1000 usually
                refill: service.refill ? 'Available' : 'No Refill',
            }
        });

    } catch (error: any) {
        console.error('MedanPedia Check Service Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch service data' }, { status: 500 });
    }
}
