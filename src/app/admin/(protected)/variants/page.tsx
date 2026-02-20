'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Filter, Tag, ArrowLeft, Search, CheckCircle, XCircle, Clock, ShieldCheck, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

type Product = { id: string; name: string };
type Variant = {
    id: string;
    productId: string;
    name: string;
    price: number;
    originalPrice: number | null;
    durationDays: number;
    warrantyDays: number;
    sortOrder: number;
    isActive: boolean;
    product: { name: string };
    _count: { stocks: number };
};

export default function GlobalVariantsPage() {
    const { showToast } = useToast();
    const [variants, setVariants] = useState<Variant[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterProduct, setFilterProduct] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [form, setForm] = useState({
        productId: '',
        name: '',
        price: '',
        originalPrice: '',
        durationDays: '30',
        warrantyDays: '30',
        sortOrder: '0',
        isActive: true
    });

    useEffect(() => {
        fetchData();
        fetch('/api/admin/products').then(res => res.json()).then(setProducts);
    }, []);

    useEffect(() => {
        fetchData();
    }, [filterProduct]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const url = filterProduct
                ? `/api/admin/variants?productId=${filterProduct}`
                : '/api/admin/variants';
            const res = await fetch(url);
            if (res.ok) setVariants(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const filteredVariants = variants.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.productId) {
            showToast('Please select a product', 'error');
            return;
        }
        setLoading(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/admin/variants/${editingId}` : '/api/admin/variants';

            const payload = {
                ...form,
                price: Number(form.price),
                originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
                durationDays: Number(form.durationDays),
                warrantyDays: Number(form.warrantyDays),
                sortOrder: Number(form.sortOrder),
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                resetForm();
                fetchData();
                showToast(`Variant ${editingId ? 'updated' : 'created'} successfully`, 'success');
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to save', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete variant "${name}"?`)) return;
        try {
            await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' });
            fetchData();
            showToast('Variant deleted', 'success');
        } catch (error) {
            showToast('Failed to delete', 'error');
        }
    };

    const openEdit = (v: Variant) => {
        setForm({
            productId: v.productId,
            name: v.name,
            price: String(v.price),
            originalPrice: v.originalPrice ? String(v.originalPrice) : '',
            durationDays: String(v.durationDays),
            warrantyDays: String(v.warrantyDays),
            sortOrder: String(v.sortOrder),
            isActive: v.isActive
        });
        setEditingId(v.id);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingId(null);
        resetForm();
        if (filterProduct) {
            setForm(f => ({ ...f, productId: filterProduct }));
        }
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setForm({
            productId: '',
            name: '',
            price: '',
            originalPrice: '',
            durationDays: '30',
            warrantyDays: '30',
            sortOrder: '0',
            isActive: true
        });
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Tag className="w-8 h-8 text-emerald-400" />
                            Variants Management
                        </h1>
                        <p className="text-emerald-200 mt-2">Manage all product variants, prices, and stock configurations.</p>
                    </div>
                    <button
                        onClick={handleNew}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/30"
                    >
                        <Plus size={20} /> Add Global Variant
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-emerald-300 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search variants..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/10 border border-emerald-400/30 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                    </div>

                    {/* Filter Product */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-3 text-emerald-300 w-5 h-5" />
                        <select
                            value={filterProduct}
                            onChange={e => setFilterProduct(e.target.value)}
                            className="w-full bg-white/10 border border-emerald-400/30 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none [&>option]:text-gray-900"
                        >
                            <option value="">All Products</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-emerald-200 bg-white/5 rounded-xl px-4 py-2 border border-emerald-400/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Showing {filteredVariants.length} variants
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Product & Name</th>
                                <th className="px-6 py-4">Price (IDR)</th>
                                <th className="px-6 py-4">Configuration</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredVariants.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs flex items-center gap-1 mb-1">
                                                <ShoppingBag className="w-3 h-3" /> {v.product?.name}
                                            </span>
                                            <span className="font-bold text-gray-900 text-base">{v.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-medium text-emerald-600">Rp {v.price.toLocaleString('id-ID')}</span>
                                            {v.originalPrice && v.originalPrice > v.price && (
                                                <span className="text-xs text-red-400 line-through">
                                                    Rp {v.originalPrice.toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 space-y-1">
                                        <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-gray-400" /> {v.durationDays} days</div>
                                        <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-gray-400" /> {v.warrantyDays} days</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${v._count?.stocks > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${v._count?.stocks > 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                            {v._count?.stocks || 0} units
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {v.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {v.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(v)} className="p-2 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors" title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(v.id, v.name)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredVariants.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        No variants found fitting your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {editingId ? 'Edit Variant' : 'New Variant'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product</label>
                                <select
                                    value={form.productId}
                                    onChange={e => setForm({ ...form, productId: e.target.value })}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    required
                                    disabled={!!editingId}
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Variant Name</label>
                                <input
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    placeholder="e.g. 1 Month Premium"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Selling Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-bold">Rp</span>
                                        <input
                                            type="number"
                                            value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                                            className="w-full pl-10 border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Original Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-bold">Rp</span>
                                        <input
                                            type="number"
                                            value={form.originalPrice} onChange={e => setForm({ ...form, originalPrice: e.target.value })}
                                            className="w-full pl-10 border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (D)</label>
                                    <input
                                        type="number"
                                        value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })}
                                        className="w-full border border-gray-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Warranty (D)</label>
                                    <input
                                        type="number"
                                        value={form.warrantyDays} onChange={e => setForm({ ...form, warrantyDays: e.target.value })}
                                        className="w-full border border-gray-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sort</label>
                                    <input
                                        type="number"
                                        value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                                        className="w-full border border-gray-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                <label className="text-sm font-semibold text-gray-700">Active Status</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                    {loading ? 'Saving...' : 'Save Variant'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
