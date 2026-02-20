'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Save, ArrowLeft, Package, DollarSign, Tag, Zap } from 'lucide-react';

export default function AddTopupGameProductPage() {
    const router = useRouter();
    const [productCode, setProductCode] = useState('');
    const [productName, setProductName] = useState('');
    const [basePrice, setBasePrice] = useState(0);
    const [sellingPrice, setSellingPrice] = useState(0);
    const [categoryName, setCategoryName] = useState('');
    const [margin, setMargin] = useState(5);
    const [markup, setMarkup] = useState(25);

    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [productValidated, setProductValidated] = useState(false);

    // Fetch margin from settings
    useEffect(() => {
        fetch('/api/admin/topup/config')
            .then(res => res.json())
            .then(data => {
                if (data.margin) {
                    setMargin(parseFloat(data.margin));
                }
            })
            .catch(err => console.error('Failed to fetch margin:', err));
    }, []);

    // Calculate selling price whenever base price or margin changes
    useEffect(() => {
        if (basePrice > 0) {
            const calculated = (basePrice + markup) * (1 + margin / 100);
            setSellingPrice(Math.round(calculated));
        }
    }, [basePrice, margin, markup]);

    const handleCheckProduct = async () => {
        if (!productCode.trim()) {
            alert('Masukkan kode produk terlebih dahulu!');
            return;
        }

        setChecking(true);
        setProductValidated(false);

        try {
            const res = await fetch('/api/admin/topup/apigames/validate-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_code: productCode })
            });

            const data = await res.json();

            if (data.success) {
                setProductName(data.name);
                setBasePrice(data.base_price);
                setProductValidated(true);

                // Auto-extract category from product name
                const gameName = extractGameName(data.name);
                if (gameName) {
                    setCategoryName(gameName);
                }
            } else {
                alert(data.error || 'Produk tidak ditemukan di APIGames');
                setProductName('');
                setBasePrice(0);
            }
        } catch (error) {
            console.error('Error checking product:', error);
            alert('Gagal mengecek produk');
        } finally {
            setChecking(false);
        }
    };

    const extractGameName = (productName: string): string => {
        // Extract game name from product name
        if (productName.toLowerCase().includes('mobile legends')) return 'Mobile Legends';
        if (productName.toLowerCase().includes('free fire')) return 'Free Fire';
        if (productName.toLowerCase().includes('pubg')) return 'PUBG Mobile';
        if (productName.toLowerCase().includes('genshin')) return 'Genshin Impact';
        if (productName.toLowerCase().includes('honkai')) return 'Honkai Star Rail';
        if (productName.toLowerCase().includes('valorant')) return 'Valorant';
        if (productName.toLowerCase().includes('arena of valor') || productName.toLowerCase().includes('aov')) return 'Arena of Valor';
        return '';
    };

    const handleSaveProduct = async () => {
        if (!productValidated) {
            alert('Silakan cek produk terlebih dahulu!');
            return;
        }

        if (!categoryName.trim()) {
            alert('Pilih atau masukkan kategori game!');
            return;
        }

        setSaving(true);

        try {
            const res = await fetch('/api/admin/topup/products/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku: productCode,
                    name: productName,
                    base_price: basePrice,
                    selling_price: sellingPrice,
                    category_name: categoryName
                })
            });

            const data = await res.json();

            if (data.success) {
                alert('✅ Produk berhasil ditambahkan!');
                router.push('/admin/topup/products');
            } else {
                alert(data.error || 'Gagal menyimpan produk');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Gagal menyimpan produk');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-3 hover:bg-white/50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            Tambah Produk Topup Game
                        </h1>
                        <p className="text-gray-600 mt-2 font-medium">Auto-sync dari APIGames dengan 1 klik</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    {/* Step 1: Product Code */}
                    <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-xl font-black text-indigo-600">1</span>
                            </div>
                            <h2 className="text-2xl font-black text-white">Masukkan Kode Produk</h2>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <Package className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={productCode}
                                    onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                                    placeholder="Contoh: ML80, FF100, PUBGM60"
                                    className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-white/30 bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-white/50 focus:border-white transition-all outline-none font-mono text-lg font-bold"
                                    disabled={checking}
                                />
                            </div>
                            <button
                                onClick={handleCheckProduct}
                                disabled={checking || !productCode.trim()}
                                className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3 shadow-lg hover:shadow-xl"
                            >
                                {checking ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-6 h-6" />
                                        Cek Produk
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-white/90 mt-3 text-sm font-medium">
                            💡 Sistem akan otomatis fetch nama & harga dari APIGames
                        </p>
                    </div>

                    {/* Step 2: Product Details (shown after validation) */}
                    {productValidated && (
                        <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Step 2 Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-xl font-black text-white">✓</span>
                                </div>
                                <h2 className="text-2xl font-black text-gray-800">Produk Ditemukan!</h2>
                            </div>

                            {/* Product Name Display */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Nama Produk
                                </label>
                                <div className="text-2xl font-black text-gray-900">
                                    {productName}
                                </div>
                                <div className="text-sm text-gray-500 font-mono mt-2">
                                    SKU: {productCode}
                                </div>
                            </div>

                            {/* Pricing Card */}
                            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 rounded-2xl border-2 border-emerald-200 space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <DollarSign className="w-5 h-5 text-emerald-600" />
                                    <h3 className="font-black text-gray-900 text-lg">Kalkulasi Harga</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl">
                                        <div className="text-xs text-gray-600 font-semibold mb-1">Harga Modal</div>
                                        <div className="text-lg font-black text-gray-900">
                                            Rp {basePrice.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl">
                                        <div className="text-xs text-gray-600 font-semibold mb-1">Markup + Margin</div>
                                        <div className="text-lg font-black text-blue-600">
                                            +Rp {markup} + {margin}%
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-orange-400 to-red-500 p-4 rounded-xl shadow-lg">
                                        <div className="text-xs text-white/90 font-semibold mb-1">Harga Jual</div>
                                        <div className="text-lg font-black text-white">
                                            Rp {sellingPrice.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/50 p-4 rounded-xl mt-4">
                                    <div className="text-xs text-gray-600 font-semibold mb-2">📊 Rincian:</div>
                                    <div className="text-sm text-gray-700 font-mono">
                                        ({basePrice.toLocaleString()} + {markup}) × (1 + {margin}/100) = <span className="font-black text-orange-600">{sellingPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Kategori Game
                                </label>
                                <input
                                    type="text"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="Mobile Legends, Free Fire, PUBG Mobile..."
                                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all outline-none text-lg font-semibold"
                                />
                                <p className="text-xs text-gray-500 mt-2 font-medium">
                                    💡 Kategori akan dibuat otomatis jika belum ada
                                </p>
                            </div>

                            {/* Save Button */}
                            <div className="pt-6">
                                <button
                                    onClick={handleSaveProduct}
                                    disabled={saving || !categoryName.trim()}
                                    className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-2xl hover:shadow-green-300/50 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-7 h-7 animate-spin" />
                                            Menyimpan Produk...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-7 h-7" />
                                            Simpan & Publish Produk
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!productValidated && (
                        <div className="p-16 text-center">
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                                <Package className="w-12 h-12 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-semibold text-lg">
                                Masukkan kode produk & klik &quot;Cek Produk&quot; untuk melanjutkan
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
