
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const contents = [
        { slug: 'terms', title: 'Syarat & Ketentuan', content: '<p>Isi syarat dan ketentuan Anda di sini.</p>' },
        { slug: 'privacy', title: 'Kebijakan Privasi', content: '<p>Isi kebijakan privasi Anda di sini.</p>' },
        { slug: 'refund', title: 'Kebijakan Refund', content: '<p>Isi kebijakan refund Anda di sini.</p>' },
        { slug: 'contact', title: 'Hubungi Kami', content: '<p>Informasi kontak Anda.</p>' },
        { slug: 'about', title: 'Tentang Kami', content: '<p>Cerita tentang toko Anda.</p>' },
        { slug: 'cara-beli', title: 'Cara Beli', content: '<p>Panduan cara pembelian.</p>' },
        { slug: 'faq', title: 'FAQ', content: '<p>Pertanyaan yang sering diajukan.</p>' },
        { slug: 'blog', title: 'Blog', content: '<p>Artikel terbaru.</p>' },
    ];

    for (const item of contents) {
        await prisma.siteContent.upsert({
            where: { slug: item.slug },
            update: {},
            create: item,
        });
        console.log(`Seeded content: ${item.slug}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
