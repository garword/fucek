
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const setting = await prisma.siteSetting.findUnique({
            where: { key: 'site_identity' }
        });

        const data = setting ? JSON.parse(setting.value) : {
            mode: 'text',
            text: 'STORE',
            subText: '.',
            imageUrl: '',
            imageAlt: 'Store Logo'
        };

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch identity' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const type = formData.get('type') as string;

        if (type === 'update_config') {
            const mode = formData.get('mode') as string;
            const text = formData.get('text') as string;
            const subText = formData.get('subText') as string;

            const existing = await prisma.siteSetting.findUnique({ where: { key: 'site_identity' } });
            const currentData = existing ? JSON.parse(existing.value) : {};

            const newData = {
                ...currentData,
                mode: mode || currentData.mode,
                text: text !== undefined ? text : currentData.text,
                subText: subText !== undefined ? subText : currentData.subText
            };

            await prisma.siteSetting.upsert({
                where: { key: 'site_identity' },
                update: { value: JSON.stringify(newData) },
                create: { key: 'site_identity', value: JSON.stringify(newData) }
            });

            return NextResponse.json({ success: true, data: newData });

        } else if (type === 'upload_image') {
            const file = formData.get('file') as File;

            if (!file) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = 'logo.png'; // Force PNG for simplicity and consistency
            const relativePath = `/assets/${fileName}`;
            const filePath = path.join(process.cwd(), 'public', 'assets', fileName);

            await writeFile(filePath, buffer);

            const existing = await prisma.siteSetting.findUnique({ where: { key: 'site_identity' } });
            const currentData = existing ? JSON.parse(existing.value) : {};

            const newData = {
                ...currentData,
                mode: 'image',
                imageUrl: `${relativePath}?v=${Date.now()}`, // Cache busting
                imageAlt: 'Store Logo'
            };

            await prisma.siteSetting.upsert({
                where: { key: 'site_identity' },
                update: { value: JSON.stringify(newData) },
                create: { key: 'site_identity', value: JSON.stringify(newData) }
            });

            return NextResponse.json({ success: true, data: newData });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error: any) {
        console.error('Identity API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
