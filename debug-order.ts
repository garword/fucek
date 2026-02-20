
import prisma from './src/lib/prisma';

async function main() {
    const code = 'INV-RW-682334-526AA8BD';
    console.log(`Checking order: ${code}`);

    const order = await prisma.order.findUnique({
        where: { invoiceCode: code },
        include: {
            orderItems: {
                include: {
                    variant: {
                        include: {
                            product: { include: { category: true } },
                            providers: true
                        }
                    }
                }
            }
        }
    });

    if (!order) {
        console.log('Order not found!');
    } else {
        console.log('Order Status:', order.status);
        console.log('Payment Method:', order.paymentMethod);
        console.log('Items:', JSON.stringify(order.orderItems.map(i => ({
            id: i.id,
            variantId: i.variantId,
            name: i.productName,
            category: i.variant.product.category.type,
            providerStatus: i.providerStatus,
            sn: i.sn,
            providers: i.variant.providers
        })), null, 2));

        if (order.orderItems.length > 0) {
            const variantId = order.orderItems[0].variantId;
            const stockCount = await prisma.digitalStock.count({
                where: {
                    variantId: variantId,
                    status: 'AVAILABLE'
                }
            });
            console.log(`\n[STOCK CHECK] Available Stock for Variant (${variantId}): ${stockCount}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
