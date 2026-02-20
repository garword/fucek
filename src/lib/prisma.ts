import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const prismaClientSingleton = () => {
    const url = process.env.DATABASE_URL;

    // Use LibSQL Adapter if URL is from Turso (libsql://)
    if (url && url.includes('libsql')) {
        // Sanitize URL: Extract authToken from query params to avoid conflicts
        const urlObj = new URL(url);
        const urlToken = urlObj.searchParams.get('authToken');
        urlObj.searchParams.delete('authToken');
        const cleanUrl = urlObj.toString();

        // Prefer TURSO_AUTH_TOKEN env var; fallback to token in URL
        const authToken = (process.env.TURSO_AUTH_TOKEN || urlToken) ?? undefined;

        const libsql = createClient({
            url: cleanUrl,
            authToken
        });
        const adapter = new PrismaLibSQL(libsql);
        // @ts-ignore: adapter is valid for Prisma Client with driverAdapters feature
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
