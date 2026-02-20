
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    console.log(`Checking orders for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            orders: {
                select: {
                    status: true,
                    invoiceCode: true,
                    createdAt: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`Total Orders: ${user.orders.length}`);

    const statusCounts = {};
    user.orders.forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    console.log('Status Distribution:', statusCounts);

    // Check specific "Successful" candidates
    const successfulCandidates = ['PAID', 'DELIVERED', 'SUCCESS', 'COMPLETED'];
    let potentialSuccessCount = 0;

    successfulCandidates.forEach(s => {
        if (statusCounts[s]) {
            potentialSuccessCount += statusCounts[s];
        }
    });

    console.log(`Potential Success Count (PAID+DELIVERED+SUCCESS+COMPLETED): ${potentialSuccessCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
