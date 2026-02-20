'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, ArrowLeft, MoreHorizontal, CheckCircle, XCircle, Clock, ShieldCheck, Tag } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

type Variant = {
    id: string;
    name: string;
    price: number;
    durationDays: number;
    warrantyDays: number;
    sortOrder: number;
    isActive: boolean;
};

export default function VariantsPage() {
    const params = useParams<{ id: string }>();
    const { showToast } = useToast();
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '', price: 0, durationDays: 30, warrantyDays: 7, sortOrder: 0, isActive: true
    });

    useEffect(() => {
        fetchVariants();
    }, []);

    const fetchVariants = async () => {
        try {
            const res = await fetch(`/api/admin/products/${params.id}/variants`);
            if (res.ok) setVariants(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/admin/variants/${editingId}` : `/api/admin/products/${params.id}/variants`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setForm({ name: '', price: 0, durationDays: 30, warrantyDays: 7, sortOrder: 0, isActive: true });
                fetchVariants();
                showToast(`Variant ${editingId ? 'updated' : 'created'} successfully!`, 'success');
            } else {
                showToast('Failed to save variant', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' });
            fetchVariants();
            showToast('Variant deleted', 'success');
        } catch (error) {
            showToast('Failed to delete', 'error');
        }
    };

    const openEdit = (v: Variant) => {
        setForm({
            name: v.name, price: v.price, durationDays: v.durationDays,
            warrantyDays: v.warrantyDays, sortOrder: v.sortOrder, isActive: v.isActive
        });
        setEditingId(v.id);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/products"
                        className="p-2 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Variants</h1>
                        <p className="text-gray-500 text-sm">Configure pricing and details for this product.</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setForm({ name: '', price: 0, durationDays: 30, warrantyDays: 7, sortOrder: 0, isActive: true });
                        setIsModalOpen(true);
                    }}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                    <Plus size={18} />
                    Add New Variant
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {variants.length === 0 && !loading && (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Tag className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No Variants Yet</h3>
                        <p className="text-gray-500 text-sm">Start by adding a variant to this product.</p>
                    </div>
                )}

                {variants.map((v) => (
                    <div
                        key={v.id}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6 group"
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                                {v.sortOrder}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{v.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Tag className="w-3 h-3" />
                                        <span>Rp {v.price.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{v.durationDays}d</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span>{v.warrantyDays}d</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {v.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {v.isActive ? 'Active' : 'Disabled'}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openEdit(v)}
                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Edit Variant"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(v.id, v.name)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Variant"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {editingId ? 'Edit Variant' : 'New Variant'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
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
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (IDR)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-bold">Rp</span>
                                        <input
                                            type="number"
                                            value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                                            className="w-full pl-10 border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sort Order</label>
                                    <input
                                        type="number"
                                        value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                                        className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duration (Days)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })}
                                            className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                        <Clock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Warranty (Days)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={form.warrantyDays} onChange={e => setForm({ ...form, warrantyDays: Number(e.target.value) })}
                                            className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                        <ShieldCheck className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                                    </div>
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
