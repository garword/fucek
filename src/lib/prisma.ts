import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const prismaClientSingleton = () => {
    const url = process.env.DATABASE_URL;

    // Use LibSQL Adapter if URL is from Turso (libsql://)
    if (url && url.includes('libsql')) {
        const libsql = createClient({
            url: url,
            authToken: process.env.TURSO_AUTH_TOKEN // Optional: Can be part of URL too
        });
        const adapter = new PrismaLibSQL(libsql);
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
