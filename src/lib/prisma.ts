import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const prismaClientSingleton = () => {
    const url = process.env.DATABASE_URL;

    // Use LibSQL Adapter if URL is from Turso (libsql://)
    if (url && url.includes('libsql')) {
        // Sanitize URL: Remove authToken from query params to prevent conflicts
        // and ensure a clean connection string for the LibSQL client.
        const urlObj = new URL(url);
        const urlToken = urlObj.searchParams.get('authToken');
        urlObj.searchParams.delete('authToken');
        const cleanUrl = urlObj.toString();

        const libsql = createClient({
            url: cleanUrl,
            authToken: process.env.TURSO_AUTH_TOKEN || urlToken
        });
        const adapter = new PrismaLibSQL(libsql);

        // @ts-ignore: Adapter property is valid for LibSQL but missing in some Prisma types
        return new PrismaClient({ adapter });
    }

    // Fallback to standard client (Local SQLite file:)
    return new PrismaClient();
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
