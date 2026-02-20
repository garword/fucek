
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { subHours, subDays, subMonths, format } from 'date-fns';

export const dynamic = 'force-dynamic';

type ChartData = {
    labels: string[];
    data: number[];
};

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '24h';

    const now = new Date();
    let startDate: Date;
    let dateFormat: string;

    // Define aggregations based on period
    switch (period) {
        case '24h':
            startDate = subHours(now, 24);
            dateFormat = 'HH:00';
            break;
        case '7d':
            startDate = subDays(now, 7);
            dateFormat = 'EEE'; // Mon, Tue...
            break;
        case '30d':
            startDate = subDays(now, 30);
            dateFormat = 'dd MMM'; // 01 Jan
            break;
        case '1y':
            startDate = subMonths(now, 12);
            dateFormat = 'MMM yyyy'; // Jan 2024
            break;
        default:
            startDate = subHours(now, 24);
            dateFormat = 'HH:00';
    }

    try {
        // Fetch raw orders (simpler to aggregate in JS for portability across DBs)
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate },
                status: { in: ['PAID', 'DELIVERED', 'SUCCESS', 'PROCESSING'] }, // Count only 'successful' or active orders
            },
            select: {
                createdAt: true,
                totalAmount: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Initialize aggregations map
        const dataMap = new Map<string, number>();

        // Populate map with 0 values to ensure all time slots exist
        if (period === '24h') {
            for (let i = 0; i < 24; i++) {
                const date = subHours(now, i);
                dataMap.set(format(date, dateFormat), 0);
            }
        } else if (period === '7d' || period === '30d') {
            const days = period === '7d' ? 7 : 30;
            for (let i = 0; i < days; i++) {
                const date = subDays(now, i);
                dataMap.set(format(date, dateFormat), 0);
            }
        } else if (period === '1y') {
            for (let i = 0; i < 12; i++) {
                const date = subMonths(now, i);
                dataMap.set(format(date, dateFormat), 0);
            }
        }

        // Aggregate Data
        orders.forEach(order => {
            let key = format(order.createdAt, dateFormat);
            const current = dataMap.get(key) || 0;
            dataMap.set(key, current + Number(order.totalAmount));
        });

        // Convert map to arrays and reverse logic if needed (Map iteration order is insertion order)
        // For 24h/7d etc we generated keys in reverse (now -> past). 
        // We want the chart to be Past -> Now.

        // Re-generate keys in correct order (Oldest -> Newest)
        const labels: string[] = [];
        const values: number[] = [];

        if (period === '24h') {
            for (let i = 23; i >= 0; i--) {
                const date = subHours(now, i);
                const key = format(date, dateFormat);
                labels.push(key);
                values.push(dataMap.get(key) || 0);
            }
        } else if (period === '1y') {
            for (let i = 11; i >= 0; i--) {
                const date = subMonths(now, i);
                const key = format(date, dateFormat);
                labels.push(key);
                values.push(dataMap.get(key) || 0);
            }
        } else {
            const days = period === '7d' ? 6 : (period === '30d' ? 29 : 23);
            for (let i = days; i >= 0; i--) {
                const date = subDays(now, i);
                const key = format(date, dateFormat);
                labels.push(key);
                values.push(dataMap.get(key) || 0);
            }
        }

        return NextResponse.json({ labels, data: values });

    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
