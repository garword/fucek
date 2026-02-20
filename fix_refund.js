
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock refund logic since importing from src/lib in standalone script is hard with path aliases
async function refundOrder(orderId, reason) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true }
        });

        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'CANCELED' || order.status === 'REFUNDED') return { success: true };

        const refundAmount = Number(order.totalAmount);

        await prisma.$transaction(async (tx) => {
            // 1. Update Order Status
            await tx.order.update({
                where: { id: order.id },
                data: { status: 'CANCELED' }
            });

            // 2. Credit User Balance
            const user = await tx.user.update({
                where: { id: order.userId },
                data: {
                    balance: { increment: refundAmount }
                }
            });

            // 3. Create Wallet Transaction
            await tx.walletTransaction.create({
                data: {
                    userId: order.userId,
                    type: 'REFUND',
                    amount: refundAmount,
                    balanceBefore: Number(user.balance) - refundAmount,
                    balanceAfter: Number(user.balance),
                    referenceId: order.invoiceCode,
                    description: `Refund: ${reason}`
                }
            });
        });

        console.log(`Refund Success: Order ${order.invoiceCode} refunded. Amount: ${refundAmount}`);
        return { success: true };

    } catch (error) {
        console.error(`Refund Exception for ${orderId}:`, error);
        return { success: false, error: error.message };
    }
}

async function main() {
    const code = 'INV-RW-623963-ECCF5089';
    console.log(`Processing Refund for: ${code}`);

    const order = await prisma.order.findUnique({
        where: { invoiceCode: code }
    });

    if (!order) {
        console.log('Order not found!');
        return;
    }

    if (order.status === 'PROCESSING') {
        await refundOrder(order.id, 'Manual Fix for Timeout > 10 Minutes');
    } else {
        console.log('Order status is:', order.status);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
