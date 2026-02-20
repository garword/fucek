
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // 1. Create Admin User
    const passwordHash = await bcrypt.hash('cantik', 10)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            username: 'windaa',
            passwordHash,
            role: 'ADMIN',
            emailVerifiedAt: new Date(),
        },
    })
    console.log('Admin user:', admin.email)

    // 2. Create Categories
    const categories = [
        // Digital
        { name: 'Streaming', slug: 'streaming', iconKey: 'film', type: 'DIGITAL' },
        { name: 'Music', slug: 'music', iconKey: 'music', type: 'DIGITAL' },
        { name: 'VPN', slug: 'vpn', iconKey: 'shield', type: 'DIGITAL' },
        { name: 'Software', slug: 'software', iconKey: 'cpu', type: 'DIGITAL' },

        // Games
        { name: 'Mobile Legends', slug: 'mobile-legends', iconKey: 'gamepad-2', type: 'GAME' },
        { name: 'PUBG Mobile', slug: 'pubg-mobile', iconKey: 'crosshair', type: 'GAME' },
        { name: 'Free Fire', slug: 'free-fire', iconKey: 'flame', type: 'GAME' },
        { name: 'Valorant', slug: 'valorant', iconKey: 'swords', type: 'GAME' },

        // Pulsa & Data
        { name: 'Telkomsel', slug: 'telkomsel', iconKey: 'signal', type: 'PULSA' },
        { name: 'Indosat', slug: 'indosat', iconKey: 'signal', type: 'PULSA' },
        { name: 'XL Axiata', slug: 'xl', iconKey: 'signal', type: 'PULSA' },
        { name: 'Tri (3)', slug: 'tri', iconKey: 'signal', type: 'PULSA' },
        { name: 'Smartfren', slug: 'smartfren', iconKey: 'signal', type: 'PULSA' },
        { name: 'Axis', slug: 'axis', iconKey: 'signal', type: 'PULSA' },

        // Sosmed
        { name: 'Instagram', slug: 'instagram', iconKey: 'instagram', type: 'SOSMED' },
        { name: 'TikTok', slug: 'tiktok', iconKey: 'video', type: 'SOSMED' },
        { name: 'Youtube', slug: 'youtube', iconKey: 'youtube', type: 'SOSMED' },
    ]

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name, iconKey: cat.iconKey, type: cat.type } as any,
            create: {
                name: cat.name,
                slug: cat.slug,
                iconKey: cat.iconKey,
                type: cat.type,
            } as any,
        })
    }

    // 3. Create Product (Netflix)
    const streamingCat = await prisma.category.findUnique({ where: { slug: 'streaming' } })

    if (streamingCat) {
        const netflix = await prisma.product.upsert({
            where: { id: 'netflix-premium' },
            update: {},
            create: {
                id: 'netflix-premium',
                name: 'Netflix Premium 4K',
                description: 'Akun Netflix Premium Private 4K UHD. Garansi Full.',
                imageUrl: 'https://placehold.co/600x400/e50914/ffffff?text=Netflix',
                categoryId: streamingCat.id,
                socialProofMode: 'BESTSELLER',
                slug: 'netflix-premium-4k', // Type should be valid now
            },
        })

        // Variants
        const variants = [
            { name: '1 Bulan Private', price: 35000, duration: 30, warranty: 30 },
            { name: '3 Bulan Private', price: 100000, duration: 90, warranty: 90 },
        ]

        for (const v of variants) {
            const variantId = `netflix-${v.duration}`

            const variant = await prisma.productVariant.upsert({
                where: { id: variantId },
                update: {
                    price: v.price,
                    name: v.name,
                },
                create: {
                    id: variantId,
                    productId: netflix.id,
                    name: v.name,
                    price: v.price,
                    durationDays: v.duration,
                    warrantyDays: v.warranty,
                },
            })

            // Dummy Stock (Clean existing stocks for this variant to avoid duplicates on re-seed or check count)
            const stockCount = await prisma.digitalStock.count({ where: { variantId: variant.id } })

            if (stockCount === 0) {
                await prisma.digitalStock.createMany({
                    data: [
                        { variantId: variant.id, payloadEncrypted: 'RUMMY_ENCRYPTED_CREDENTIAL_1', status: 'AVAILABLE' },
                        { variantId: variant.id, payloadEncrypted: 'RUMMY_ENCRYPTED_CREDENTIAL_2', status: 'AVAILABLE' },
                        { variantId: variant.id, payloadEncrypted: 'RUMMY_ENCRYPTED_USED', status: 'USED' },
                    ],
                })
            }
        }
    }

    // 4. Site Content
    const contents = [
        { slug: 'payment_instructions', title: 'Cara Pembayaran', content: 'Silakan transfer ke QRIS berikut dan konfirmasi via WhatsApp.' },
        { slug: 'qris_image_url', title: 'QRIS', content: 'https://placehold.co/300x300/000000/ffffff?text=QRIS' },

        // Informasi
        { slug: 'about', title: 'Tentang Kami', content: 'Store adalah platform marketplace produk digital terdepan di Indonesia. Kami menyediakan layanan topup game, voucher, dan produk digital lainnya dengan harga termurah dan proses otomatis 24 jam.\n\nVisi kami adalah menjadi one-stop solution untuk kebutuhan digital masyarakat Indonesia.' },
        { slug: 'how-to-buy', title: 'Cara Beli', content: '1. Pilih produk yang Anda inginkan.\n2. Masukkan ID Game / Nomor HP tujuan.\n3. Pilih nominal dan metode pembayaran.\n4. Lakukan pembayaran sesuai instruksi.\n5. Produk akan masuk otomatis dalam hitungan detik!' },
        { slug: 'faq', title: 'FAQ', content: 'Q: Berapa lama prosesnya?\nA: Proses otomatis 1-5 detik setelah pembayaran terkonfirmasi.\n\nQ: Apakah aman?\nA: 100% Aman dan Bergaransi.\n\nQ: Jika gagal?\nA: Saldo akan dikembalikan ke akun Anda atau hubungi CS kami.' },
        { slug: 'blog', title: 'Blog', content: 'Temukan tips dan trik terbaru seputar game dan teknologi di sini...\n\n(Coming Soon)' },

        // Legal & Bantuan
        { slug: 'terms', title: 'Syarat & Ketentuan', content: '1. Pengguna wajib memasukkan data yang benar.\n2. Kesalahan input data bukan tanggung jawab kami.\n3. Harga dapat berubah sewaktu-waktu tanpa pemberitahuan.' },
        { slug: 'privacy', title: 'Kebijakan Privasi', content: 'Kami menjaga kerahasiaan data pribadi Anda. Data hanya digunakan untuk keperluan transaksi dan tidak akan disebarluaskan ke pihak ketiga.' },
        { slug: 'refund', title: 'Kebijakan Refund', content: 'Refund dapat dilakukan jika:\n1. Produk tidak masuk dalam 1x24 jam.\n2. Kesalahan sistem dari pihak kami.\n\nRefund tidak berlaku untuk kesalahan input dari pengguna.' },
        { slug: 'contact', title: 'Hubungi Kami', content: 'Butuh bantuan? Hubungi kami via:\n\nWhatsApp: 0812-3456-7890\nEmail: support@store.com\nJam Operasional: 09.00 - 22.00 WIB' },
    ]

    for (const c of contents) {
        await prisma.siteContent.upsert({
            where: { slug: c.slug },
            update: { content: c.content, title: c.title },
            create: c,
        })
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
