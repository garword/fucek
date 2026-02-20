
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { subMinutes } from 'date-fns';

export const dynamic = 'force-dynamic';

// Database of Indonesian Names for realistic generation
const FIRST_NAMES = [
    "Adit", "Budi", "Citra", "Dian", "Eko", "Fajar", "Gilang", "Hesti", "Indah", "Joko",
    "Kiki", "Lia", "Mira", "Nina", "Omar", "Putri", "Qori", "Rendi", "Siti", "Tono",
    "Umar", "Vina", "Wawan", "Xena", "Yudi", "Zainal", "Agus", "Bayu", "Cahya", "Dewi",
    "Endah", "Farhan", "Gita", "Hendra", "Ika", "Jaya", "Kartika", "Lestari", "Mega", "Nanda",
    "Oscar", "Pratiwi", "Rizky", "Sari", "Tirta", "Utami", "Vicky", "Widya", "Yoga", "Zara"
];

const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateRandomName() {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
    return `${first} ${last}***`;
}


function getRandomTimeAgo() {
    // Weighted distribution for realistic "recent" feel (Max 5 minutes)
    const rand = Math.random();
    if (rand < 0.3) return "Baru saja"; // 30%
    return `${Math.floor(Math.random() * 5) + 1} menit lalu`; // 1-5 min
}

// ... (previous imports)

export async function GET() {
    try {
        // 1. Fetch Real Orders (Last 5 Success/Paid orders in last 24h)
        const realOrders = await prisma.order.findMany({
            where: {
                status: { in: ['PAID', 'SUCCESS', 'DELIVERED'] },
                createdAt: { gte: subMinutes(new Date(), 1440) } // Last 24h
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                orderItems: {
                    take: 1,
                    select: {
                        productName: true,
                        variantName: true,
                        variant: {
                            select: {
                                product: {
                                    select: {
                                        imageUrl: true,
                                        category: { select: { iconKey: true, type: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Map real orders to response format
        const mappedRealOrders = realOrders.map(order => {
            // Use user name or obfuscated email user
            let displayName = order.user?.name;
            if (!displayName && order.user?.email) {
                const emailName = order.user.email.split('@')[0];
                displayName = emailName.length > 3 ? `${emailName.substring(0, 3)}***` : `${emailName}***`;
            }
            if (!displayName) displayName = generateRandomName(); // Fallback

            // Calculate time string (Cap at 5 mins to satisfy "Fresh" requirement)
            const diffMins = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
            const displayMins = diffMins < 1 ? 0 : (diffMins > 5 ? Math.floor(Math.random() * 5) + 1 : diffMins);
            const timeAgo = displayMins === 0 ? "Baru saja" : `${displayMins} menit lalu`;

            // Get Image or Icon
            const item = order.orderItems[0];
            const imageUrl = item?.variant?.product?.imageUrl || null;
            const iconKey = item?.variant?.product?.category?.iconKey || null;
            const categoryType = item?.variant?.product?.category?.type || null;

            return {
                id: order.id,
                name: displayName,
                product: item ? `${item.productName}` : 'Produk',
                variant: item ? item.variantName : '',
                image: imageUrl,
                icon: iconKey,
                categoryType: categoryType,
                time: timeAgo,
                type: 'REAL'
            };
        });

        // 2. Determine how many fake orders needed (Target 10 total)
        const totalNeeded = 10;
        const fakeNeeded = Math.max(0, totalNeeded - mappedRealOrders.length);

        let mappedFakeOrders: any[] = [];

        if (fakeNeeded > 0) {
            // Fetch random active products for fake data
            const products = await prisma.product.findMany({
                where: { isActive: true, isDeleted: false },
                select: {
                    name: true,
                    imageUrl: true,
                    category: { select: { iconKey: true, type: true } },
                    variants: { take: 1, select: { name: true } }
                },
                take: 20 // Fetch pool to pick from
            });

            if (products.length > 0) {
                for (let i = 0; i < fakeNeeded; i++) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    mappedFakeOrders.push({
                        id: `fake-${i}-${Date.now()}`,
                        name: generateRandomName(),
                        product: product.name,
                        variant: product.variants[0]?.name || product.name,
                        image: product.imageUrl,
                        icon: product.category?.iconKey || null,
                        categoryType: product.category?.type || null,
                        time: getRandomTimeAgo(),
                        type: 'FAKE'
                    });
                }
            }
        }

        // 3. Merge and Sort/Shuffle
        const combined = [...mappedRealOrders, ...mappedFakeOrders];

        // Fisher-Yates Shuffle
        for (let i = combined.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [combined[i], combined[j]] = [combined[j], combined[i]];
        }

        return NextResponse.json(combined);

    } catch (error) {
        console.error("Error fetching recent sales:", error);
        return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
    }
}
