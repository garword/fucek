
const { PrismaClient } = require('@prisma/client');
const prismaClient = new PrismaClient();

async function main() {
    const slug = 'capcutpro';
    const product = await prismaClient.product.findUnique({
        where: { slug: slug },
    });
    console.log('Product found:', product);

    const all = await prismaClient.product.findMany();
    console.log('All slugs:', all.map((p: any) => p.slug));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prismaClient.$disconnect();
    });
