export default {
    // Handler untuk HTTP Request (Bisa dipakai untuk Tes Manual di Browser/Dashboard)
    async fetch(request, env, ctx) {
        // GANTI URL INI DENGAN URL CRON ANDA
        const TARGET_URL = "https://GANTI-DOMAIN-ANDA.com/api/cron/check-status";

        return new Response("Worker Cron Aktif! Gunakan 'Cron Trigger' untuk menjalankannya setiap menit.", {
            headers: { "content-type": "text/plain" },
        });
    },

    // Handler untuk Cron Trigger (Jadwal Otomatis)
    async scheduled(event, env, ctx) {
        const TARGET_URL = "https://GANTI-DOMAIN-ANDA.com/api/cron/check-status"; // GANTI INI
        console.log(`[Cron] Starting 60s loop for ${TARGET_URL}`);
        ctx.waitUntil(handleCronLoop(TARGET_URL));
    }
};

async function handleCronLoop(url) {
    // Loop selama 55 detik (aman dari timeout 60s)
    for (let i = 0; i < 55; i++) {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 2000); // Timeout 2 detik per request

            // Fire request
            fetch(url, {
                method: 'GET',
                headers: { 'User-Agent': 'Cloudflare-Worker-Cron' },
                signal: controller.signal
            }).catch(err => console.log('Ping failed:', err)); // Catch fetch error agar tidak crash

        } catch (e) {
            console.error('Error in loop:', e);
        }

        // Tunggu 1 detik
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('[Cron] Loop finished');
}
