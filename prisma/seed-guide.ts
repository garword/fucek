
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const content = `
    <div class="space-y-6">
        <section>
            <h3 class="text-xl font-bold text-gray-900 mb-2">1. Pilih Produk</h3>
            <p>Cari dan pilih produk digital yang Anda inginkan, mulai dari Topup Game, Pulsa, Token PLN, hingga akun Streaming Premium.</p>
        </section>

        <section>
            <h3 class="text-xl font-bold text-gray-900 mb-2">2. Masukkan Data Tujuan</h3>
            <p>Masukkan User ID Game, Nomor HP, atau Email Anda dengan benar pada kolom yang tersedia.</p>
        </section>

        <section>
            <h3 class="text-xl font-bold text-gray-900 mb-2">3. Pilih Varian & Pembayaran</h3>
            <p>Pilih nominal atau durasi layanan, lalu pilih metode pembayaran yang paling mudah bagi Anda (QRIS, E-Wallet, atau Transfer Bank).</p>
        </section>

        <section>
            <h3 class="text-xl font-bold text-gray-900 mb-2">4. Lakukan Pembayaran</h3>
            <p>Selesaikan pembayaran sesuai tagihan. Sistem kami akan memverifikasi pembayaran Anda secara otomatis dalam hitungan detik.</p>
        </section>

        <section>
            <h3 class="text-xl font-bold text-gray-900 mb-2">5. Produk Terkirim!</h3>
            <p>Produk akan langsung masuk ke akun atau nomor HP Anda. Cek status transaksi di halaman <a href="/user/orders" class="text-green-600 underline">Riwayat Pesanan</a>.</p>
        </section>

        <div class="bg-green-50 p-4 rounded-lg border border-green-200 mt-6 md:mt-8">
            <p class="font-bold text-green-800">Butuh Bantuan?</p>
            <p class="text-green-700 text-sm">Hubungi Customer Service kami melalui WhatsApp jika mengalami kendala.</p>
        </div>
    </div>
  `;

    await prisma.siteContent.upsert({
        where: { slug: 'panduan-pembelian' },
        update: {
            title: 'Panduan Pembelian',
            content: content,
        },
        create: {
            slug: 'panduan-pembelian',
            title: 'Panduan Pembelian',
            content: content,
        },
    });

    console.log('Panduan Pembelian created/updated!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
