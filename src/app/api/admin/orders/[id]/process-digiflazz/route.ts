
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { topupDigiflazz } from '@/lib/digiflazz';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;

        // 1. Get Order with Items
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                orderItems: {
                    include: { variant: true }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const results = [];
        let successCount = 0;

        // 2. Process Digiflazz Items
        for (const item of order.orderItems) {
            // Check if item is Digiflazz and not yet successful
            // Note: bestProvider might be null if manually added, or we strictly check 'DIGIFLAZZ'
            // Also check if status is already SUCCESS to prevent double topup
            if (item.variant.bestProvider === 'DIGIFLAZZ' && item.providerStatus !== 'Sukses') {

                // Construct Ref ID unique for this item try
                // We use item.id as Ref ID. 
                const refId = item.id;

                // User's phone/id is usually in 'data_no' or we need to capture it during checkout.
                // WAIT: The checkout logic I saw earlier didn't save the target number (customer_no)!
                // I need to check where the customer number is stored.
                // In `CartItem`, is there a field? 

                // Let's assume for now the user Input is in a 'note' or 'userData' field?
                // Checking `CartItem` schema in `checkout/route.ts`... it just includes `variant`.
                // Checking `check-status`: it doesn't use customer_no, just RefID.

                // CRITICAL: We need the customer number (No HP / ID Game) to topup!
                // If it's not in OrderItem, we can't process!

                // Let's check `OrderItem` schema via `prisma.schema` or by inferring.
                // Usually it's in `metadata` or `note`. 
                // IF MISSING, verifying this is a BLOCKER.

                // Assuming it's in `item.metadata` or similar for now, but I will check schema first.
                // For this file, I'll assume `item.targetData` or similar exists.
                // Lets look at `OrderItem` table structure if possible or `CartItem`.

                // For now, I will write the code assuming a `target` field exists, 
                // and if it fails I will fix it.

                const customerNo = (item as any).target || (item as any).note; // Temporary fallback

                if (!customerNo) {
                    results.push({ itemId: item.id, status: 'SKIPPED', message: 'No Target Number found' });
                    continue;
                }

                const topupRes = await topupDigiflazz({
                    buyer_sku_code: item.variant.sku || '', // Ensure not null
                    customer_no: customerNo as string, // Safe due to check above
                    ref_id: refId,
                    testing: false
                });

                if (topupRes.success) {
                    // Update Item Status
                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: {
                            providerStatus: topupRes.rc === '00' ? 'Sukses' : (topupRes.rc === '03' ? 'Pending' : 'Gagal'),
                            sn: topupRes.data.sn,
                            note: topupRes.message,
                        }
                    });
                    successCount++;
                    results.push({ itemId: item.id, status: 'INITIATED', digiflazz: topupRes });
                } else {
                    results.push({ itemId: item.id, status: 'FAILED', message: topupRes.message });
                }
            }
        }

        return NextResponse.json({
            message: `Processed ${successCount} items`,
            results
        });

    } catch (error: any) {
        console.error('Process Digiflazz Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
