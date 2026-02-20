
(async () => {
    try {
        const game = 'ff';
        const id = '12345678';
        console.log('Testing Check Nickname API (Isan)...');
        const res = await fetch('http://localhost:3000/api/utils/check-nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game, id })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Data:', data);
    } catch (e) {
        console.error('Error:', e);
    }
})();
