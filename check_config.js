
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.systemConfig.findMany({
        where: {
            key: {
                in: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
            }
        }
    });
    console.log(JSON.stringify(configs, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
