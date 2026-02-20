
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating Tier Configurations...');

    const tiers = [
        { name: 'Bronze', minTrx: 0, marginPercent: 10 },  // Reverted to 10% (Base Price)
        { name: 'Silver', minTrx: 2, marginPercent: 8 },  // Discounted
        { name: 'Gold', minTrx: 10, marginPercent: 6 },
        { name: 'Platinum', minTrx: 50, marginPercent: 4 },
        { name: 'Diamond', minTrx: 100, marginPercent: 2 },
    ];

    for (const t of tiers) {
        const existing = await prisma.tierConfig.findUnique({
            where: { name: t.name }
        });

        if (existing) {
            await prisma.tierConfig.update({
                where: { name: t.name },
                data: { marginPercent: t.marginPercent, minTrx: t.minTrx }
            });
            console.log(`Updated ${t.name} to Margin ${t.marginPercent}%`);
        } else {
            await prisma.tierConfig.create({
                data: {
                    name: t.name,
                    minTrx: t.minTrx,
                    marginPercent: t.marginPercent,
                    isActive: true
                }
            });
            console.log(`Created ${t.name}`);
        }
    }

    console.log('Tier update complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
