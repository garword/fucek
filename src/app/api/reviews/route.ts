import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch actual user data because session only has userId
        const user = await prisma.user.findUnique({
            where: { id: session.userId }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 401 });
        }

        const body = await req.json();
        const { productId, rating, comment } = body;

        if (!productId || !rating) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Verify purchase exists and is successful
        // We look for the most recent valid order item for this product
        const orderItem = await prisma.orderItem.findFirst({
            where: {
                order: {
                    userId: user.id,
                    status: { in: ["PAID", "DELIVERED", "SUCCESS", "PROCESSING"] }
                },
                variant: {
                    productId: productId
                }
            },
            orderBy: {
                order: { createdAt: 'desc' } // Get latest purchase
            },
            include: {
                order: true
            }
        });

        if (!orderItem) {
            return NextResponse.json({ error: "Kamu harus membeli produk ini dulu sebelum memberi ulasan (Status harus PAID/DELIVERED/SUCCESS)." }, { status: 403 });
        }

        // Check if user has reviewed this PRODUCT before (regardless of orderId)
        const existingReview = await prisma.review.findFirst({
            where: {
                productId: productId,
                userId: user.id
            }
        });

        let review;

        if (existingReview) {
            // UPSERT: Update existing review with new data + link to NEW orderId
            review = await prisma.review.update({
                where: { id: existingReview.id },
                data: {
                    rating: Number(rating),
                    comment,
                    orderId: orderItem.orderId, // Update to latest order
                    createdAt: new Date(), // Refresh timestamp
                    userName: user.username || user.name || user.email.split('@')[0],
                }
            });
        } else {
            // CREATE: New review
            review = await (prisma.review as any).create({
                data: {
                    userId: user.id,
                    productId,
                    orderId: orderItem.orderId,
                    rating: Number(rating),
                    comment,
                    userName: user.username || user.name || user.email.split('@')[0],
                }
            });
        }

        // Update Product Aggregates
        const aggregations = await prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { id: true }
        });

        await (prisma.product as any).update({
            where: { id: productId },
            data: {
                ratingValue: aggregations._avg.rating || 5.0,
                // reviewCount: aggregations._count.id || 0 // Don't overwrite to keep fake count base
            }
        });

        return NextResponse.json(review);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const session = await getSession();
    const currentUserId = session?.userId;

    let canReview = false;

    // Check if user can review
    if (currentUserId) {
        // Find if user has a valid purchase that hasn't been reviewed yet
        const validOrder = await prisma.orderItem.findFirst({
            where: {
                order: {
                    userId: currentUserId,
                    status: { in: ["PAID", "DELIVERED", "SUCCESS", "PROCESSING"] }
                },
                variant: {
                    productId: productId
                }
            },
            orderBy: {
                order: { createdAt: 'desc' }
            },
            include: {
                order: true
            }
        });

        if (validOrder) {
            // Check if already reviewed THIS specific order
            const existingReview = await prisma.review.findFirst({
                where: {
                    orderId: validOrder.orderId,
                    productId: productId,
                    userId: currentUserId
                }
            });

            // Only allow review if NO review exists for this order
            canReview = !existingReview;
        }
    }

    try {
        // Get Total Count (All)
        const totalCount = await prisma.review.count({
            where: { productId }
        });

        // Get Visible Reviews
        // Removed isFake from OR condition to prevent crash if column missing
        const reviews = await (prisma.review as any).findMany({
            where: {
                productId,
                OR: [
                    { rating: { gt: 3 } }, // Publicly visible if good rating
                    { userId: currentUserId ? currentUserId : undefined }, // Visible if own review
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true, username: true }
                }
            }
        });

        // Fetch Variant Info for Real Reviews
        const orderIds = reviews.map((r: any) => r.orderId).filter(Boolean) as string[];
        const orderItems = await prisma.orderItem.findMany({
            where: {
                orderId: { in: orderIds },
                variant: { productId: productId }
            },
            select: { orderId: true, variantName: true }
        });

        const orderItemMap = new Map(orderItems.map(item => [item.orderId, item.variantName]));

        // Check for Repeat Orders (Subscribers)
        const userIds = Array.from(new Set(reviews.map((r: any) => r.userId).filter(Boolean))) as string[];

        // Find all successful orders for these users for this product
        const successfulOrders = await prisma.orderItem.findMany({
            where: {
                variant: { productId: productId },
                order: {
                    userId: { in: userIds },
                    status: { in: ["PAID", "DELIVERED", "SUCCESS", "PROCESSING"] }
                }
            },
            select: {
                order: {
                    select: {
                        id: true, // Order ID
                        userId: true
                    }
                }
            }
        });

        // Group by User -> Distinct Order IDs
        const userOrderCounts = new Map<string, Set<string>>();
        successfulOrders.forEach((item: any) => {
            const uid = item.order.userId;
            if (!userOrderCounts.has(uid)) {
                userOrderCounts.set(uid, new Set());
            }
            userOrderCounts.get(uid)?.add(item.order.id);
        });

        // Format for frontend
        const formattedReviews = reviews.map((r: any) => {
            // Name priority: User relation (username > name) > Snapshot (userName) > Default
            const displayName = r.user?.username || r.user?.name || r.userName || "Pengguna";

            // Repeat Order Logic
            // For real users, calc from orders. For fake reviews, use flag.
            const orderCount = r.userId && userOrderCounts.has(r.userId) ? userOrderCounts.get(r.userId)!.size : 0;
            const isRepeatOrder = r.isRepeatOrder || orderCount >= 2;

            return {
                id: r.id,
                isRepeatOrder: !!isRepeatOrder, // Ensure boolean
                name: displayName,
                comment: r.comment,
                rating: r.rating,
                initial: displayName.charAt(0).toUpperCase(),
                createdAt: r.createdAt, // Send raw date for frontend calculation
                hours: Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60)), // Keep for fallback sorting
                colorClass: "bg-gray-100 text-gray-700",
                isOwn: r.userId === currentUserId,
                variantName: r.variantName || (r.orderId ? orderItemMap.get(r.orderId) : null)
            };
        });

        return NextResponse.json({
            reviews: formattedReviews,
            totalCount,
            canReview
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
