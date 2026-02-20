
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            imageUrl: true,
            variants: {
                select: {
                    id: true,
                    name: true
                }
            }
        },
        take: 10
    });

    console.log('--- Checking Product Images (First 10) ---');
    products.forEach(p => {
        console.log(`[${p.id}] ${p.name}`);
        console.log(`   Image URL: "${p.imageUrl}"`);
        console.log(`   Variants: ${p.variants.length}`);
    });
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
