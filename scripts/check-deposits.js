
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    console.log(`Checking DEPOSITS for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            deposits: {
                select: {
                    status: true,
                    amount: true,
                    createdAt: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`Total Deposits: ${user.deposits.length}`);

    const statusCounts = {};
    user.deposits.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });

    console.log('Deposit Status Distribution:', statusCounts);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
