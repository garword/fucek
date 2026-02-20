
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.paymentGatewayConfig.findFirst({
        where: { name: 'pakasir' }
    });
    console.log('Pakasir Config:', config);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
