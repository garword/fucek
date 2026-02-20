import { Order, OrderItem } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getUserTier } from '@/lib/tiers';
import AccountDashboard from '@/components/features/account/AccountDashboard';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
    const session = await getSession();
    if (!session?.userId) {
        redirect('/login?next=/account');
    }

    // Parallel Fetching
    const [user, tier, orders, deposits] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.userId } }),
        getUserTier(session.userId),
        prisma.order.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit history
            include: {
                orderItems: {
                    include: {
                        variant: true
                    }
                }
            }
        }),
        prisma.deposit.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
    ]);

    if (!user) {
        redirect('/login');
    }

    // Fetch reviews for these orders to check "Reviewed" status
    const orderIds = orders.map(o => o.id);
    const reviews = await prisma.review.findMany({
        where: {
            orderId: { in: orderIds },
            userId: session.userId
        },
        select: { orderId: true }
    });

    const reviewedOrderIds = new Set(reviews.map(r => r.orderId));

    // Serialize orders for Client Component
    const serializedOrders = orders.map((order: any) => ({
        ...order,
        isReviewed: reviewedOrderIds.has(order.id),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        expiredAt: order.expiredAt ? order.expiredAt.toISOString() : null,
        totalAmount: Number(order.totalAmount),
        subtotalAmount: Number(order.subtotalAmount),
        discountAmount: Number(order.discountAmount),
        paymentGatewayFee: Number(order.paymentGatewayFee),
        orderItems: order.orderItems.map((item: any) => ({
            ...item,
            priceAtPurchase: Number(item.priceAtPurchase),
            subtotal: Number(item.subtotal),
            variant: item.variant ? {
                ...item.variant,
                price: Number(item.variant.price),
                originalPrice: item.variant.originalPrice ? Number(item.variant.originalPrice) : null,
            } : null,
        })),
    }));

    // Serialize deposits
    const serializedDeposits = deposits.map((deposit: any) => ({
        ...deposit,
        createdAt: deposit.createdAt.toISOString(),
        updatedAt: deposit.updatedAt.toISOString(),
        expiredAt: deposit.expiredAt ? deposit.expiredAt.toISOString() : null,
        amount: Number(deposit.amount),
        feeAmount: Number(deposit.feeAmount),
        totalPay: Number(deposit.totalPay),
    }));

    // Serialize user for Client Component
    const serializedUser = {
        ...user,
        balance: Number(user.balance),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
        otpExpiresAt: user.otpExpiresAt ? user.otpExpiresAt.toISOString() : null,
        // Add other Date fields if necessary
    };

    return (
        <AccountDashboard
            user={serializedUser}
            tier={tier}
            orders={serializedOrders}
            deposits={serializedDeposits}
        />
    );
}
