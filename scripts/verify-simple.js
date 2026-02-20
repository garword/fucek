const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Simple Verification (Clone of Push Script)...');

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
        }
    } catch (e) {
        console.error('Failed to load .env', e);
    }
}

loadEnv();

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
    const { cleanUrl, token } = getAuthToken(url);

    console.log('Connecting to:', cleanUrl);

    const client = createClient({
        url: cleanUrl,
        authToken: token || undefined,
    });

    // Execute SQL using executeMultiple which seems to work
    try {
        await client.executeMultiple("SELECT count(*) as count FROM User");
        console.log('✅ Connection Success!');
        console.log('Query Executed via executeMultiple.');
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
