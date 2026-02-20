'use client';

import { useState } from 'react';
import { Search, Plus, Package, RefreshCw, ArrowRight, Check, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import BulkImportModal from '@/components/features/admin/BulkImportModal';

export default function ProductImportPage() {
    const [activeTab, setActiveTab] = useState<'tokovoucher' | 'digiflazz'>('tokovoucher');
    const [productId, setProductId] = useState('');
    const [productData, setProductData] = useState<any>(null);
    const [mode, setMode] = useState<'ADD_VARIANT' | 'CREATE_PRODUCT'>('ADD_VARIANT');
    const [targetProductId, setTargetProductId] = useState('');
    const [productName, setProductName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);

    async function fetchProduct() {
        if (!productId) {
            toast.error('Please enter a Product ID');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/tokovoucher/fetch-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });

            const data = await res.json();

            if (res.ok && data.status === 1) {
                setProductData(data);

                // Auto-select logic
                if (data.suggestions.existingProducts.length > 0) {
                    setTargetProductId(data.suggestions.existingProducts[0].id);
                }
                if (data.suggestions.suggestedCategory) {
                    setCategoryId(data.suggestions.suggestedCategory.id);
                }
                // Auto-fill product name
                setProductName(data.data.nama_produk);
                toast.success('Product found!');
            } else {
                setProductData(null);
                toast.error(data.error || 'Product not found');
            }
        } catch (err) {
            toast.error('Network error occurred');
        }
        setLoading(false);
    }

    async function handleImport() {
        if (!productData) return;

        if (mode === 'CREATE_PRODUCT' && (!productName || !categoryId)) {
            toast.error('Please enter Product Name and Category ID');
            return;
        }

        if (mode === 'ADD_VARIANT' && !targetProductId) {
            toast.error('Please select a target product');
            return;
        }

        setImporting(true);
        try {
            const res = await fetch('/api/admin/tokovoucher/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    tokovoucherData: productData.data,
                    targetProductId: mode === 'ADD_VARIANT' ? targetProductId : undefined,
                    productName: mode === 'CREATE_PRODUCT' ? productName : undefined,
                    categoryId: mode === 'CREATE_PRODUCT' ? categoryId : undefined
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success('Product imported successfully!');
                // Reset form partly
                setProductData(null);
                setProductId('');
            } else {
                toast.error(data.error || 'Import failed');
            }
        } catch (err) {
            toast.error('Failed to import product');
        }
        setImporting(false);
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Product Import</h1>
                <p className="text-gray-500 mt-1">Import products directly from providers</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('tokovoucher')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'tokovoucher' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'tokovoucher' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        TokoVoucher
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('digiflazz')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'digiflazz' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'digiflazz' ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                        Digiflazz
                    </span>
                </button>
            </div>

            {/* TokoVoucher Tab Content */}
            {activeTab === 'tokovoucher' && (
                <div className="space-y-8">
                    {/* Bulk Import Card - NEW */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-dashed border-green-200 rounded-2xl p-8">
                        <div className="max-w-md mx-auto text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                                <Upload className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Bulk Import Game (TokoVoucher)</h3>
                            <p className="text-gray-600 mb-6">
                                Import multiple game products at once from TokoVoucher catalog.
                                Supports auto tier pricing & 1-hour cache.
                            </p>
                            <button
                                onClick={() => setBulkImportOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium shadow-sm hover:shadow transition-all"
                            >
                                <Package className="w-5 h-5" />
                                Open Bulk Import
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Step 1: Search */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">1</span>
                                    Search Single Product
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Code / ID</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={productId}
                                                onChange={(e) => setProductId(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && fetchProduct()}
                                                placeholder="Ex: FF5, ML86, 2"
                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                            />
                                            <button
                                                onClick={fetchProduct}
                                                disabled={loading}
                                                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                            >
                                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2">
                                            Enter the specific product code from TokoVoucher (e.g., 'FF5').
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                <h3 className="font-medium text-blue-900 text-sm mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Import Tips
                                </h3>
                                <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
                                    <li>Use 'Add as Variant' to update existing game products.</li>
                                    <li>Use 'Create New Product' for new games not in catalog.</li>
                                    <li>Price includes automatic Margin (Bronze Tier).</li>
                                </ul>
                            </div>
                        </div>

                        {/* Step 2: Configure & Import */}
                        <div className="lg:col-span-2">
                            {productData ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                                        <div>
                                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">2</span>
                                                Configure Import
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1 ml-8">Review details and select import mode</p>
                                        </div>
                                        <div className="bg-white border px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 shadow-sm">
                                            ID: {productData.data.code}
                                        </div>
                                    </div>

                                    <div className="p-6 grid grid-cols-2 gap-6">
                                        {/* Product Info Card */}
                                        <div className="col-span-2 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">Product Name</span>
                                                    <span className="font-medium text-gray-900">{productData.data.nama_produk}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">Provider Category</span>
                                                    <span className="font-medium text-gray-900">{productData.data.category_name}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">Provider Price</span>
                                                    <span className="font-medium text-gray-900">Rp {Number(productData.data.price).toLocaleString('id-ID')}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">Est. Sell Price (+10%)</span>
                                                    <span className="font-bold text-green-600">Rp {Math.round(Number(productData.data.price) * 1.1).toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mode Selection */}
                                        <div className="col-span-2 space-y-4">
                                            <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${mode === 'ADD_VARIANT' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                                <div className="flex items-start gap-4">
                                                    <input
                                                        type="radio"
                                                        checked={mode === 'ADD_VARIANT'}
                                                        onChange={() => setMode('ADD_VARIANT')}
                                                        className="mt-1 w-4 h-4 text-green-600"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">Add as Variant to Existing Product</div>
                                                        <p className="text-sm text-gray-500 mt-1">Add this item (e.g. "5 Diamonds") to an existing parent product (e.g. "Free Fire").</p>

                                                        {mode === 'ADD_VARIANT' && (
                                                            <div className="mt-4 animate-in fade-in zoom-in-95 duration-200">
                                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Select Parent Product</label>
                                                                <select
                                                                    value={targetProductId}
                                                                    onChange={(e) => setTargetProductId(e.target.value)}
                                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                                                >
                                                                    <option value="">-- Select Product --</option>
                                                                    {productData.suggestions.existingProducts.map((p: any) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name} ({p.categoryName})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {productData.suggestions.existingProducts.length === 0 && (
                                                                    <p className="text-xs text-orange-500 mt-1">No similar products found. Consider creating new.</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>

                                            <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${mode === 'CREATE_PRODUCT' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                                <div className="flex items-start gap-4">
                                                    <input
                                                        type="radio"
                                                        checked={mode === 'CREATE_PRODUCT'}
                                                        onChange={() => setMode('CREATE_PRODUCT')}
                                                        className="mt-1 w-4 h-4 text-green-600"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">Create New Product</div>
                                                        <p className="text-sm text-gray-500 mt-1">Create a brand new product card and add this as the first variant.</p>

                                                        {mode === 'CREATE_PRODUCT' && (
                                                            <div className="mt-4 grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">New Product Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={productName}
                                                                        onChange={(e) => setProductName(e.target.value)}
                                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                                                        placeholder="Ex: Free Fire"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                                                                    <select
                                                                        value={categoryId}
                                                                        onChange={(e) => setCategoryId(e.target.value)}
                                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                                                    >
                                                                        <option value="">-- Select Category --</option>
                                                                        {productData.suggestions.categories.map((c: any) => (
                                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={handleImport}
                                            disabled={importing}
                                            className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium shadow-sm hover:shadow flex items-center gap-2 transition-all"
                                        >
                                            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                                            {importing ? 'Importing...' : 'Confirm Import'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-64 flex flex-col items-center justify-center text-gray-400">
                                    <Search className="w-10 h-10 mb-3 opacity-20" />
                                    <p>Search via Product Code to begin import</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'digiflazz' && (
                <div className="space-y-6">
                    {/* Bulk Import Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-dashed border-purple-200 rounded-2xl p-8">
                        <div className="max-w-md mx-auto text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
                                <Upload className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Bulk Import Game</h3>
                            <p className="text-gray-600 mb-6">
                                Import multiple game products at once by selecting brands from Digiflazz price list.
                                Auto tier pricing will be applied.
                            </p>
                            <button
                                onClick={() => setBulkImportOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium shadow-sm hover:shadow transition-all"
                            >
                                <Package className="w-5 h-5" />
                                Open Bulk Import
                            </button>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="text-sm font-medium text-gray-500 mb-1">Cache</div>
                            <div className="text-lg font-bold text-gray-900">10 Minutes</div>
                            <div className="text-xs text-gray-500 mt-1">Price list cached</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="text-sm font-medium text-gray-500 mb-1">Tier Pricing</div>
                            <div className="text-lg font-bold text-gray-900">Auto Applied</div>
                            <div className="text-xs text-gray-500 mt-1">Based on margin config</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="text-sm font-medium text-gray-500 mb-1">Import Mode</div>
                            <div className="text-lg font-bold text-gray-900">By Brand</div>
                            <div className="text-xs text-gray-500 mt-1">Select multiple brands</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            <BulkImportModal
                isOpen={bulkImportOpen}
                onClose={() => setBulkImportOpen(false)}
                provider={activeTab} // Dynamic Provider from Tab
                onImportComplete={() => {
                    // Refresh products list after successful import
                    window.location.reload();
                }}
            />
        </div>
    );
}
