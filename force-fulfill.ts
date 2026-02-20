
import { fulfillOrder } from './src/lib/order-fulfillment';
import prisma from './src/lib/prisma';

async function main() {
    const code = 'INV-RW-682334-526AA8BD';
    console.log(`Forcing fulfillment for: ${code}`);

    // Get Order ID first as fulfillOrder prefers ID (though it handles code)
    const order = await prisma.order.findUnique({
        where: { invoiceCode: code }
    });

    if (!order) {
        console.error('Order not found');
        return;
    }

    const result = await fulfillOrder(order.id);
    console.log('Fulfillment Result:', result);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
