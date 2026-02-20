
import React from 'react';
import { ShoppingCart, CreditCard, CheckCircle, Search } from 'lucide-react';

export default function GuidePage() {
    const steps = [
        {
            icon: <Search className="w-8 h-8 text-blue-500" />,
            title: "1. Pilih Produk",
            description: "Cari produk yang Anda inginkan melalui kolom pencarian atau kategori yang tersedia."
        },
        {
            icon: <ShoppingCart className="w-8 h-8 text-green-500" />,
            title: "2. Masukkan Keranjang",
            description: "Pilih varian (durasi) yang sesuai, lalu klik 'Tambah ke Keranjang'."
        },
        {
            icon: <CreditCard className="w-8 h-8 text-purple-500" />,
            title: "3. Lakukan Pembayaran",
            description: "Checkout dan bayar menggunakan QRIS (OVO, GoPay, Dana, dll) secara otomatis."
        },
        {
            icon: <CheckCircle className="w-8 h-8 text-teal-500" />,
            title: "4. Terima Produk",
            description: "Setelah pembayaran sukses, akun/voucher akan langsung dikirim ke email dan WhatsApp Anda."
        }
    ];

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Panduan Pembelian</h1>
                    <p className="text-lg text-gray-600">Cara mudah berbelanja produk digital di sini.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/20 hover:scale-105 transition-transform duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100 to-transparent rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110"></div>

                            <div className="relative z-10">
                                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-6 group-hover:rotate-12 transition-transform">
                                    {step.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 bg-green-50 rounded-3xl p-8 text-center border border-green-100">
                    <h3 className="text-2xl font-bold text-green-800 mb-4">Butuh Bantuan Lain?</h3>
                    <p className="text-green-700 mb-6">Tim support kami siap membantu Anda 24/7 jika mengalami kendala.</p>
                    <a href="https://wa.me/6281234567890" target="_blank" className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-500/30 transition-all">
                        Hubungi WhatsApp
                    </a>
                </div>
            </div>
        </div>
    );
}
