'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Database, Trash2, Key, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type Product = { id: string; name: string };
type Variant = { id: string; name: string };
type Stock = { id: string; payloadEncrypted: string; status: string; createdAt: string };

export default function StocksPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [stocks, setStocks] = useState<Stock[]>([]);

    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedVariant, setSelectedVariant] = useState('');
    const [payloads, setPayloads] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/products?type=DIGITAL').then(res => res.json()).then(setProducts);
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            fetch(`/api/admin/products/${selectedProduct}/variants`).then(res => res.json()).then(setVariants);
        } else {
            setVariants([]);
        }
        setSelectedVariant('');
    }, [selectedProduct]);

    useEffect(() => {
        if (selectedVariant) {
            fetchStocks();
        } else {
            setStocks([]);
        }
    }, [selectedVariant]);

    const fetchStocks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/stocks?variantId=${selectedVariant}`);
            if (res.ok) setStocks(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const handleAddStocks = async () => {
        if (!selectedVariant || !payloads.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/stocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    variantId: selectedVariant,
                    payloads,
                    expiryDate: expiryDate || null // Send null if empty
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setPayloads('');
                fetchStocks();
            } else {
                alert('Error: ' + (data.error || 'Failed to add stocks'));
            }
        } catch (error) {
            console.error(error);
            alert('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this stock item?')) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/stocks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchStocks();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manajemen Stok Digital</h1>
                    <p className="text-gray-500 mt-1">Kelola inventaris produk digital (Akun, Voucher, dll).</p>
                </div>
                <button
                    onClick={async () => {
                        if (!confirm('Hapus semua stok yang sudah kadaluarsa (Expired)?')) return;
                        const res = await fetch('/api/admin/stocks/cleanup', { method: 'POST' });
                        const data = await res.json();
                        alert(data.message);
                        if (selectedVariant) fetchStocks();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-bold"
                >
                    <Trash2 className="w-4 h-4" />
                    Bersihkan Expired
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-600" />
                            Tambah Stok Baru
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Produk</label>
                                <select
                                    value={selectedProduct}
                                    onChange={e => setSelectedProduct(e.target.value)}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="">Pilih Produk...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Varian</label>
                                <select
                                    value={selectedVariant}
                                    onChange={e => setSelectedVariant(e.target.value)}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                                    disabled={!selectedProduct}
                                >
                                    <option value="">Pilih Varian...</option>
                                    {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Data Stok (Bulk)
                                    <span className="block text-xs font-normal text-gray-500 mt-0.5">Satu item per baris. Disimpan apa adanya (Raw Text).</span>
                                </label>
                                <textarea
                                    value={payloads}
                                    onChange={e => setPayloads(e.target.value)}
                                    rows={8}
                                    placeholder="email:password&#10;code-1234-5678&#10;https://link.com/redeem"
                                    className="w-full border border-gray-200 p-3 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-y"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Tanggal Kadaluarsa (Opsional)
                                    <span className="block text-xs font-normal text-gray-500 mt-0.5">Biarkan kosong jika tidak ada expired.</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleAddStocks}
                                disabled={loading || !selectedVariant || !payloads.trim()}
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {loading ? 'Memproses...' : !selectedVariant ? 'Pilih Varian Dulu' : 'Simpan Stok'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Database className="w-5 h-5 text-indigo-600" />
                                Daftar Stok Tersedia
                            </h2>
                            {selectedVariant && (
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                                    {stocks.length} Items
                                </span>
                            )}
                        </div>

                        {selectedVariant ? (
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Tanggal Input</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Preview Data</th>
                                            <th className="px-6 py-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stocks.map(s => (
                                            <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4 text-gray-500 whitespace-nowrap flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(s.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.status === 'USED'
                                                        ? 'bg-red-50 text-red-700 border-red-100'
                                                        : 'bg-green-50 text-green-700 border-green-100'
                                                        }`}>
                                                        {s.status === 'USED' ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                                        {s.status === 'USED' ? 'TERPAKAI' : 'TERSEDIA'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-gray-400 font-mono text-xs max-w-[200px] truncate">
                                                        <Key className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{s.payloadEncrypted.substring(0, 30)}...</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(s.id)}
                                                        disabled={deletingId === s.id}
                                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                        title="Hapus Stok"
                                                    >
                                                        {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {stocks.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Database className="w-8 h-8 text-gray-300" />
                                                        <p>Belum ada stok untuk varian ini.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Belum Ada Varian Dipilih</h3>
                                <p className="text-sm mt-1">Silakan pilih Produk dan Varian di panel kiri untuk kelola stok.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
