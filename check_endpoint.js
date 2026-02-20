
const https = require('https');

const endpoints = [
    "https://api.medanpedia.co.id/refill",
    "https://api.medanpedia.co.id/refill_status"
];

endpoints.forEach(url => {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };

    const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`URL: ${url}`);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Response: ${data.substring(0, 200)}`);
            console.log('-'.repeat(20));
        });
    });

    req.on('error', (e) => {
        console.error(`Error checking ${url}: ${e.message}`);
    });

    req.write('test=1'); // Send some dummy data
    req.end();
});
