
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getPakasirConfig, createPakasirTransaction } from '@/lib/pakasir';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { amount } = await req.json();
        const depositAmount = Number(amount);

        if (!depositAmount || depositAmount < 1000) {
            return NextResponse.json({ error: 'Minimum deposit Rp 1.000' }, { status: 400 });
        }

        // 1. Get Fee Config
        // Future: Support 'provider' parameter to select generic gateway
        const gatewayConfig = await prisma.paymentGatewayConfig.findUnique({
            where: { name: 'pakasir' }
        });

        if (!gatewayConfig || !gatewayConfig.isActive) {
            return NextResponse.json({ error: 'Payment gateway unavailable' }, { status: 503 });
        }

        // 2. Calculate Fee (Dynamic)
        // Fee is charged ON TOP of deposit amount (User pays fee)
        const feePercent = (depositAmount * gatewayConfig.feePercentage) / 100;
        const feeFixed = Number(gatewayConfig.feeFixed);
        const totalFee = Math.ceil(feePercent + feeFixed);
        const totalPay = depositAmount + totalFee;

        // Generate Custom ID: DEPOSIT-RW-RANDOM
        const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
        const customId = `DEPOSIT-RW-${randomStr}`;

        // 3. Create Deposit Record
        const deposit = await prisma.deposit.create({
            data: {
                id: customId,
                userId: session.userId,
                amount: depositAmount,
                feeAmount: totalFee,
                totalPay: totalPay,
                status: 'PENDING',
                paymentMethod: 'QRIS'
            }
        });

        // 4. Call Pakasir
        // We use the Deposit ID (CUID) as the order identifier
        const pakasirRes = await createPakasirTransaction(gatewayConfig, {
            orderId: deposit.id,
            amount: totalPay
        });

        if (!pakasirRes?.payment?.payment_number) {
            // Rollback if failed? Or just leave as pending/failed
            await prisma.deposit.update({
                where: { id: deposit.id },
                data: { status: 'FAILED' }
            });
            console.error('Pakasir Error:', pakasirRes);
            return NextResponse.json({ error: 'Failed to generate QRIS' }, { status: 500 });
        }

        // 5. Update Deposit with QRIS
        await prisma.deposit.update({
            where: { id: deposit.id },
            data: {
                qrisString: pakasirRes.payment.payment_number,
                expiredAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins expiry
            }
        });

        return NextResponse.json({
            success: true,
            depositId: deposit.id,
            qris: pakasirRes.payment.payment_number,
            amount: depositAmount,
            fee: totalFee,
            total: totalPay,
            expiredAt: new Date(Date.now() + 10 * 60 * 1000)
        });

    } catch (error) {
        console.error('Deposit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
