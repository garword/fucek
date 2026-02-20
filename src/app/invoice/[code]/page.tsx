
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import InvoiceClient from './InvoiceClient';

export default async function InvoicePage(props: { params: Promise<{ code: string }> }) {
    const params = await props.params;
    const session = await getSession();

    let order = await prisma.order.findUnique({
        where: { invoiceCode: params.code },
        include: {
            orderItems: { include: { variant: { include: { product: { include: { category: true } } } } } }
        }
    });

    // Fetch Wallet Icon (Global)
    const walletIconConfig = await prisma.siteContent.findUnique({ where: { slug: 'wallet_topup_icon' } });
    const walletIconUrl = walletIconConfig?.content || null;

    // Fallback: Check for Deposit (if code is a CUID/Deposit ID)
    let isDeposit = false;
    if (!order) {
        const deposit = await prisma.deposit.findUnique({
            where: { id: params.code },
            include: { user: true }
        });

        if (deposit) {
            isDeposit = true;
            // Map Deposit to Order Interface
            order = {
                id: deposit.id,
                userId: deposit.userId,
                invoiceCode: deposit.id, // Use ID as invoice code
                status: deposit.status === 'PAID' ? 'DELIVERED' : deposit.status,
                subtotalAmount: deposit.amount,
                discountAmount: 0,
                totalAmount: deposit.totalPay,
                paymentMethod: deposit.paymentMethod,
                paymentGatewayFee: deposit.feeAmount,
                qrisString: deposit.qrisString,
                expiredAt: deposit.expiredAt,
                createdAt: deposit.createdAt,
                updatedAt: deposit.updatedAt,
                deliveredAt: deposit.status === 'PAID' ? deposit.updatedAt : null,
                promoSnapshot: null,
                orderItems: [{
                    id: 'dep-' + deposit.id,
                    orderId: deposit.id,
                    variantId: 'deposit',
                    productName: 'Isi Saldo Wallet',
                    variantName: `Rp ${Number(deposit.amount).toLocaleString('id-ID')}`,
                    priceAtPurchase: deposit.amount,
                    quantity: 1,
                    subtotal: deposit.amount,
                    variant: {
                        id: 'deposit-var',
                        productId: 'deposit-prod',
                        name: `Rp ${Number(deposit.amount).toLocaleString('id-ID')}`,
                        price: deposit.amount,
                        product: {
                            id: 'deposit-prod',
                            name: 'Isi Saldo Wallet',
                            category: { type: 'WALLET' }
                        }
                    }
                }]
            } as any;
        }
    }

    if (!order) notFound();

    // Check if order contains sensitive products (DIGITAL or PULSA)
    // Wallet deposits are considered sensitive as they involve money, but "viewing" them is just an invoice.
    // We treat wallet as sensitive (must be owner).
    const hasSensitiveProducts = isDeposit || order.orderItems.some(item =>
        ['DIGITAL', 'PULSA'].includes(item.variant.product.category.type)
    );

    // Security Check for Sensitive Products
    if (hasSensitiveProducts) {
        // Must be logged in
        if (!session) {
            redirect('/login');
        }
        // Must be the owner
        if (order.userId !== session.userId) {
            // Return 403 Forbidden
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md text-center">
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
                        <p className="text-red-700">You do not have permission to view this invoice.</p>
                    </div>
                </div>
            );
        }
    }

    // Determine if user can view sensitive data
    const canViewSensitiveData = hasSensitiveProducts ? (session && order.userId === session.userId) : false;

    // Serialize Decimal to Number for Client Component
    const orderConfig = {
        ...order,
        subtotalAmount: Number(order.subtotalAmount),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        paymentGatewayFee: Number(order.paymentGatewayFee),
        orderItems: order.orderItems.map(item => ({
            ...item,
            priceAtPurchase: Number(item.priceAtPurchase),
            subtotal: Number(item.subtotal),
            variant: {
                ...item.variant,
                price: Number(item.variant.price),
                originalPrice: item.variant.originalPrice ? Number(item.variant.originalPrice) : null,
                // Include product data for warranty/expiry calculation
                product: item.variant.product ? {
                    id: item.variant.product.id,
                    name: item.variant.product.name,
                    slug: item.variant.product.slug,
                    warrantyInfo: item.variant.product.warrantyInfo,
                    imageUrl: item.variant.product.imageUrl,
                    category: {
                        type: item.variant.product.category.type
                    }
                } : null
            }
        }))
    };

    return <InvoiceClient orderConfig={orderConfig} canViewSensitiveData={canViewSensitiveData} walletIconUrl={walletIconUrl} />;
}
