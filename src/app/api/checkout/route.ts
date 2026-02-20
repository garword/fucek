
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { randomBytes } from 'crypto';
import { getPakasirConfig, createPakasirTransaction } from '@/lib/pakasir';
import { getTierPriceMap } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

function generateInvoiceCode() {
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `INV-RW-${Date.now().toString().slice(-6)}-${random}`;
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse Body
    const body = await req.json().catch(() => ({}));
    const { paymentMethod, items: directItems } = body;

    // Fix: session payload uses 'userId', not 'id'
    const userId = session.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh user data to check verification status and correct email
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Allow checkout if verified OR if email is the admin test account
    const isVerified = !!user.emailVerifiedAt;
    const isTestAccount = user.email === 'admin@example.com';

    if (!isVerified && !isTestAccount) {
        return NextResponse.json({ error: 'Email must be verified to checkout' }, { status: 403 });
    }

    try {
        let checkoutItems: any[] = [];
        let isDirectCheckout = false;

        if (directItems && Array.isArray(directItems) && directItems.length > 0) {
            // Direct Checkout
            isDirectCheckout = true;
            const variantIds = directItems.map((i: any) => i.variantId);
            const variants = await prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                include: { product: true }
            });

            checkoutItems = directItems.map((item: any) => {
                const variant = variants.find((v: { id: string }) => v.id === item.variantId);
                if (!variant) throw new Error(`Variant not found`);
                return {
                    variantId: item.variantId,
                    quantity: item.quantity,
                    target: item.target,
                    variant: variant,
                    // Mock ID for compatibility if needed, though mostly unused
                    id: 'direct-item'
                };
            });
        } else {
            // 1. Get Cart
            checkoutItems = await prisma.cartItem.findMany({
                where: { userId: userId },
                include: { variant: { include: { product: true } } }
            });

            if (checkoutItems.length === 0) {
                return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
            }
        }

        // Security: Filter Inactive Products/Variants
        const inactiveItems = checkoutItems.filter((item: any) => {
            // Ensure variant and product data exists
            if (!item.variant || !item.variant.product) return true;
            return !item.variant.isActive || !item.variant.product.isActive;
        });

        if (inactiveItems.length > 0) {
            const names = inactiveItems.map((i: any) => i.variant.name).join(', ');
            return NextResponse.json({ error: `Produk tidak tersedia (Non-Aktif): ${names}` }, { status: 400 });
        }



        // 2. Get Promo (Only for Cart for now? Or allow passing code for direct? Assuming no promo for direct for simplicity or handle later)
        // For now, CartMeta only exists for Cart logic. Direct checkout skips promo unless passed in body.
        // Keeping existing behavior: fetch CartMeta if exists (might apply to direct if user has promo in cart? No, unsafe).
        // Let's only apply promo if NOT direct checkout OR if we want to support it later.

        let discountAmount = 0;
        let appliedPromoCode = null;
        let cartMeta = null;

        if (!isDirectCheckout) {
            cartMeta = await prisma.cartMeta.findUnique({
                where: { userId: userId }
            });

            if (cartMeta?.promoCode) {
                const promo = await prisma.promoCode.findUnique({ where: { code: cartMeta.promoCode } });
                if (promo && promo.isActive) {
                    appliedPromoCode = promo;
                }
            }
        }

        // 3. Calculate Totals with Tier Pricing
        const variantIds = checkoutItems.map(item => item.variantId);
        const tierPriceMap = await getTierPriceMap(variantIds, userId);


        let subtotalAmount = 0;

        interface OrderItemData {
            variantId: string;
            productName: string;
            variantName: string;
            priceAtPurchase: number;
            quantity: number;
            subtotal: number;
            target?: string | null;
        }

        const orderItemsData: OrderItemData[] = [];


        for (const item of checkoutItems) {
            const tierPrice = tierPriceMap.get(item.variantId);
            const price = tierPrice !== undefined ? tierPrice : Number(item.variant.price);
            const subtotalItem = price * item.quantity;
            subtotalAmount += subtotalItem;

            orderItemsData.push({
                variantId: item.variantId,
                productName: item.variant.product.name,
                variantName: item.variant.name,
                priceAtPurchase: price,
                quantity: item.quantity,
                subtotal: subtotalItem,
                target: (item as any).target // Assuming target is in CartItem
            });
        }

        // Apply Discount
        if (appliedPromoCode) {
            const val = Number(appliedPromoCode.value);
            if (appliedPromoCode.type === 'FIXED') {
                discountAmount = val;
            } else {
                discountAmount = (subtotalAmount * val) / 100;
            }
            if (appliedPromoCode.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, Number(appliedPromoCode.maxDiscountAmount));
            }
        }

        const amountAfterDiscount = Math.max(0, subtotalAmount - discountAmount);
        const invoiceCode = generateInvoiceCode();

        // 4. Payment Gateway Logic
        let gatewayFee = 0;
        let totalAmount = amountAfterDiscount;
        let paymentMethodDb = 'qris';
        let statusDb = 'PENDING';
        let qrisString = null;
        let expiredAt = null;

        if (paymentMethod === 'balance') {
            paymentMethodDb = 'balance';
            statusDb = 'PROCESSING'; // Skip Pending
            // Zero Fee for Balance Payment
            totalAmount = amountAfterDiscount;

            // Pre-check balance (Optimistic)
            if (Number(user.balance) < totalAmount) {
                return NextResponse.json({ error: 'Saldo tidak mencukupi' }, { status: 400 });
            }
        } else {
            // Pakasir Logic (Existing)
            const gatewayConfig = await getPakasirConfig();

            if (gatewayConfig && gatewayConfig.isActive) {
                // Calculate Fee (ensure integers for Pakasir)
                const feePercent = (amountAfterDiscount * gatewayConfig.feePercentage) / 100;
                const feeFixed = Number(gatewayConfig.feeFixed);
                gatewayFee = Math.round(feePercent + feeFixed);
                totalAmount = Math.round(amountAfterDiscount + gatewayFee);

                // Call Pakasir API
                const pakasirRes = await createPakasirTransaction(gatewayConfig, {
                    orderId: invoiceCode,
                    amount: totalAmount
                });

                if (pakasirRes?.payment?.payment_number) {
                    qrisString = pakasirRes.payment.payment_number;
                    // Force 10-minute expiry for UI countdown
                    expiredAt = new Date(Date.now() + 10 * 60 * 1000);
                } else {
                    console.error('Pakasir Error:', pakasirRes);
                    return NextResponse.json({ error: 'Failed to generate QRIS' }, { status: 500 });
                }
            } else {
                // Return Error if Payment Gateway Unavailable
                return NextResponse.json({ error: 'Payment Gateway Unavailable' }, { status: 503 });
            }
        }

        // 5. Create Order Breakdown & Atomic Transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // If Balance Payment, Deduct Balance & Log
            if (paymentMethod === 'balance') {
                const freshUser = await tx.user.findUnique({ where: { id: userId } });
                if (!freshUser || Number(freshUser.balance) < totalAmount) {
                    throw new Error('Saldo tidak mencukupi saat proses transaksi');
                }

                // Deduct Balance
                const currentBalance = Number(freshUser.balance);
                const newBalance = currentBalance - totalAmount;

                await tx.user.update({
                    where: { id: userId },
                    data: { balance: newBalance }
                });

                // Log Transaction
                await tx.walletTransaction.create({
                    data: {
                        userId: userId,
                        type: 'PURCHASE',
                        amount: -totalAmount, // Negative
                        balanceBefore: currentBalance,
                        balanceAfter: newBalance,
                        referenceId: invoiceCode,
                        description: `Pembelian via Saldo (${invoiceCode})`
                    }
                });
            }

            const order = await tx.order.create({
                data: {
                    userId: userId,
                    invoiceCode,
                    subtotalAmount,
                    discountAmount,
                    totalAmount,
                    status: statusDb,
                    paymentMethod: paymentMethodDb,
                    paymentGatewayFee: gatewayFee,
                    qrisString: qrisString,
                    expiredAt: expiredAt,
                    promoSnapshot: appliedPromoCode ? JSON.stringify({ code: appliedPromoCode.code, discount: discountAmount }) : null,
                    orderItems: {
                        create: orderItemsData
                    }
                }
            });

            // Increment Promo Usage
            if (appliedPromoCode) {
                await tx.promoCode.update({
                    where: { id: appliedPromoCode.id },
                    data: { usageCount: { increment: 1 } }
                });
            }

            // Clear Cart
            await tx.cartItem.deleteMany({
                where: { userId: userId }
            });

            if (cartMeta) {
                await tx.cartMeta.delete({
                    where: { id: cartMeta.id }
                });
            }

            return order;
        });

        // Auto Fulfill if Balance Payment (Instant)
        if (paymentMethod === 'balance') {
            // We can run this async without awaiting if we want faster UI response, 
            // but awaiting ensures user sees "Success" immediately on redirect.
            const { fulfillOrder } = await import('@/lib/order-fulfillment');
            await fulfillOrder(result.id);
        }

        return NextResponse.json({ success: true, orderId: invoiceCode });

    } catch (error: any) {
        console.error('Checkout Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}


