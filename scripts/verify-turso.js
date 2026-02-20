const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

console.log('Testing Turso Connection (JS Mode)...');

// Manually load .env
function loadEnv() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf-8');
            envConfig.split(/\r?\n/).forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
            console.log('✅ Loaded .env file');
        }
    } catch (e) {
        console.error('Failed to load .env', e);
    }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

// Helper function to create LibSQL client from URL
function createLibSQLClient(urlString) {
    const urlObj = new URL(urlString);
    const authToken = urlObj.searchParams.get('authToken') || process.env.TURSO_AUTH_TOKEN;

    urlObj.searchParams.delete('authToken');

    // FORCE HTTPS: This resolves the 400 Migration Error on some networks/configs
    const cleanUrl = urlObj.toString().replace('libsql:', 'https:');

    if (!authToken) {
        console.warn('Warning: No authToken found in URL or ENV');
    }

    console.log('Connecting to:', cleanUrl);

    return createClient({
        url: cleanUrl,
        authToken: authToken || undefined,
    });
}

async function main() {
    try {
        let prisma;

        if (dbUrl.includes('libsql')) {
            console.log('Connecting via LibSQL Adapter...');
            const libsql = createLibSQLClient(dbUrl);

            // 1. TEST RAW CLIENT
            console.log('Testing Raw LibSQL Client...');
            try {
                const rawResult = await libsql.execute('SELECT count(*) as count FROM User');
                console.log('✅ Raw Client Success! Result:', rawResult.rows[0]);
            } catch (rawError) {
                console.error('❌ Raw Client Failed:', rawError);
                throw rawError;
            }

            // 2. TEST PRISMA ADAPTER
            console.log('Testing Prisma Adapter...');
            const adapter = new PrismaLibSQL(libsql);
            prisma = new PrismaClient({ adapter });
        } else {
            console.log('Connecting via Standard Prisma...');
            prisma = new PrismaClient();
        }

        // Test Query
        console.log('Sending Prisma query...');
        const count = await prisma.user.count();
        console.log(`✅ Prisma Connection Successful! Found ${count} users.`);

        await prisma.$disconnect();
        console.log('Disconnected.');

    } catch (error) {
        console.error('❌ Connection Failed:', error);
        process.exit(1);
    }
}

main();
