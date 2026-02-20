
import prisma from '@/lib/prisma';

export async function logAdminAction(userId: string, action: string, details: string) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                details,
                ipAddress: 'unknown' // Could extract from headers if passed, but keeping generic for now
            }
        });
    } catch (e) {
        console.error('Failed to create audit log', e);
    }
}
