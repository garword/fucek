import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { question, answer, isActive, sortOrder } = body;

        // @ts-ignore
        const faq = await prisma.faq.update({
            where: { id },
            data: {
                question,
                answer,
                isActive,
                sortOrder,
            },
        });

        return NextResponse.json(faq);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        // @ts-ignore
        await prisma.faq.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 });
    }
}
