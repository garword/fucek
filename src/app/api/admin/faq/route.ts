import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // @ts-ignore
        const faqs = await prisma.faq.findMany({
            orderBy: { sortOrder: 'asc' },
        });
        return NextResponse.json(faqs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { question, answer } = body;

        if (!question || !answer) {
            return NextResponse.json({ error: 'Question and Answer are required' }, { status: 400 });
        }

        // @ts-ignore
        const faq = await prisma.faq.create({
            data: {
                question,
                answer,
                isActive: true, // Default active
            },
        });

        return NextResponse.json(faq);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 });
    }
}
