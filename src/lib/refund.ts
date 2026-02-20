
import prisma from '@/lib/prisma';

/**
 * Process a full refund for an order.
 * - Marks order as CANCELED.
 * - Credits the user's balance.
 * - Records a REFUND transaction.
 */
export async function refundOrder(orderId: string, reason: string = 'System Refund') {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true }
        });

        if (!order) {
            console.error(`Refund Error: Order ${orderId} not found`);
            return { success: false, error: 'Order not found' };
        }

        // Check if already processed
        if (order.status === 'CANCELED' || order.status === 'REFUNDED') {
            console.log(`Refund Info: Order ${orderId} already canceled/refunded`);
            return { success: true, message: 'Already refunded' };
        }

        // If delivered, we usually shouldn't refund automatically unless specific logic
        if (order.status === 'DELIVERED') {
            console.warn(`Refund Warning: Attempting to refund DELIVERED order ${orderId}`);
            // Proceed with caution or return error? User said "If failed... refund". 
            // If marked delivered but then provider sends Fail, we MUST refund.
        }

        const refundAmount = Number(order.totalAmount);

        await prisma.$transaction(async (tx) => {
            // 1. Update Order Status
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'CANCELED',
                    // Append reason to note? Order doesn't have a note field usually, maybe creating one or using orderItems
                }
            });

            // 2. Credit User Balance
            // We use the ID to lock the user record if possible, transaction handles it.
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
                    balanceBefore: Number(user.balance) - refundAmount, // approx
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
        return { success: false, error: 'Internal Error' };
    }
}
