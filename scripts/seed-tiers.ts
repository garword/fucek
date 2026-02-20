
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTiers() {
    const tiers = [
        { name: 'Bronze', minTrx: 0, marginPercent: 10 },
        { name: 'Silver', minTrx: 2, marginPercent: 8 },
        { name: 'Gold', minTrx: 10, marginPercent: 6 },
        { name: 'Platinum', minTrx: 50, marginPercent: 4 },
        { name: 'Diamond', minTrx: 100, marginPercent: 2 },
    ];

    console.log('Seeding Tiers...');

    for (const tier of tiers) {
        await prisma.tierConfig.upsert({
            where: { name: tier.name },
            update: {
                minTrx: tier.minTrx,
                // Only update margin if it's 0 (new) to avoid overwriting user settings?
                // Actually user wants these specific defaults.
            },
            create: {
                name: tier.name,
                minTrx: tier.minTrx,
                marginPercent: tier.marginPercent
            }
        });
        console.log(`- ${tier.name} (Min ${tier.minTrx} Trx)`);
    }

    console.log('✅ Tiers seeded successfully');
}

seedTiers()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
