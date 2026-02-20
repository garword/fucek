
import { PrismaClient } from '@prisma/client';
import { getUserTier } from '../src/lib/tiers';

const prisma = new PrismaClient();

async function main() {
    const email = 'test_platinum@example.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log(`Checking Tier for ${user.username} (${user.email})`);

    // Count Orders manually
    const count = await prisma.order.count({
        where: { userId: user.id, status: 'SUCCESS' }
    });
    console.log(`Manual Order Count (SUCCESS): ${count}`);

    // Get Tier via Library
    const tier = await getUserTier(user.id);
    console.log(`Calculated Tier: ${tier.name}`);
    console.log(`Tier Details:`, tier);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
