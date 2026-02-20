
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Save to src/app/favicon.ico
        // Note: In production, this might not persist if running in Vercel/Docker ephemeral FS.
        // But for user's request "running locally" or persistent server, this works.
        const filePath = path.join(process.cwd(), 'src', 'app', 'favicon.ico');

        await writeFile(filePath, buffer);

        return NextResponse.json({ success: true, message: 'Favicon updated successfully' });

    } catch (error: any) {
        console.error('Error updating favicon:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
