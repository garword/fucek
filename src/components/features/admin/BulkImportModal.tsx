'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, CheckCircle2, Package, ChevronDown, ChevronRight, Minus, AlertTriangle, Edit2, Link as LinkIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
    sku: string;
    name: string;
    price: number;
    stock: number;
    status: boolean;
    description: string;
}

interface BrandGroup {
    name: string;
    category: string;
    count: number;
    products: Product[];
}

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider?: 'digiflazz' | 'tokovoucher';
    defaultCategoryFilter?: 'ALL' | 'GAME' | 'PULSA'; // Auto-filter by context
    onImportComplete?: () => void;
}

// Sub-component for Product Search
function ProductSearchInput({ onSelect, initialValue }: { onSelect: (product: { id: string, name: string } | null) => void, initialValue?: { id: string, name: string } }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function search(q: string) {
        setQuery(q);
        if (q.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/products?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.map((p: any) => ({ id: p.id, name: p.name })));
                setIsOpen(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div ref={wrapperRef} className="relative min-w-[200px]">
            {initialValue ? (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm border border-blue-200">
                    <LinkIcon className="w-3 h-3" />
                    <span className="truncate max-w-[150px] font-medium">{initialValue.name}</span>
                    <button onClick={() => onSelect(null)} className="hover:text-blue-900 ml-auto"><X className="w-3 h-3" /></button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => search(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Map to existing..."
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    {loading && <Loader2 className="w-3 h-3 absolute right-2 top-2 animate-spin text-gray-400" />}
                    {isOpen && results.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {results.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => {
                                        onSelect(r);
                                        setQuery('');
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700 truncate block"
                                >
                                    {r.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function BulkImportModal({ isOpen, onClose, provider = 'digiflazz', defaultCategoryFilter = 'ALL', onImportComplete }: BulkImportModalProps) {
    const [brands, setBrands] = useState<BrandGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Category filter - auto-set by context (GAME from game menu, PULSA from pulsa menu)
    const categoryFilter = defaultCategoryFilter;

    // Track selected products by SKU
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);

    // NEW: Brand Mapping State
    const [brandMapping, setBrandMapping] = useState<Record<string, { id: string, name: string }>>({});

    // Load brands when modal opens or provider changes (filter is fixed by context)
    useEffect(() => {
        if (isOpen) {
            loadBrands();
            setImportResult(null);
            setSelectedProducts(new Set());
            setBrandMapping({}); // Reset mapping on open
        }
    }, [isOpen, provider, categoryFilter]); // categoryFilter is now a prop, so it should be a dependency

    // Filter brands based on search
    const filteredBrands = brands.filter(brand =>
        brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    async function loadBrands() {
        setLoading(true);
        setBrands([]); // Clear previous brands
        setSelectedProducts(new Set()); // Reset selections on provider change

        try {
            const endpoint = provider === 'tokovoucher'
                ? '/api/admin/topup/tokovoucher/brands'
                : '/api/admin/topup/digiflazz/brands';

            // Add category filter parameter
            const url = `${endpoint}?type=${categoryFilter}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                setBrands(data.brands);

                // Show filter info in toast
                const filterInfo = categoryFilter !== 'ALL' ? ` (${categoryFilter}: ${data.filteredCount}/${data.totalBrands})` : '';
                if (data.source === 'cache') {
                    toast.info(`Data ${provider} loaded from cache${filterInfo}`);
                } else {
                    toast.success(`Data ${provider} loaded${filterInfo}`);
                }
            } else {
                toast.error(data.message || `Failed to load ${provider} brands`);
                console.error('API Error:', data);
            }
        } catch (error) {
            toast.error('Network error');
            console.error('Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    }

    function getBrandKey(brand: BrandGroup) {
        return `${brand.name || 'unknown'}-${brand.category || 'unknown'}`;
    }

    function toggleBrandExpand(brandKey: string) {
        const newExpanded = new Set(expandedBrands);
        if (newExpanded.has(brandKey)) {
            newExpanded.delete(brandKey);
        } else {
            newExpanded.add(brandKey);
        }
        setExpandedBrands(newExpanded);
    }

    function getBrandProducts(brand: BrandGroup): Product[] {
        return brand.products || [];
    }

    function getSelectedProductsForBrand(brand: BrandGroup): number {
        const products = getBrandProducts(brand).filter(p => p.sku); // Only valid SKUs
        return products.filter(p => selectedProducts.has(p.sku)).length;
    }

    function isBrandFullySelected(brand: BrandGroup): boolean {
        const products = getBrandProducts(brand).filter(p => p.sku); // Only valid SKUs
        if (products.length === 0) return false;
        return products.every(p => selectedProducts.has(p.sku));
    }

    function isBrandPartiallySelected(brand: BrandGroup): boolean {
        const selectedCount = getSelectedProductsForBrand(brand);
        return selectedCount > 0 && selectedCount < getBrandProducts(brand).length;
    }

    function toggleBrand(brand: BrandGroup) {
        const products = getBrandProducts(brand).filter(p => p.sku); // Only valid SKUs
        const newSelected = new Set(selectedProducts);

        if (isBrandFullySelected(brand)) {
            // Uncheck all products in this brand
            products.forEach(p => newSelected.delete(p.sku));
        } else {
            // Check all products in this brand
            products.forEach(p => newSelected.add(p.sku));
        }

        setSelectedProducts(newSelected);
    }

    function toggleProduct(sku: string) {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(sku)) {
            newSelected.delete(sku);
        } else {
            newSelected.add(sku);
        }
        setSelectedProducts(newSelected);
    }

    function toggleAll() {
        const allProducts = filteredBrands.flatMap(b => getBrandProducts(b)).filter(p => p.sku); // Only valid SKUs
        const allSkus = allProducts.map(p => p.sku);

        if (selectedProducts.size === allSkus.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(allSkus));
        }
    }

    async function handleBulkImport() {
        if (selectedProducts.size === 0) {
            toast.error('Pilih minimal satu produk');
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            // Build product data with brand info
            const selectedProductData: any[] = [];

            // Prepare Mapping Payload: { "BrandName": "targetProductId" }
            const mappingPayload: Record<string, string> = {};
            Object.entries(brandMapping).forEach(([brandName, product]) => {
                mappingPayload[brandName] = product.id;
            });

            brands.forEach(brand => {
                const products = getBrandProducts(brand);
                products.forEach(product => {
                    if (selectedProducts.has(product.sku)) {
                        selectedProductData.push({
                            ...product,
                            brand: brand.name,
                            category: brand.category
                        });
                    }
                });
            });

            if (selectedProductData.length === 0) {
                toast.error('Tidak ada produk untuk diimport');
                setImporting(false);
                return;
            }

            const res = await fetch('/api/admin/products/import-brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: provider.toUpperCase(), // 'DIGIFLAZZ' or 'TOKOVOUCHER'
                    brands: Array.from(new Set(selectedProductData.map(p => p.brand))), // Unique brands
                    products: selectedProductData,
                    brandMapping: mappingPayload // NEW: Send mapping
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success(data.message);
                setImportResult({ success: true, message: data.message });

                // Call onImportComplete callback if provided
                if (onImportComplete) {
                    onImportComplete();
                }

                // Close modal after short delay
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                toast.error(data.message || data.error || 'Import gagal');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan koneksi');
            console.error('Import Error:', error);
        } finally {
            setImporting(false);
        }
    }

    function handleReset() {
        setSelectedProducts(new Set());
        setSearchTerm('');
        setImportResult(null);
        setExpandedBrands(new Set());
        setBrandMapping({});
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${provider === 'tokovoucher' ? 'bg-green-100' : 'bg-blue-100'}`}>
                            <Package className={`w-5 h-5 ${provider === 'tokovoucher' ? 'text-green-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Import Game dari {provider === 'tokovoucher' ? 'TokoVoucher' : 'Digiflazz'}</h2>
                            <p className="text-sm text-gray-500">Pilih brand dan varian yang ingin Anda jual.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Info Banner with Auto-Filter Indicator */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-3">
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                                {categoryFilter === 'GAME' && '🎮 Import Produk Game'}
                                {categoryFilter === 'PULSA' && '📱 Import Pulsa & Data'}
                                {categoryFilter === 'ALL' && '📦 Import Semua Kategori'}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">Pilih produk, lalu klik <strong>Import XX item</strong>.</p>
                        </div>
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                    </div>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-200 space-y-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari Brand (Mobile Legends, PUBG...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                    </div>

                    {/* Select All Checkbox */}
                    {filteredBrands.length > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedProducts.size > 0 && selectedProducts.size === filteredBrands.flatMap(b => getBrandProducts(b)).length}
                                onChange={toggleAll}
                                className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Pilih Semua ({filteredBrands.flatMap(b => getBrandProducts(b)).length} produk)
                            </span>
                        </label>
                    )}
                </div>

                {/* Brand List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                            <p className="text-gray-500">Loading brands...</p>
                        </div>
                    ) : filteredBrands.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No brands found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredBrands.map((brand) => {
                                const brandKey = getBrandKey(brand);
                                const isExpanded = expandedBrands.has(brandKey);
                                const isFullySelected = isBrandFullySelected(brand);
                                const isPartiallySelected = isBrandPartiallySelected(brand);
                                const selectedCount = getSelectedProductsForBrand(brand);
                                const products = getBrandProducts(brand);

                                return (
                                    <div key={brandKey} className="border border-gray-200 rounded-xl overflow-visible">
                                        {/* Brand Header */}
                                        <div className={`grid grid-cols-[auto_1fr_auto] gap-3 p-4 transition-colors items-center ${isFullySelected ? 'bg-purple-50/30' : 'bg-white hover:bg-gray-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={isFullySelected}
                                                ref={(el) => { if (el) el.indeterminate = isPartiallySelected; }}
                                                onChange={() => toggleBrand(brand)}
                                                className="w-5 h-5 text-purple-600 rounded"
                                            />

                                            <div className="flex items-center justify-between gap-4">
                                                <button
                                                    onClick={() => toggleBrandExpand(brandKey)}
                                                    className="flex items-center gap-2 text-left group"
                                                >
                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                    <div>
                                                        <div className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">{brand.name || 'Unknown Brand'}</div>
                                                        <div className="text-xs text-gray-500">{brand.count} varian • {brand.category || 'Uncategorized'}</div>
                                                    </div>
                                                </button>

                                                {/* MAPPING UI */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Map To:</span>
                                                    <ProductSearchInput
                                                        initialValue={brandMapping[brand.name || '']}
                                                        onSelect={(p) => setBrandMapping(prev => {
                                                            const next = { ...prev };
                                                            const key = brand.name || 'unknown';
                                                            if (p) next[key] = p;
                                                            else delete next[key];
                                                            return next;
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Product List (Expandable) */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50 pl-12 pr-4 py-2">
                                                {products.filter(p => p.sku).map((product) => {
                                                    const isSelected = selectedProducts.has(product.sku);
                                                    return (
                                                        <label
                                                            key={product.sku}
                                                            className={`flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0 cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleProduct(product.sku)}
                                                                className="w-3.5 h-3.5 text-purple-600 rounded"
                                                            />
                                                            <div className="flex-1 text-sm text-gray-700 truncate">{product.name || 'Unnamed Product'}</div>
                                                            <div className="text-xs font-mono text-gray-400">{product.sku || 'N/A'}</div>
                                                            <div className="text-xs font-medium text-green-600">Rp {(product.price || 0).toLocaleString('id-ID')}</div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Import Result (if any) */}
                {importResult && importResult.success && (
                    <div className="px-6 py-4 bg-green-50 border-t border-green-100">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <div className="font-medium text-green-900 mb-1">Import Berhasil!</div>
                                <div className="text-green-700">{importResult.message}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600">
                        <strong>{selectedProducts.size}</strong> Produk dipilih
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleReset}
                            className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleBulkImport}
                            disabled={importing || selectedProducts.size === 0}
                            className={`px-6 py-2.5 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 ${provider === 'tokovoucher' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Package className="w-4 h-4" />
                                    Import ({selectedProducts.size})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
