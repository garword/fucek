const { createClient } = require('@libsql/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Manually load .env since we are running with plain node
function loadEnv() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf-8');
            envConfig.split(/\r?\n/).forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
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

console.log('🚀 Starting Custom DB Push to Turso (JS Mode)...');

// Helper to parse auth token safely
function getAuthToken(urlString) {
    try {
        const urlObj = new URL(urlString);
        const token = urlObj.searchParams.get('authToken');
        urlObj.searchParams.delete('authToken');
        return {
            cleanUrl: urlObj.toString(),
            token: token || process.env.TURSO_AUTH_TOKEN
        };
    } catch (e) {
        return { cleanUrl: urlString, token: undefined };
    }
}

async function main() {
    const url = process.env.DATABASE_URL || '';

    if (!url.includes('libsql')) {
        console.error('❌ Error: DATABASE_URL is not set or not a valid LibSQL URL.');
        console.error('Current URL:', url);
        process.exit(1);
    }

    const { cleanUrl, token } = getAuthToken(url);

    // 2. Generate SQL Migration Script using Prisma
    console.log('📦 Generating SQL from Schema...');
    const generateCommand = `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`;

    // Execute command with modified env
    // We point to a dummy file to force Prisma to generate SQLite SQL
    const sqlScript = execSync(generateCommand, {
        env: { ...process.env, DATABASE_URL: 'file:./dev.db' },
        encoding: 'utf-8'
    });

    if (!sqlScript || sqlScript.trim().length === 0) {
        console.log('⚠️ No changes detected or empty script.');
        return;
    }

    console.log('📝 SQL Generated. Executing against Turso...');

    // 3. Execute SQL against Turso
    const client = createClient({
        url: cleanUrl,
        authToken: token || undefined,
    });

    try {
        await client.executeMultiple(sqlScript);
        console.log('✅ Schema successfully pushed to Turso!');
    } catch (e) {
        console.error('❌ Error executing SQL on Turso:', e.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

main().catch((e) => {
    console.error('❌ An error occurred:', e);
    process.exit(1);
});
