import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const pages = await prisma.siteContent.findMany({
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(pages);
    } catch (error) {
        console.error('[PAGES_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { title, slug, content } = body;

        if (!title || !slug) {
            return new NextResponse('Title and Slug are required', { status: 400 });
        }

        // Check if slug exists
        const existing = await prisma.siteContent.findUnique({
            where: { slug }
        });

        if (existing) {
            return new NextResponse('Slug already exists', { status: 409 });
        }

        const page = await prisma.siteContent.create({
            data: {
                title,
                slug,
                content,
            },
        });

        return NextResponse.json(page);
    } catch (error) {
        console.error('[PAGES_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
