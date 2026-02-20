
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { checkStatus, refillOrder, checkRefillStatus } from '@/lib/medanpedia';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action, id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'status':
                result = await checkStatus(id);
                // Sync to DB
                if (result) {
                    await prisma.orderItem.updateMany({
                        where: { providerTrxId: id },
                        data: {
                            providerStatus: result.status,
                            startCount: result.start_count,
                            remains: result.remains
                        }
                    });
                }
                break;
            case 'refill':
                result = await refillOrder(id);
                break;
            case 'refill_status':
                result = await checkRefillStatus(id);
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
        console.error(`SMM Profile API Error (${req.body}):`, error);
        return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
    }
}
