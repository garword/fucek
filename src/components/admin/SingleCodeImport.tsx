'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Save, ArrowLeft, Package, DollarSign, Tag, CheckCircle2, AlertCircle } from 'lucide-react';

interface SingleCodeImportProps {
    provider: 'digiflazz' | 'tokovoucher';
}

interface PreviewData {
    sku: string;
    name: string;
    providerPrice: number;
    sellingPrice: number;
    margin: number;
    brand: string;
    status: boolean;
}

interface SuggestedProduct {
    id: number;
    name: string;
    slug: string;
    variantCount: number;
}

export default function SingleCodeImport({ provider }: SingleCodeImportProps) {
    const router = useRouter();

    // Step state
    const [step, setStep] = useState<'input' | 'preview'>('input');

    // Input step
    const [productCode, setProductCode] = useState('');
    const [validating, setValidating] = useState(false);

    // Preview step
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([]);
    const [action, setAction] = useState<'create_new' | 'add_to_existing'>('create_new');
    const [productName, setProductName] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [importing, setImporting] = useState(false);

    const providerName = provider === 'tokovoucher' ? 'TokoVoucher' : 'Digiflazz';
    const colorScheme = provider === 'tokovoucher'
        ? { primary: 'green', secondary: 'emerald' }
        : { primary: 'blue', secondary: 'indigo' };

    // Step 1: Validate product code
    const handleValidate = async () => {
        if (!productCode.trim()) {
            alert('Masukkan kode produk terlebih dahulu!');
            return;
        }

        setValidating(true);

        try {
            const res = await fetch(`/api/admin/topup/${provider}/validate-product?code=${encodeURIComponent(productCode)}`);
            const data = await res.json();

            if (res.ok && data.success) {
                setPreviewData(data.product);
                setSuggestedProducts(data.suggestedProducts || []);

                // Auto-select action based on suggestions
                if (data.suggestedProducts && data.suggestedProducts.length > 0) {
                    setAction('add_to_existing');
                    setSelectedProductId(data.suggestedProducts[0].id);
                } else {
                    setAction('create_new');
                    setProductName(data.product.brand);
                }

                setStep('preview');
            } else {
                alert(`❌ ${data.error || 'Produk tidak ditemukan'}`);
            }
        } catch (error) {
            console.error('Error validating product:', error);
            alert('Gagal validasi produk. Periksa koneksi internet.');
        } finally {
            setValidating(false);
        }
    };

    // Step 2: Import product
    const handleImport = async () => {
        if (action === 'create_new' && !productName.trim()) {
            alert('Masukkan nama produk untuk membuat produk baru!');
            return;
        }

        if (action === 'add_to_existing' && !selectedProductId) {
            alert('Pilih produk untuk menambahkan varian!');
            return;
        }

        setImporting(true);

        try {
            const body = {
                productCode,
                action,
                ...(action === 'create_new' ? { productName } : { existingProductId: selectedProductId })
            };

            const res = await fetch(`/api/admin/topup/${provider}/import-single`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert(`✅ ${data.message}`);
                router.push('/admin/products?type=GAME');
            } else {
                alert(`❌ ${data.error || 'Gagal import produk'}`);
            }
        } catch (error) {
            console.error('Error importing product:', error);
            alert('Gagal import produk. Periksa koneksi internet.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-${colorScheme.primary}-50 via-${colorScheme.secondary}-50 to-purple-50 p-4 md:p-8`}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <button
                        onClick={() => step === 'preview' ? setStep('input') : router.back()}
                        className="p-3 hover:bg-white/50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-${colorScheme.primary}-600 to-${colorScheme.secondary}-600`}>
                            Import via Kode Produk - {providerName}
                        </h1>
                        <p className="text-gray-600 mt-2 font-medium">
                            {step === 'input' ? 'Masukkan kode produk untuk validasi' : 'Preview dan pilih action'}
                        </p>
                    </div>
                </div>

                {/* Step 1: Input */}
                {step === 'input' && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                        <div className={`p-8 border-b border-gray-100 bg-gradient-to-r from-${colorScheme.primary}-500 to-${colorScheme.secondary}-500`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                    <span className={`text-xl font-black text-${colorScheme.primary}-600`}>1</span>
                                </div>
                                <h2 className="text-2xl font-black text-white">Masukkan Kode Produk</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <Package className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={productCode}
                                        onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                                        onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
                                        placeholder={`Contoh: ${provider === 'digiflazz' ? 'ml5, ff100' : 'ML5D, FF100D'}`}
                                        className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-white/30 bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-white/50 focus:border-white transition-all outline-none font-mono text-lg font-bold"
                                        disabled={validating}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <button
                                onClick={handleValidate}
                                disabled={validating || !productCode.trim()}
                                className={`w-full py-5 bg-gradient-to-r from-${colorScheme.primary}-500 to-${colorScheme.secondary}-600 text-white rounded-2xl font-black text-xl hover:from-${colorScheme.primary}-600 hover:to-${colorScheme.secondary}-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-2xl hover:shadow-${colorScheme.primary}-300/50 hover:scale-[1.02] active:scale-[0.98]`}
                            >
                                {validating ? (
                                    <>
                                        <Loader2 className="w-7 h-7 animate-spin" />
                                        Mengecek Produk...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-7 h-7" />
                                        Cek Produk
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Preview & Selection */}
                {step === 'preview' && previewData && (
                    <div className="space-y-6">
                        {/* Preview Card */}
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                                <h2 className="text-2xl font-black text-gray-900">Produk Ditemukan</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-500 mb-1">SKU</p>
                                    <p className="font-mono font-bold text-gray-900">{previewData.sku}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-500 mb-1">Status</p>
                                    <p className={`font-bold ${previewData.status ? 'text-green-600' : 'text-red-600'}`}>
                                        {previewData.status ? '✅ Aktif' : '❌ Nonaktif'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                                    <p className="text-sm text-gray-500 mb-1">Nama Varian</p>
                                    <p className="font-bold text-gray-900">{previewData.name}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-500 mb-1">Harga Provider</p>
                                    <p className="font-bold text-gray-900">Rp {previewData.providerPrice.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4">
                                    <p className="text-sm text-green-600 mb-1">Harga Jual (Margin {previewData.margin}%)</p>
                                    <p className="font-bold text-green-700 text-xl">Rp {previewData.sellingPrice.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Selection */}
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                            <h3 className="text-xl font-black text-gray-900 mb-6">Pilih Action Import</h3>

                            <div className="space-y-4">
                                {/* Create New */}
                                <label className={`block p-5 rounded-2xl border-2 cursor-pointer transition-all ${action === 'create_new' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="action"
                                            value="create_new"
                                            checked={action === 'create_new'}
                                            onChange={() => setAction('create_new')}
                                            className="w-5 h-5 text-blue-600"
                                        />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">Buat Produk Baru</p>
                                            <p className="text-sm text-gray-600">Produk baru akan dibuat dengan 1 varian</p>
                                        </div>
                                    </div>
                                    {action === 'create_new' && (
                                        <div className="mt-4 pl-8">
                                            <input
                                                type="text"
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                                placeholder="Nama Produk (contoh: Mobile Legends)"
                                                className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    )}
                                </label>

                                {/* Add to Existing */}
                                <label className={`block p-5 rounded-2xl border-2 cursor-pointer transition-all ${action === 'add_to_existing' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="action"
                                            value="add_to_existing"
                                            checked={action === 'add_to_existing'}
                                            onChange={() => setAction('add_to_existing')}
                                            disabled={suggestedProducts.length === 0}
                                            className="w-5 h-5 text-green-600"
                                        />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">Tambah ke Produk Existing</p>
                                            <p className="text-sm text-gray-600">
                                                {suggestedProducts.length > 0
                                                    ? `${suggestedProducts.length} produk ditemukan`
                                                    : 'Tidak ada produk serupa'}
                                            </p>
                                        </div>
                                    </div>
                                    {action === 'add_to_existing' && suggestedProducts.length > 0 && (
                                        <div className="mt-4 pl-8">
                                            <select
                                                value={selectedProductId || ''}
                                                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-green-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all"
                                            >
                                                {suggestedProducts.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.variantCount} varian)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Import Button */}
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className={`w-full py-5 bg-gradient-to-r from-${colorScheme.primary}-500 to-${colorScheme.secondary}-600 text-white rounded-2xl font-black text-xl hover:from-${colorScheme.primary}-600 hover:to-${colorScheme.secondary}-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-2xl hover:shadow-${colorScheme.primary}-300/50 hover:scale-[1.02] active:scale-[0.98]`}
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="w-7 h-7 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Save className="w-7 h-7" />
                                    Import Produk
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
