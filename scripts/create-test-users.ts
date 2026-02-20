
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Creating Test Users for Each Tier...');

    // 1. Get Active Tiers
    // @ts-ignore
    const tiers = await prisma.tierConfig.findMany({
        where: { isActive: true },
        orderBy: { minTrx: 'asc' }
    });

    if (tiers.length === 0) {
        console.log('⚠️ No active tiers found in DB. Using defaults.');
        // Add defaults if needed, or just exit. 
        // Assuming seeded.
    }

    const passwordHash = await hash('password123', 12);

    for (const tier of tiers) {
        const username = `test_${tier.name.toLowerCase()}`;
        const email = `${username}@example.com`;

        console.log(`\n👤 Processing User: ${username} (Target Tier: ${tier.name})`);
        console.log(`   Requirement: ${tier.minTrx} Transactions`);

        // 1. Upsert User
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                passwordHash,
                role: 'USER',
                name: `Member ${tier.name}`
            },
            create: {
                email,
                username,
                passwordHash,
                name: `Member ${tier.name}`,
                role: 'USER'
            }
        });

        // 2. Count existing success orders
        const currentTrx = await prisma.order.count({
            where: { userId: user.id, status: 'SUCCESS' }
        });

        const needed = tier.minTrx - currentTrx;

        if (needed > 0) {
            console.log(`   Creating ${needed} dummy orders to reach tier...`);

            // Create dummy orders in batch
            // Prisma doesn't support createMany with relations well for this case efficiently in loop vs array
            // We'll just loop, it's a script.
            for (let i = 0; i < needed; i++) {
                await prisma.order.create({
                    data: {
                        userId: user.id,
                        status: 'SUCCESS',
                        subtotalAmount: 10000,
                        totalAmount: 10000,
                        invoiceCode: `INV-DUMMY-${tier.name}-${Date.now()}-${i}`
                    }
                });
            }
            console.log(`   ✅ Created ${needed} orders.`);
        } else {
            console.log(`   ✅ User already has ${currentTrx} orders (Target: ${tier.minTrx}).`);
        }
    }

    console.log('\n✨ All Test Users Created Successfully!');
    console.log('------------------------------------------------');
    tiers.forEach(t => {
        console.log(`User: test_${t.name.toLowerCase()}@example.com | Pass: password123 | Tier: ${t.name} (${t.minTrx} Trx)`);
    });
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
