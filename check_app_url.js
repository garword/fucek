
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.systemConfig.findUnique({
        where: { key: 'APP_URL' }
    });
    console.log('APP_URL:', config ? config.value : 'Not Set (using fallback)');

    // Also check if user accidentally put the full URL in APP_URL
    if (config && config.value.includes('/api/auth')) {
        console.warn('WARNING: APP_URL seems to contain the path, which causes double pathing!');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
