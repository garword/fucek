
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPakasirConfig } from '@/lib/pakasir';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { invoiceCode } = await req.json();

        if (!invoiceCode) {
            return NextResponse.json({ error: 'Invoice Code required' }, { status: 400 });
        }

        const config = await getPakasirConfig();

        if (!config || !config.apiKey || !config.slug) {
            return NextResponse.json({ error: 'Configuration missing' }, { status: 400 });
        }

        // Check if it's a Deposit
        let amount = 0;
        let isDeposit = false;

        if (invoiceCode.startsWith('DEPOSIT-RW-')) {
            isDeposit = true;
            const deposit = await prisma.deposit.findUnique({
                where: { id: invoiceCode }
            });

            if (!deposit) {
                return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
            }
            amount = Number(deposit.totalPay);
        } else {
            // Fetch Order
            const order = await prisma.order.findUnique({
                where: { invoiceCode: invoiceCode }
            });

            if (!order) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            }
            amount = Number(order.totalAmount);
        }

        // Call Pakasir Simulation API
        const response = await fetch('https://app.pakasir.com/api/paymentsimulation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                project: config.slug,
                order_id: invoiceCode,
                amount: amount,
                api_key: config.apiKey
            })
        });

        const data = await response.json();

        // Pakasir might return error in body even if status 200?
        // Let's pass it through
        return NextResponse.json(data);

    } catch (error) {
        console.error('Simulation Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
