'use client';

import { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, MoreVertical, Edit, Trash2,
    CheckCircle, XCircle, AlertCircle, RefreshCw, X,
    ExternalLink, ChevronDown, ChevronUp, Package,
    Smartphone, Gamepad2, Globe, Tag, Sparkles, Image as ImageIcon,
    Save, Loader2,
    Upload, FileSpreadsheet, Download
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCompactNumber } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import * as XLSX from 'xlsx';

type Product = {
    id: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    isActive: boolean;
    instantDeliveryInfo: string | null;
    warrantyInfo: string | null;
    supportInfo: string | null;
    ratingValue: number;
    reviewCount: number;
    soldCount: number;
    wishlistCount: number;
    category: { name: string };
    _count: { variants: number };
};

type Category = { id: string; name: string };

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const typeFilter = searchParams.get('type');
    const { showToast } = useToast();

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeActionId, setActiveActionId] = useState<string | null>(null);

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importForm, setImportForm] = useState({ provider: 'DIGIFLAZZ', margin: '' });
    const [availableBrands, setAvailableBrands] = useState<any[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(false);
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [brandSearch, setBrandSearch] = useState('');
    const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

    const [isDevelopment, setIsDevelopment] = useState(false);


    // Margin Config State (Individual)
    const [isMarginModalOpen, setIsMarginModalOpen] = useState(false);
    const [categoryMargin, setCategoryMargin] = useState('0');
    const [loadingMargin, setLoadingMargin] = useState(false);

    // Configs for simulation
    const [simulationTiers, setSimulationTiers] = useState<any[]>([]);


    // Excel Import State
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [selectedExcelRows, setSelectedExcelRows] = useState<number[]>([]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws);

            // Map Indonesian headers to our internal structure
            const mappedData = jsonData.map((row: any) => ({
                Category: row['Kategori'] || row['Category'] || 'Umum',
                Brand: row['Brand'] || 'Umum',
                'Product Name': row['Nama Produk'] || row['Produk'] || row['Product Name'] || '',
                SKU: row['Kode Produk'] || row['SKU'] || '',
                'Price Modal': row['Harga Modal'] || row['Harga'] || row['Price Modal'] || 0,
                'Price Jual': row['Harga Jual'] || row['Harga'] || row['Price Jual'] || 0,
                Stock: row['Stok'] || row['Stock'] || 0,
                Description: row['Deskripsi'] || row['Description'] || ''
            }));

            setExcelData(mappedData);
            setSelectedExcelRows(mappedData.map((_, i) => i));
            setIsExcelModalOpen(true);
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleExcelImport = async () => {
        if (selectedExcelRows.length === 0) {
            showToast('Pilih minimal satu data', 'error');
            return;
        }

        const selectedData = excelData.filter((_, i) => selectedExcelRows.includes(i));

        console.log('[Frontend] Selected Data Count:', selectedData.length);
        console.log('[Frontend] First Item Sample:', selectedData[0]);

        setLoading(true);
        try {
            const res = await fetch('/api/admin/products/import-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: selectedData })
            });
            const result = await res.json();

            console.log('[Frontend] API Response:', result);

            if (res.ok) {
                showToast(result.message, 'success');

                // Check for errors even when success is true
                if (result.errors && result.errors.length > 0) {
                    console.error('Import Errors:', result.errors);
                    alert(`Ada ${result.errors.length} error:\n\n${result.errors.slice(0, 3).join('\n')}\n\n(Lihat console untuk detail lengkap)`);
                } else {
                    setIsExcelModalOpen(false);
                    setExcelData([]);
                    fetchData();
                }
            } else {
                showToast(result.error || 'Gagal import excel', 'error');
                if (result.errors) {
                    console.error('Import Errors:', result.errors);
                    alert('Beberapa item gagal diimport. Cek console untuk detail.');
                }
            }
        } catch (error) {
            console.error('[Frontend] Fetch Error:', error);
            showToast('Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };



    const downloadTemplate = () => {
        const template = [
            {
                "Kode Produk": "ML-86",
                "Nama Produk": "86 Diamonds Mobile Legends",
                "Kategori": "Game Mobile",
                "Harga": 20000,
                "Stok": 99,
                "Deskripsi": "Topup Resmi"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Import_Produk.xlsx");
    };

    const toggleExcelRow = (index: number) => {
        setSelectedExcelRows(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const toggleAllExcel = () => {
        if (selectedExcelRows.length === excelData.length) {
            setSelectedExcelRows([]);
        } else {
            setSelectedExcelRows(excelData.map((_, i) => i));
        }
    };

    // Fetch brands when modal opens
    useEffect(() => {
        if (isImportModalOpen && importForm.provider === 'DIGIFLAZZ') {
            fetchBrands();
        }
    }, [isImportModalOpen, importForm.provider]);

    const fetchBrands = async () => {
        setLoadingBrands(true);
        try {
            const res = await fetch('/api/admin/topup/digiflazz/brands');
            const data = await res.json();
            if (data.success) {
                setAvailableBrands(data.brands);
                setIsDevelopment(data.isDevelopment);
            } else {
                showToast(data.message || 'Gagal memuat brands', 'error');
            }
        } catch (error) {
            showToast('Gagal koneksi ke server', 'error');
        } finally {
            setLoadingBrands(false);
        }
    };

    const toggleBrand = (brandName: string) => {
        setSelectedBrands(prev =>
            prev.includes(brandName)
                ? prev.filter(b => b !== brandName)
                : [...prev, brandName]
        );
    };

    const toggleExpandBrand = (brandKey: string) => {
        setExpandedBrand(prev => prev === brandKey ? null : brandKey);
    };

    const filteredBrands = availableBrands.filter(b =>
        b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );

    const initialForm = {
        name: '', slug: '', description: '', imageUrl: '', categoryId: '', isActive: true,
        instantDeliveryInfo: '', warrantyInfo: '', supportInfo: '',
        ratingValue: 5.0, reviewCount: 100, soldCount: 0, wishlistCount: 0
    };

    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        fetchData();
    }, [typeFilter]);

    // Removed the document click listener as it can conflict with React events.
    // We will use a transparent overlay instead.

    const fetchData = async () => {
        setLoading(true);
        try {
            const query = typeFilter ? `?type=${typeFilter}` : '';
            const [pRes, cRes] = await Promise.all([
                fetch(`/api/admin/products${query}`),
                fetch('/api/admin/categories')
            ]);
            if (pRes.ok) setProducts(await pRes.json());
            if (cRes.ok) setCategories(await cRes.json());
        } finally {
            setLoading(false);
        }
    };

    // Filter Products
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const titleMap: any = {
        'DIGITAL': { label: 'Produk Digital', icon: Tag, color: 'text-blue-500' },
        'GAME': { label: 'Topup Game', icon: Gamepad2, color: 'text-purple-500' },
        'PULSA': { label: 'Pulsa & Data', icon: Smartphone, color: 'text-orange-500' },
        'SOSMED': { label: 'Social Media', icon: Globe, color: 'text-pink-500' }
    };

    const currentType = typeFilter ? titleMap[typeFilter] : { label: 'Semua Produk', icon: Package, color: 'text-gray-700' };
    const PageIcon = currentType.icon;

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBrands.length === 0) {
            showToast('Pilih minimal satu brand', 'error');
            return;
        }
        setLoading(true);
        try {
            // Extract full product data from availableBrands
            const selectedBrandData = availableBrands
                .filter(brand => selectedBrands.includes(brand.name))
                .flatMap(brand =>
                    // Add brand field to each product
                    (brand.products || []).map((product: any) => ({
                        ...product,
                        brand: brand.name // Add brand name to each product
                    }))
                );

            if (selectedBrandData.length === 0) {
                showToast('Tidak ada produk untuk diimport', 'error');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/admin/products/import-brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: importForm.provider,
                    brands: selectedBrands, // For logging/backward compat
                    products: selectedBrandData // Send full product data
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(data.message, 'success');
                setIsImportModalOpen(false);
                setSelectedBrands([]);
                fetchData();
            } else {
                showToast(data.message || data.error || 'Import gagal', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.categoryId) {
            showToast('Pilih Kategori terlebih dahulu', 'error');
            return;
        }
        setLoading(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                showToast(editingId ? 'Produk berhasil diupdate' : 'Produk berhasil dibuat', 'success');
                setIsModalOpen(false);
                setEditingId(null);
                setForm(initialForm);
                fetchData();
            } else {
                const data = await res.json();
                showToast('Gagal menyimpan produk: ' + (data.error || 'Unknown error'), 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus produk "${name}"?`)) return;
        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Produk berhasil dihapus', 'success');
                fetchData();
            } else {
                showToast('Gagal menghapus produk', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        }
    };

    const handleGenerateReviews = async (id: string, name: string) => {
        const countStr = prompt(`Generate Fake AI Reviews untuk "${name}"?\nBerapa review? (1-1000)`, '5');
        if (!countStr) return;

        const count = parseInt(countStr);
        if (isNaN(count) || count < 1 || count > 1000) {
            alert('Masukkan angka 1-1000.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/products/${id}/generate-reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                fetchData();
            } else {
                showToast('Error: ' + (data.error || 'Failed'), 'error');
            }
        } catch (err: any) {
            showToast('Failed: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (p: Product) => {
        setForm({
            name: p.name, slug: p.slug, description: p.description,
            imageUrl: p.imageUrl || '', categoryId: p.categoryId, isActive: p.isActive,
            instantDeliveryInfo: p.instantDeliveryInfo || '',
            warrantyInfo: p.warrantyInfo || '',
            supportInfo: p.supportInfo || '',
            ratingValue: p.ratingValue ?? 5.0,
            reviewCount: p.reviewCount ?? 100,
            soldCount: p.soldCount ?? 0,
            wishlistCount: p.wishlistCount ?? 0
        });
        setEditingId(p.id);
        setIsModalOpen(true);
        setActiveActionId(null);
    };

    const handleNewProduct = () => {
        setEditingId(null);
        const randomRating = Number((4.5 + Math.random() * 0.5).toFixed(1));
        const randomReviews = Math.floor(Math.random() * (500 - 50 + 1)) + 50;
        const randomSold = randomReviews + Math.floor(Math.random() * 200);
        const randomWishlist = Math.floor(randomSold / 10);

        setForm({
            ...initialForm,
            ratingValue: randomRating,
            reviewCount: randomReviews,
            soldCount: randomSold,
            wishlistCount: randomWishlist
        });
        setIsModalOpen(true);
    };

    // Close handler for overlay
    const closeActions = () => setActiveActionId(null);

    // Open Margin Modal
    const openMarginModal = async () => {
        if (!typeFilter) {
            showToast('Pilih tipe kategori terlebih dahulu', 'error');
            return;
        }

        setIsMarginModalOpen(true);
        setLoadingMargin(true);

        try {
            // 1. Fetch Tiers for Simulation
            const resTiers = await fetch('/api/admin/config/tiers'); // Using existing tiers endpoint
            if (resTiers.ok) {
                const tiersData = await resTiers.json();
                setSimulationTiers(tiersData);
            }

            // 2. Fetch Category Margin Config
            const resConfig = await fetch(`/api/admin/config?key=margin_percent_${typeFilter}`);
            const configs = await resConfig.json();
            const marginVal = configs.find((c: any) => c.key === `margin_percent_${typeFilter}`)?.value || '0';
            setCategoryMargin(marginVal);

        } catch (error) {
            console.error(error);
            showToast('Gagal memuat data margin', 'error');
        } finally {
            setLoadingMargin(false);
        }
    };

    const handleSaveMargin = async () => {
        setLoadingMargin(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: `margin_percent_${typeFilter}`,
                    value: categoryMargin,
                    description: `Base Margin Profit for ${typeFilter}`
                })
            });

            if (res.ok) {
                showToast(`Margin Kategori ${typeFilter} disimpan!`, 'success');
                setIsMarginModalOpen(false);
            } else {
                showToast('Gagal menyimpan margin', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        } finally {
            setLoadingMargin(false);
        }
    };


    // Tier Toggle State
    const [isTierEnabled, setIsTierEnabled] = useState(true);
    const [loadingToggle, setLoadingToggle] = useState(false);

    useEffect(() => {
        if (typeFilter) {
            fetchTierStatus();
        }
    }, [typeFilter]);

    const fetchTierStatus = async () => {
        try {
            const res = await fetch(`/api/admin/config?key=tier_enable_${typeFilter}`);
            const data = await res.json();
            // Default to true if not found or explicitly 'true'
            const isEnabled = data.find((c: any) => c.key === `tier_enable_${typeFilter}`)?.value !== 'false';
            setIsTierEnabled(isEnabled);
        } catch (error) {
            console.error('Failed to fetch tier status', error);
        }
    };

    const handleToggleTier = async () => {
        if (!typeFilter) return;

        const newValue = !isTierEnabled;

        // Confirmation before disabling
        if (!newValue) {
            if (!confirm(`Apakah Anda yakin ingin menonaktifkan Sistem Tier untuk ${currentType.label}? \n\nSemua user akan mendapatkan harga normal (tidak ada diskon level).`)) {
                return;
            }
        }

        setLoadingToggle(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: `tier_enable_${typeFilter}`,
                    value: String(newValue),
                    description: `Enable Tier System for ${typeFilter}`
                })
            });

            if (res.ok) {
                setIsTierEnabled(newValue);
                if (newValue) {
                    showToast(`Sistem Tier ${currentType.label} DIAKTIFKAN`, 'success');
                } else {
                    showToast(`Sistem Tier ${currentType.label} DINONAKTIFKAN (Semua User = Harga Normal)`, 'success');
                }
            } else {
                showToast('Gagal mengubah status tier', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan sistem', 'error');
        } finally {
            setLoadingToggle(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Action Menu Overlay */}
            {activeActionId && (
                <div
                    className="fixed inset-0 z-[40] bg-transparent cursor-default"
                    onClick={closeActions}
                    aria-label="Close menu"
                />
            )}

            {/* Tier Disabled Warning Banner */}
            {typeFilter && !isTierEnabled && !loading && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                    <div className="text-orange-500 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-orange-800 text-sm">Sistem Tier Nonaktif</h4>
                        <p className="text-orange-700 text-sm mt-1">Saat ini semua member (Gold/Platinum/dll) mendapatkan harga normal. Aktifkan kembali untuk memberlakukan diskon level.</p>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm relative ${activeActionId ? 'z-30' : 'z-10'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-white shadow-sm ${currentType.color}`}>
                        <PageIcon size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{currentType.label}</h1>
                        <p className="text-gray-500 text-sm">Kelola katalog produk anda</p>
                    </div>
                </div>

                <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                    {/* Tier Toggle Switch (Only if filtered) */}
                    {typeFilter && (
                        <button
                            onClick={handleToggleTier}
                            disabled={loadingToggle}
                            className={`flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full text-sm font-medium border transition-all shadow-sm ${isTierEnabled
                                ? 'bg-white border-green-200 text-green-700 hover:border-green-300 ring-1 ring-green-100'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            title={isTierEnabled ? "Sistem Tier Aktif" : "Sistem Tier Nonaktif"}
                        >
                            <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out flex items-center ${isTierEnabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isTierEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                            </div>
                            <span className="min-w-[4rem] text-left">
                                {loadingToggle ? 'Saving...' : (isTierEnabled ? 'Tier ON' : 'Tier OFF')}
                            </span>
                        </button>
                    )}

                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari produk..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                        />
                    </div>

                    {/* Action Buttons Group */}
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <button
                            onClick={openMarginModal}
                            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 text-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-percent"><line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
                            Margin
                        </button>

                        {typeFilter === 'GAME' && (
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 hover:shadow-purple-300 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm"
                            >
                                <Gamepad2 size={16} />
                                Import
                            </button>
                        )}

                        {typeFilter === 'SOSMED' && (
                            <>
                                <button
                                    onClick={async () => {
                                        if (!confirm('PERINGATAN: Hapus SEMUA produk Social Media? Tindakan ini tidak dapat dibatalkan.')) return;
                                        setLoading(true);
                                        try {
                                            const res = await fetch('/api/admin/products/delete-all?type=SOSMED', { method: 'DELETE' });
                                            const data = await res.json();
                                            if (res.ok) {
                                                showToast(data.message, 'success');
                                                fetchData();
                                            } else {
                                                showToast(data.error || 'Gagal menghapus', 'error');
                                            }
                                        } catch (e) {
                                            showToast('Network error', 'error');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 hover:shadow-red-300 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm"
                                >
                                    <Trash2 size={16} />
                                    Hapus Semua
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!confirm('Sinkronisasi produk dari MedanPedia? Proses ini mungkin memakan waktu.')) return;
                                        setLoading(true);
                                        try {
                                            const res = await fetch('/api/medanpedia/sync', { method: 'POST' });
                                            const data = await res.json();
                                            if (data.success) {
                                                showToast(data.message, 'success');
                                                fetchData();
                                            } else {
                                                showToast(data.error || 'Sync failed', 'error');
                                            }
                                        } catch (e) {
                                            showToast('Network error', 'error');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-pink-200 hover:bg-pink-700 hover:shadow-pink-300 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm"
                                >
                                    <RefreshCw size={16} />
                                    Sync MP
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setForm(initialForm);
                                setIsModalOpen(true);
                            }}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} />
                            Tambah
                        </button>
                    </div>
                </div>
            </div>





            {/* Products Grid */}
            {
                loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((p) => {
                            const isActive = activeActionId === p.id;
                            return (
                                <div
                                    key={p.id}
                                    className={`group relative bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 border border-gray-100 flex flex-col h-full ${isActive ? 'z-50 ring-2 ring-blue-500/20 relative' : 'z-0'}`}
                                >
                                    {/* Image & Status */}
                                    <div className="relative aspect-video rounded-2xl bg-gray-50 overflow-hidden mb-4 border border-gray-100">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full text-gray-300">
                                                <ImageIcon size={32} />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${p.isActive ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                                {p.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-2 left-2">
                                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/90 text-gray-700 shadow-sm backdrop-blur-md border border-gray-100">
                                                {p.category.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1" title={p.name}>{p.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono mb-3 truncate">/{p.slug}</p>

                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-600 mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <span className="text-yellow-500">★</span> {p.ratingValue}
                                            </div>
                                            <div className="w-px h-3 bg-gray-300" />
                                            <div>{formatCompactNumber(p.soldCount)} Terjual</div>
                                        </div>
                                    </div>

                                    {/* Footer & Actions */}
                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2 relative">
                                        <Link href={`/admin/products/${p.id}/variants`} className="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                                            {p._count.variants} Varian
                                        </Link>

                                        {/* Mobile Actions Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log('Toggling action for', p.id);
                                                    setActiveActionId(isActive ? null : p.id);
                                                }}
                                                className={`p-2 rounded-xl transition-colors relative z-50 ${isActive ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-100 text-gray-500'}`}
                                                aria-label="More actions"
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {isActive && (
                                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 p-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <button onClick={() => openEdit(p)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2">
                                                        <Edit size={14} className="text-blue-500" /> Edit Produk
                                                    </button>
                                                    <button onClick={() => handleGenerateReviews(p.id, p.name)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2">
                                                        <Sparkles size={14} className="text-purple-500" /> Generate Reviews
                                                    </button>
                                                    <div className="h-px bg-gray-100 my-1" />
                                                    <button onClick={() => handleDelete(p.id, p.name)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-sm font-medium text-red-600 flex items-center gap-2">
                                                        <Trash2 size={14} /> Hapus Produk
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {/* Import Modal */}
            {
                isImportModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>

                            <div className="text-center mb-6 flex-shrink-0">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                                    <Gamepad2 size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Import Game dari Digiflazz</h2>
                                <p className="text-sm text-gray-500">Pilih brand game yang ingin Anda jual.</p>
                            </div>

                            {/* Provider Selector & Search */}
                            <div className="flex flex-col gap-3 mb-4 flex-shrink-0">
                                {isDevelopment && (
                                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl text-xs flex items-center gap-2 border border-yellow-200">
                                        <span className="text-xl">⚠️</span>
                                        <div>
                                            <strong>Mode Development Terdeteksi:</strong>
                                            <p>Anda menggunakan API Key `dev-`. Data yang muncul hanya <strong>contoh/dummy</strong> dan tidak lengkap.</p>
                                            <p>Gunakan API Key Production (bukan dev) di pengaturan untuk melihat semua produk asli.</p>
                                        </div>
                                    </div>
                                )}


                                {/* Proactive Margin Input - Removed by User Request */}
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-xs border border-blue-200 mb-2">
                                    <p><strong>Info:</strong> Harga jual otomatis mengikuti Tier Margin (Menu Atur Margin).</p>
                                </div>
                                <div className="flex gap-4">
                                    <select
                                        value={importForm.provider}
                                        onChange={e => setImportForm({ ...importForm, provider: e.target.value })}
                                        className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-sm"
                                    >
                                        <option value="DIGIFLAZZ">Digiflazz</option>
                                        <option value="APIGAMES">APIGames (Coming Soon)</option>
                                    </select>
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Cari Brand (Mobile Legends, PUBG...)"
                                            value={brandSearch}
                                            onChange={(e) => setBrandSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Brand List */}
                            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl p-2 min-h-[300px] mb-4 custom-scrollbar bg-gray-50/50">
                                {loadingBrands ? (
                                    <div className="flex justify-center items-center h-full text-gray-400 text-sm">
                                        <div className="animate-spin mr-2 w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                        Loading Brands...
                                    </div>
                                ) : availableBrands.length === 0 ? (
                                    <div className="flex justify-center items-center h-full text-gray-400 text-sm">
                                        Tidak ada brand ditemukan.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredBrands.map((brand: any) => {
                                            const brandKey = `${brand.name}-${brand.category}`;
                                            const isSelected = selectedBrands.includes(brand.name);
                                            const isExpanded = expandedBrand === brandKey;

                                            return (
                                                <div key={brandKey} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                    {/* Brand Header */}
                                                    <div className={`p-3 flex items-center justify-between transition-all ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                                                        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleBrand(brand.name)}>
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                                                                {isSelected && (
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-gray-800 text-sm truncate">{brand.name}</div>
                                                                <div className="flex gap-2 items-center mt-0.5">
                                                                    <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{brand.category}</span>
                                                                    <span className="text-xs text-gray-500">{brand.count} Produk</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleExpandBrand(brandKey)}
                                                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                                                        >
                                                            <svg className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    {/* Product Preview Table */}
                                                    {isExpanded && brand.products && brand.products.length > 0 && (
                                                        <div className="bg-gray-50 border-t border-gray-200">
                                                            <div className="max-h-64 overflow-auto">
                                                                <table className="w-full text-xs">
                                                                    <thead className="sticky top-0 bg-gray-100 border-b border-gray-200">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[10px]" style={{ width: '80px' }}>SKU</th>
                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-700" style={{ width: '200px' }}>Nama Produk</th>
                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Deskripsi</th>
                                                                            <th className="px-3 py-2 text-right font-semibold text-gray-700" style={{ width: '100px' }}>Harga</th>
                                                                            <th className="px-3 py-2 text-center font-semibold text-gray-700" style={{ width: '70px' }}>Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white divide-y divide-gray-100">
                                                                        {brand.products.map((product: any, idx: number) => (
                                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                                <td className="px-3 py-2 font-mono text-[10px] text-gray-600 truncate" title={product.sku}>{product.sku}</td>
                                                                                <td className="px-3 py-2 text-gray-800 font-medium">{product.name}</td>
                                                                                <td className="px-3 py-2 text-gray-600 text-[11px]">{product.description}</td>
                                                                                <td className="px-3 py-2 text-right font-bold text-green-600 whitespace-nowrap">
                                                                                    {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(product.price)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center">
                                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${product.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                        {product.status ? '✓' : '✗'}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-gray-100">
                                <div className="text-sm text-gray-500">
                                    {selectedBrands.length} Brand dipilih
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedBrands([])}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        disabled={loading || selectedBrands.length === 0}
                                        className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Import {selectedBrands.length > 0 ? `(${selectedBrands.length})` : ''}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Form */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Produk' : 'Buat Produk Baru'}</h2>
                                    <p className="text-xs text-gray-500">Lengkapi detail produk di bawah ini.</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body / Scrollable */}
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Section: Basic Info */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-gray-900 pl-3 uppercase tracking-wider">Informasi Utama</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Produk</label>
                                                <input
                                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm font-medium"
                                                    placeholder="Contoh: Netflix Premium 4K"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Slug (URL)</label>
                                                <input
                                                    value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm font-mono"
                                                    placeholder="netflix-premium-4k"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Kategori</label>
                                                <select
                                                    value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm font-medium bg-white"
                                                    required
                                                >
                                                    <option value="">-- Pilih Kategori --</option>
                                                    {categories
                                                        .filter(c => !typeFilter || (c as any).type === typeFilter)
                                                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Image URL</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm font-medium"
                                                        placeholder="https://..."
                                                    />
                                                    {form.imageUrl && (
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 p-0.5 border border-gray-200 flex-shrink-0">
                                                            <img src={form.imageUrl} className="w-full h-full object-cover rounded-md" alt="Preview" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Deskripsi</label>
                                            <textarea
                                                value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm min-h-[80px]"
                                                placeholder="Jelaskan detail produk..."
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100" />

                                    {/* Section: Social Proof / Stats */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-wider">Statistik</h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Rating (0-5)</label>
                                                <input
                                                    type="number" step="0.1" max="5" min="0"
                                                    value={form.ratingValue === 0 ? '' : form.ratingValue}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                        setForm({ ...form, ratingValue: val || 0 });
                                                    }}
                                                    placeholder="Kosongkan untuk 0"
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Total Reviews</label>
                                                <input
                                                    type="number"
                                                    value={form.reviewCount === 0 ? '' : form.reviewCount}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        setForm({ ...form, reviewCount: val || 0 });
                                                    }}
                                                    placeholder="Kosongkan untuk 0"
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Total Terjual</label>
                                                <input
                                                    type="number"
                                                    value={form.soldCount === 0 ? '' : form.soldCount}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        setForm({ ...form, soldCount: val || 0 });
                                                    }}
                                                    placeholder="Kosongkan untuk 0"
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Wishlist</label>
                                                <input
                                                    type="number"
                                                    value={form.wishlistCount === 0 ? '' : form.wishlistCount}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        setForm({ ...form, wishlistCount: val || 0 });
                                                    }}
                                                    placeholder="Kosongkan untuk 0"
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100" />

                                    {/* Section: Service Info */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-purple-500 pl-3 uppercase tracking-wider">Informasi Layanan</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Info Auto Kirim</label>
                                                <textarea
                                                    value={form.instantDeliveryInfo || ''} onChange={e => setForm({ ...form, instantDeliveryInfo: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-500 outline-none" rows={2}
                                                    placeholder="Ex: Dikirim otomatis 24/7"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Info Garansi</label>
                                                <textarea
                                                    value={form.warrantyInfo || ''} onChange={e => setForm({ ...form, warrantyInfo: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-500 outline-none" rows={2}
                                                    placeholder="Ex: Garansi 30 hari"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Info Support</label>
                                                <textarea
                                                    value={form.supportInfo || ''} onChange={e => setForm({ ...form, supportInfo: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-500 outline-none" rows={2}
                                                    placeholder="Ex: Hubungi CS jika terkendala"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                            className="w-5 h-5 text-gray-900 rounded focus:ring-gray-900 border-gray-300 mr-3 cursor-pointer"
                                        />
                                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                            Status Produk Aktif
                                        </label>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors text-sm"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 shadow-lg transform active:scale-95 transition-all text-sm flex items-center gap-2"
                                        >
                                            {loading ? 'Menyimpan...' : 'Simpan Produk'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal: Margin & Tier Config */}
            {isMarginModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Pengaturan Margin - {currentType.label}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">Atur keuntungan dasar untuk semua produk kategori ini.</p>
                            </div>
                            <button onClick={() => setIsMarginModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {loadingMargin ? (
                            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>
                        ) : (
                            <div className="space-y-8">
                                {/* 1. Master Toggle */}
                                <div className="bg-blue-50 p-5 rounded-2xl flex items-center justify-between border border-blue-100">
                                    <div>
                                        <h3 className="font-bold text-blue-900 text-lg">Status Sistem Tier</h3>
                                        <p className="text-blue-700 text-sm">Matikan untuk menonaktifkan semua markup tier (Flat Price).</p>
                                    </div>
                                    <button
                                        onClick={handleToggleTier}
                                        disabled={loadingToggle}
                                        className={`flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full text-sm font-medium border transition-all shadow-sm ${isTierEnabled
                                            ? 'bg-white border-green-200 text-green-700 hover:border-green-300 ring-1 ring-green-100'
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out flex items-center ${isTierEnabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isTierEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                                        </div>
                                        <span className="min-w-[3rem] text-center">
                                            {isTierEnabled ? 'ON' : 'OFF'}
                                        </span>
                                    </button>
                                </div>

                                {/* 2. Base Margin Config */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Margin Kategori (Profit Dasar)
                                    </label>
                                    <div className="flex gap-4">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={categoryMargin}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Allow digits and one decimal point
                                                    if (/^\d*\.?\d*$/.test(val)) {
                                                        setCategoryMargin(val);
                                                    }
                                                }}
                                                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-4 top-3.5 text-gray-500 font-bold">%</span>
                                        </div>
                                        <button
                                            onClick={handleSaveMargin}
                                            disabled={loadingMargin}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2"
                                        >
                                            <Save size={18} />
                                            Simpan Margin
                                        </button>
                                    </div>
                                    <p className="text-gray-500 text-xs mt-2">
                                        Ini adalah markup dasar yang akan ditambahkan ke Harga Provider sebelum ditambah Tier Fee.
                                    </p>
                                </div>

                                {/* 3. Simulation Table */}
                                <div className="border rounded-2xl overflow-hidden">
                                    <div className="bg-gray-50 p-4 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Simulasi Harga Jual</h3>
                                        <p className="text-gray-500 text-xs mt-0.5">Contoh Modal Rp 10.000</p>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Level User</th>
                                                <th className="px-4 py-3 text-right">Margin Kategori</th>
                                                <th className="px-4 py-3 text-right">Fee Member</th>
                                                <th className="px-4 py-3 text-right text-blue-600">Total Markup</th>
                                                <th className="px-4 py-3 text-right">Harga Jual</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {simulationTiers.map(tier => {
                                                const base = Number(categoryMargin) || 0;
                                                const extra = isTierEnabled ? Number(tier.marginPercent) : 0;
                                                const total = base + extra;
                                                const modal = 10000;

                                                // Simple simulation rounding (generic)
                                                // If 'SOSMED', we might want precise, but for 10k example, standard rounding is cleaner for demo
                                                const sellPrice = Math.ceil((modal + (modal * total / 100)) / 100) * 100;

                                                return (
                                                    <tr key={tier.name} className={`${tier.name === 'Bronze' ? 'bg-yellow-50' : 'bg-white'}`}>
                                                        <td className="px-4 py-3 font-medium text-gray-900">{tier.name}</td>
                                                        <td className="px-4 py-3 text-right text-gray-500">{base}%</td>
                                                        <td className="px-4 py-3 text-right text-gray-500">
                                                            {isTierEnabled ? `+${extra}%` : <span className="text-gray-300">-</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-blue-600">{total}%</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-900">
                                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sellPrice)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Disabled State Preview */}
                                        {!isTierEnabled && (
                                            <tfoot className="bg-orange-50 border-t border-orange-100">
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-3 text-center text-orange-600 font-medium text-xs">
                                                        ℹ️ Sistem Tier Nonaktif: Semua user mendapatkan harga Flat (Modal + Margin Kategori {categoryMargin}%).
                                                        Tidak ada biaya tambahan per level.
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
