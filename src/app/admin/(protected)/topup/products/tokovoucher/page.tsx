'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Upload, Code, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import BulkImportModal from '@/components/features/admin/BulkImportModal';

export default function TokoVoucherImportPage() {
    const router = useRouter();
    const [showBulkModal, setShowBulkModal] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Link
                        href="/admin/products?type=GAME"
                        className="p-3 hover:bg-white/50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                            Import Produk - TokoVoucher
                        </h1>
                        <p className="text-gray-600 mt-2 font-medium">
                            Import produk game dari katalog TokoVoucher dengan 2 metode
                        </p>
                    </div>
                </div>

                {/* Import Methods Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Method 1: Bulk Import */}
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                            <Upload className="w-8 h-8 text-white" />
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 mb-3">
                            Bulk Import dari Katalog
                        </h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Import banyak produk sekaligus dengan memilih brand dari katalog TokoVoucher.
                            Anda bisa pilih semua varian atau pilih satu-satu varian yang diinginkan.
                        </p>

                        <div className="bg-green-50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-green-800 font-medium">
                                ✨ <strong>Fitur:</strong>
                            </p>
                            <ul className="text-sm text-green-700 mt-2 space-y-1 ml-4">
                                <li>• Pilih multiple brand sekaligus</li>
                                <li>• Expand brand untuk pilih varian spesifik</li>
                                <li>• Map ke produk existing atau buat baru</li>
                                <li>• Harga otomatis pakai margin Bronze tier</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Upload className="w-5 h-5" />
                            Buka Bulk Import
                        </button>
                    </div>

                    {/* Method 2: Single Code Import */}
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all">
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                            <Code className="w-8 h-8 text-white" />
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 mb-3">
                            Import via Kode Produk
                        </h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Import produk satu-per-satu menggunakan SKU/kode produk TokoVoucher.
                            Sistem otomatis deteksi apakah perlu buat produk baru atau tambah varian.
                        </p>

                        <div className="bg-teal-50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-teal-800 font-medium">
                                🎯 <strong>Cara Kerja:</strong>
                            </p>
                            <ul className="text-sm text-teal-700 mt-2 space-y-1 ml-4">
                                <li>• Masukkan kode produk TokoVoucher</li>
                                <li>• Sistem fetch detail dari provider</li>
                                <li>• Jika nama produk baru → buat produk</li>
                                <li>• Jika nama sudah ada → tambah varian</li>
                            </ul>
                        </div>

                        <Link
                            href="/admin/topup/products/tokovoucher/import-single"
                            className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Code className="w-5 h-5" />
                            Import Single Code
                        </Link>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <Zap className="w-5 h-5 text-amber-900" />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900 mb-2">Info Penting</h3>
                            <ul className="text-sm text-amber-800 space-y-1">
                                <li>• Harga jual otomatis dihitung dengan margin Bronze tier</li>
                                <li>• SKU produk harus unique di sistem</li>
                                <li>• Status produk sync otomatis dari TokoVoucher</li>
                                <li>• Untuk manage provider settings, gunakan menu <Link href="/admin/settings/providers" className="underline font-semibold">Manage Providers</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Import Modal */}
            {showBulkModal && (
                <BulkImportModal
                    isOpen={showBulkModal}
                    onClose={() => setShowBulkModal(false)}
                    provider="tokovoucher"
                    defaultCategoryFilter="GAME"
                    onImportComplete={() => {
                        setShowBulkModal(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
