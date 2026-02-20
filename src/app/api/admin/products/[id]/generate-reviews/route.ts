
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { generateReviews } from '@/lib/gemini';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                variants: {
                    where: { isActive: true, isDeleted: false },
                    select: { name: true }
                }
            } // Fetch ONLY active variants
        });
        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

        const body = await req.json();
        const count = body.count || 5;

        let totalGenerated = 0;
        let hasDeletedOld = false;
        const BATCH_SIZE = 5; // Small batch to maintain quality and avoid timeouts
        let lastError = null;

        // Loop until we reach desired count
        while (totalGenerated < count) {
            const currentBatchSize = Math.min(BATCH_SIZE, count - totalGenerated);
            console.log(`Generating batch: ${currentBatchSize} reviews...`);

            try {
                // Generate reviews using Gemini
                const variantNames = product.variants.map((v: any) => v.name);
                const reviewsData = await generateReviews(product.name, product.description, currentBatchSize, variantNames);
                console.log(`Batch generated: ${reviewsData.length} reviews`);

                // Insert into DB (Start Transaction)
                await prisma.$transaction(async (tx) => {
                    // 1. DELETE old reviews only on the FIRST successful batch
                    if (!hasDeletedOld) {
                        await tx.review.deleteMany({
                            where: { productId: id, isFake: true }
                        });
                    }

                    // 2. Insert new reviews
                    await Promise.all(reviewsData.map((r: any) => {
                        // Use AI-selected variant if valid, else pick random
                        let selectedVariant = r.variantName;
                        if (!selectedVariant || !variantNames.includes(selectedVariant)) {
                            selectedVariant = variantNames.length > 0
                                ? variantNames[Math.floor(Math.random() * variantNames.length)]
                                : null;
                        }

                        const isRepeatOrder = Math.random() < 0.3;

                        return tx.review.create({
                            data: {
                                productId: id,
                                rating: r.rating,
                                comment: r.comment,
                                userName: r.userName,
                                isFake: true,
                                variantName: selectedVariant,
                                isRepeatOrder: isRepeatOrder,
                                createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30))
                            } as any
                        });
                    }));
                });

                // Mark as deleted so we don't delete again in next batch
                hasDeletedOld = true;
                totalGenerated += reviewsData.length;

                // Optional: detailed logging or progress update via websocket/SSE (not implemented yet)

            } catch (batchError: any) {
                console.error('Batch generation failed:', batchError);
                lastError = batchError.message || batchError;
                // If the VERY FIRST batch fails, we should probably stop and report error
                // If we already generated some, maybe we continue? 
                // Let's break to be safe/concise.
                break;
            }
        }

        if (totalGenerated === 0) {
            throw new Error(lastError || "Failed to generate any reviews (AI Provider Error)");
        }

        // 3. Recalculate stats (Fetch ALL reviews, real + fake)
        const allReviews = await prisma.review.findMany({
            where: { productId: id },
            select: { rating: true }
        });

        const totalRating = allReviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 5.0;

        await prisma.product.update({
            where: { id },
            data: {
                reviewCount: allReviews.length,
                ratingValue: parseFloat(avgRating.toFixed(1))
            }
        });



        await logAdminAction(session.userId, 'GENERATE_REVIEWS', `Generated ${count} reviews for ${product.name}`);

        return NextResponse.json({ message: `Success generated ${count} reviews` });
    } catch (error: any) {
        console.error('Generate Reviews Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate' }, { status: 500 });
    }
}
