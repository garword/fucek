const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Manually load .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
            if (!process.env[key]) process.env[key] = value;
        }
    });
}

async function main() {
    const url = process.env.DATABASE_URL;
    console.log('Original URL:', url); // Be careful with logs in prod, but needed for debug

    // Exact logic from src/lib/prisma.ts (FIXED VERSION)
    const urlObj = new URL(url);
    const urlToken = urlObj.searchParams.get('authToken');
    urlObj.searchParams.delete('authToken');
    // Force HTTPS to avoid migration job errors with Prisma Adapter
    const cleanUrl = urlObj.toString().replace(/^libsql:/, 'https:');

    const libsql = createClient({
        url: cleanUrl,
        authToken: urlToken || process.env.TURSO_AUTH_TOKEN
    });

    const adapter = new PrismaLibSQL(libsql);
    const prisma = new PrismaClient({ adapter });

    try {
        console.log('Connecting...');
        const count = await prisma.user.count();
        console.log('Success! Count:', count);
    } catch (e) {
        console.error('Failure:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
