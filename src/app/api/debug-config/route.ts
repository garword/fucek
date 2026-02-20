
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Accessing Debug Config Endpoint');

        // Debug: Check if systemConfig exists on prisma instance
        const prismaAny = prisma as any;
        if (!prismaAny.systemConfig) {
            console.error('CRITICAL: prisma.systemConfig is undefined!');
            return NextResponse.json({
                error: 'Prisma Client does not have systemConfig model. Try running `npx prisma generate` and restarting server.'
            }, { status: 500 });
        }

        const dbConfigs = await prismaAny.systemConfig.findMany({
            where: { key: { in: ['GOOGLE_CLIENT_ID'] } }
        });

        // Safe access
        const value = dbConfigs.find((c: any) => c.key === 'GOOGLE_CLIENT_ID')?.value || 'Not Found';
        const maskedValue = value.length > 10 ? value.substring(0, 10) + '...' : value;

        return NextResponse.json({
            status: 'OK',
            dbValue: maskedValue,
            envValue: process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing'
        });
    } catch (error: any) {
        console.error('Debug Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
