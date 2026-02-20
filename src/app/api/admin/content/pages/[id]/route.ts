import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('[PAGE_GET] Fetching id:', id);
        const page = await prisma.siteContent.findUnique({
            where: { id }
        });
        console.log('[PAGE_GET] Found page:', page ? 'yes' : 'no');

        if (!page) {
            return new NextResponse('Page not found', { status: 404 });
        }

        return NextResponse.json(page);
    } catch (error) {
        console.error('[PAGE_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { title, slug, content } = body;

        if (!title || !slug) {
            return new NextResponse('Title and Slug are required', { status: 400 });
        }

        // Check slug uniqueness if changed
        const existing = await prisma.siteContent.findUnique({
            where: { slug }
        });

        if (existing && existing.id !== id) {
            return new NextResponse('Slug already in use', { status: 409 });
        }

        const page = await prisma.siteContent.update({
            where: { id },
            data: {
                title,
                slug,
                content,
            },
        });

        return NextResponse.json(page);
    } catch (error) {
        console.error('[PAGE_PUT]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await prisma.siteContent.delete({
            where: { id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[PAGE_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
