import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
    const session = await getSession();
    const cartCount = session ? await prisma.cartItem.count({ where: { userId: session.userId } }) : 0;
    const wishlistCount = session ? await prisma.wishlistItem.count({ where: { userId: session.userId } }) : 0;

    let userBalance = 0;
    if (session) {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { balance: true }
        });
        userBalance = Number(user?.balance || 0);
    }

    // Fetch Site Identity
    const identitySetting = await prisma.siteSetting.findUnique({
        where: { key: "site_identity" }
    });

    // Default config if not set
    const identity = identitySetting ? JSON.parse(identitySetting.value) : {
        mode: "text",
        text: "STORE",
        subText: ".",
        imageUrl: "",
        imageAlt: "Store Logo",
        slogan: ""
    };

    return <NavbarClient session={session} cartCount={cartCount} wishlistCount={wishlistCount} userBalance={userBalance} identity={identity} />;
}
