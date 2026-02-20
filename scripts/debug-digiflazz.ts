
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Digiflazz Debug ---');

    // 1. Get Config
    const usernameItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_username' } });
    const keyItem = await prisma.siteContent.findUnique({ where: { slug: 'digiflazz_key' } });

    const username = usernameItem?.content;
    const key = keyItem?.content;

    console.log('Config Found:', { username: !!username, key: !!key });

    if (!username || !key) {
        console.error('Missing Configuration');
        return;
    }

    try {
        // 2. Generate Signature
        const sign = crypto.createHash('md5').update(username + key + 'pricelist').digest('hex');
        console.log('Signature Generated:', sign);

        // 3. Fetch API
        console.log('Fetching https://api.digiflazz.com/v1/price-list ...');
        const response = await fetch('https://api.digiflazz.com/v1/price-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cmd: 'prepaid',
                username: username,
                sign: sign
            })
        });

        console.log('Response Status:', response.status);
        const text = await response.text();
        console.log('Raw Response Body:', text);

        try {
            const json = JSON.parse(text);
            if (json.data && Array.isArray(json.data)) {
                console.log('✅ Data is valid Array. Length:', json.data.length);
                console.log('First Item:', json.data[0]);
            } else {
                console.error('❌ Data is NOT an Array or Missing');
            }
        } catch (e) {
            console.error('Failed to parse JSON');
        }

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
