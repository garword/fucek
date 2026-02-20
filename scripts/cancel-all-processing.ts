import { refundOrder } from '../src/lib/refund';
import prisma from '../src/lib/prisma';

async function main() {
    console.log('Fetching PROCESSING orders...');
    const orders = await prisma.order.findMany({
        where: { status: 'PROCESSING' }
    });

    console.log(`Found ${orders.length} PROCESSING orders.`);

    for (const order of orders) {
        console.log(`Refunding Order: ${order.invoiceCode} (ID: ${order.id})`);
        const result = await refundOrder(order.id, 'Manual Cancellation (User Request)');
        if (result.success) {
            console.log(`✅ Success: ${order.invoiceCode}`);
        } else {
            console.error(`❌ Failed: ${order.invoiceCode} - ${result.error}`);
        }
    }

    console.log('All done.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
