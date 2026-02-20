
const game = 'ff';
const id = '225009777'; // User example ID

(async () => {
    try {
        // Test 1: With decode=false
        let url = `https://api.isan.eu.org/nickname/${game}?decode=false`;
        console.log('Fetching 1:', url);
        let res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        let data = await res.json();
        console.log('Response 1:', JSON.stringify(data, null, 2));

        // Test 2: Without decode param
        url = `https://api.isan.eu.org/nickname/${game}`;
        console.log('Fetching 2:', url);
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        data = await res.json();
        console.log('Response 2:', JSON.stringify(data, null, 2));

    } catch (e) {
        console.error(e);
    }
})();
