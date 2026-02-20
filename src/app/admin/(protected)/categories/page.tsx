'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Trash2, Edit, Plus, Folder, Gamepad2, Smartphone, Globe, Tag, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type Category = {
    id: string;
    name: string;
    slug: string;
    iconKey: string | null;
    sortOrder: number;
    isActive: boolean;
    type: string;
};

// Helper for Type Colors & Icons
const getTypeConfig = (type: string) => {
    switch (type) {
        case 'GAME':
            return { color: 'purple', icon: Gamepad2, label: 'Game Topup' };
        case 'PULSA':
            return { color: 'orange', icon: Smartphone, label: 'Pulsa & Data' };
        case 'SOSMED':
            return { color: 'pink', icon: Globe, label: 'Social Media' };
        default:
            return { color: 'blue', icon: Tag, label: 'Digital Product' };
    }
};

export default function CategoriesPage() {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type');

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    // Form State
    const [form, setForm] = useState<Partial<Category>>({
        name: '', slug: '', iconKey: '', sortOrder: 0, isActive: true, type: 'DIGITAL'
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { showToast } = useToast();

    useEffect(() => {
        if (typeParam) {
            setFilterType(typeParam);
            setForm(prev => ({ ...prev, type: typeParam }));
        }
        fetchCategories();
    }, [typeParam]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                showToast(editingId ? 'Kategori berhasil diupdate' : 'Kategori berhasil dibuat', 'success');
                setIsModalOpen(false);
                setEditingId(null);
                setForm({ name: '', slug: '', iconKey: '', sortOrder: 0, isActive: true, type: 'DIGITAL' });
                fetchCategories();
            } else {
                showToast('Gagal menyimpan kategori', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus kategori ${name}?`)) return;
        try {
            const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                if (data.action === 'disabled') {
                    // Show server message (e.g. "Category disabled (has active products)" or "Category disabled (contains historical data)")
                    showToast(data.message || 'Kategori dinonaktifkan', 'info');
                    // Optimistic update
                    setCategories(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c));
                } else {
                    showToast('Kategori dihapus permanen', 'success');
                    // Optimistic remove
                    setCategories(prev => prev.filter(c => c.id !== id));
                }
                // Refresh source of truth
                fetchCategories();
            } else {
                showToast('Gagal menghapus', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        }
    };

    const handleToggleStatus = async (cat: Category) => {
        // Optimistic Update
        const newStatus = !cat.isActive;
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: newStatus } : c));

        try {
            const res = await fetch(`/api/admin/categories/${cat.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...cat, isActive: newStatus })
            });

            if (res.ok) {
                showToast(`Kategori ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
            } else {
                // Revert
                setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: !newStatus } : c));
                showToast('Gagal mengubah status', 'error');
            }
        } catch (error) {
            setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: !newStatus } : c));
            showToast('Terjadi kesalahan', 'error');
        }
    };

    const openEdit = (cat: Category) => {
        setForm(cat);
        setEditingId(cat.id);
        setIsModalOpen(true);
    };

    // Filter Logic
    const filteredCategories = categories.filter(cat => {
        const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'ALL' || cat.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Kategori Produk
                    </h1>
                    <p className="text-gray-500 mt-1">Atur pengelompokan produk agar mudah ditemukan</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    {/* Search */}
                    <div className="relative group flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari kategori..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                        />
                    </div>

                    {/* Filter Type */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="ALL">Semua Tipe</option>
                        <option value="GAME">Game Topup</option>
                        <option value="PULSA">Pulsa & Data</option>
                        <option value="DIGITAL">Produk Digital</option>
                        <option value="SOSMED">Social Media</option>
                    </select>

                    <button
                        onClick={() => {
                            setEditingId(null);
                            setForm({
                                name: '', slug: '', iconKey: '', sortOrder: 0, isActive: true,
                                type: filterType !== 'ALL' ? filterType : 'DIGITAL'
                            });
                            setIsModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Tambah Baru
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCategories.map((cat, index) => {
                        const { color, icon: Icon, label } = getTypeConfig(cat.type);

                        // Color styling maps
                        const bgColors: { [key: string]: string } = {
                            purple: 'bg-purple-50 hover:bg-purple-100 border-purple-100',
                            orange: 'bg-orange-50 hover:bg-orange-100 border-orange-100',
                            pink: 'bg-pink-50 hover:bg-pink-100 border-pink-100',
                            blue: 'bg-blue-50 hover:bg-blue-100 border-blue-100'
                        };
                        const textColors: { [key: string]: string } = {
                            purple: 'text-purple-600',
                            orange: 'text-orange-600',
                            pink: 'text-pink-600',
                            blue: 'text-blue-600'
                        };
                        const ringColors: { [key: string]: string } = {
                            purple: 'group-hover:ring-purple-200',
                            orange: 'group-hover:ring-orange-200',
                            pink: 'group-hover:ring-pink-200',
                            blue: 'group-hover:ring-blue-200'
                        };

                        return (
                            <div
                                key={cat.id}
                                className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${bgColors[color]} ${ringColors[color]} hover:ring-4 ring-offset-0`}
                            >
                                {/* Active Status Toggle */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStatus(cat);
                                    }}
                                    className={`absolute top-4 right-4 flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all ${cat.isActive
                                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                        }`}
                                    title={cat.isActive ? 'Klik untuk Nonaktifkan' : 'Klik untuk Aktifkan'}
                                >
                                    <div className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    {cat.isActive ? 'Aktif' : 'Nonaktif'}
                                </button>

                                <div className="flex flex-col items-center text-center space-y-4">
                                    {/* Icon Circle */}
                                    <div className={`p-4 rounded-2xl bg-white shadow-sm ${textColors[color]}`}>
                                        <Icon size={32} strokeWidth={1.5} />
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">{cat.name}</h3>
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white ${textColors[color]}`}>
                                            {label}
                                        </div>
                                    </div>

                                    <div className="w-full pt-4 border-t border-black/5 flex justify-between items-center text-sm">
                                        <span className="text-gray-400 font-mono">#{index + 1}/{filteredCategories.length}</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEdit(cat)}
                                                className="p-2 bg-white hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors shadow-sm"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id, cat.name)}
                                                className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors shadow-sm"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Card (Empty State-ish) */}
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setForm({
                                name: '', slug: '', iconKey: '', sortOrder: 0, isActive: true,
                                type: filterType !== 'ALL' ? filterType : 'DIGITAL'
                            });
                            setIsModalOpen(true);
                        }}
                        className="group flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 min-h-[220px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors mb-3">
                            <Plus size={24} />
                        </div>
                        <span className="font-medium text-gray-400 group-hover:text-blue-600">Tambah Kategori</span>
                    </button>
                </div>
            )}

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingId ? 'Edit Kategori' : 'Kategori Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tipe Produk</label>
                                <select
                                    value={form.type || 'DIGITAL'}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="DIGITAL">Produk Digital</option>
                                    <option value="GAME">Topup Game</option>
                                    <option value="PULSA">Pulsa & Data</option>
                                    <option value="SOSMED">Social Media</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nama Kategori</label>
                                <input
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" required
                                    placeholder="Contoh: Mobile Legends"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Slug URL</label>
                                <input
                                    value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm" required
                                    placeholder="mobile-legends"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Urutan</label>
                                    <input
                                        type="number"
                                        value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Icon Key</label>
                                    <input
                                        value={form.iconKey || ''} onChange={e => setForm({ ...form, iconKey: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 mr-3 cursor-pointer"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Status Aktif
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700">
                                    {loading ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
