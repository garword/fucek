
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const code = 'INV-RW-623963-ECCF5089';
    console.log(`Checking order: ${code}`);

    const order = await prisma.order.findUnique({
        where: { invoiceCode: code },
        include: { orderItems: true }
    });

    if (!order) {
        console.log('Order not found!');
        return;
    }

    console.log('Current Status:', order.status);
    console.log('Created At:', order.createdAt);

    const now = new Date();
    const diff = now.getTime() - new Date(order.createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    console.log(`Age: ${minutes} minutes`);

    if (order.status === 'PROCESSING' && minutes > 10) {
        console.log('Order is stuck PROCESSING > 10 mins. Updating to CANCELED/REFUNDED...');
        // Manually update status for immediate relief
        // Note: We should ideally use the refund logic, but here raw DB update is faster for debug
        // We will just mark it CANCELED via prisma update here to show it works, 
        // but ideally we want the full refund logic.
        // Let's just update status to CANCELED and add balance manually if needed.
        // Or better, let's just trigger the status check endpoint via curl? 
        // No, let's update DB directly to be sure.

        /*
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELED' }
        });
        console.log('Updated to CANCELED.');
        */
        console.log('Please use the API endpoint to trigger full refund.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
