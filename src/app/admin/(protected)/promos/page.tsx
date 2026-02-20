'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Copy, Ticket, CheckCircle2, XCircle, Percent, DollarSign } from 'lucide-react';
import { useToast } from '@/context/ToastContext'; // Use local toast

type Promo = {
    id: string;
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    usageLimit: number;
    usageCount: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
    startAt: string;
    endAt: string;
    isActive: boolean;
};

export default function PromosPage() {
    const [promos, setPromos] = useState<Promo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { showToast } = useToast(); // Init hook

    // Default dates
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];

    const [form, setForm] = useState({
        code: '', type: 'PERCENT', value: 0, usageLimit: 100,
        minOrderAmount: 0, maxDiscountAmount: 0,
        startAt: today, endAt: nextMonthStr, isActive: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/promos');
            if (res.ok) setPromos(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Kode promo disalin!', 'success');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/admin/promos/${editingId}` : '/api/admin/promos';

            const payload = {
                ...form,
                startAt: new Date(form.startAt).toISOString(),
                endAt: new Date(form.endAt).toISOString()
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(editingId ? 'Promo berhasil diupdate' : 'Promo berhasil dibuat', 'success');
                setIsModalOpen(false);
                setEditingId(null);
                setForm({
                    code: '', type: 'PERCENT', value: 0, usageLimit: 100,
                    minOrderAmount: 0, maxDiscountAmount: 0,
                    startAt: today, endAt: nextMonthStr, isActive: true
                });
                fetchData();
            } else {
                showToast('Gagal menyimpan promo', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`Hapus promo ${code}?`)) return;
        await fetch(`/api/admin/promos/${id}`, { method: 'DELETE' });
        showToast('Promo dihapus', 'success');
        fetchData();
    };

    const openEdit = (p: Promo) => {
        setForm({
            code: p.code, type: p.type as any, value: p.value, usageLimit: p.usageLimit,
            minOrderAmount: p.minOrderAmount, maxDiscountAmount: p.maxDiscountAmount || 0,
            startAt: new Date(p.startAt).toISOString().split('T')[0],
            endAt: new Date(p.endAt).toISOString().split('T')[0],
            isActive: p.isActive
        });
        setEditingId(p.id);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Promo & Diskon
                    </h1>
                    <p className="text-gray-500 mt-1">Kelola voucher dan penawaran spesial untuk pelanggan</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setForm({
                            code: '', type: 'PERCENT', value: 0, usageLimit: 100,
                            minOrderAmount: 0, maxDiscountAmount: 0,
                            startAt: today, endAt: nextMonthStr, isActive: true
                        });
                        setIsModalOpen(true);
                    }}
                    className="group bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Buat Promo Baru
                </button>
            </div>

            {/* Grid Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {promos.map((p) => {
                        const usagePercent = Math.min((p.usageCount / p.usageLimit) * 100, 100);
                        const isExpired = new Date(p.endAt) < new Date();

                        return (
                            <div
                                key={p.id}
                                className="group relative bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border border-gray-100 overflow-hidden hover:-translate-y-1"
                            >
                                {/* Background Decor */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />

                                <div className="relative z-10">
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div
                                            onClick={() => copyToClipboard(p.code)}
                                            className="cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 border-dashed rounded-xl px-3 py-1.5 flex items-center gap-2 transition-colors group/code"
                                        >
                                            <Ticket className="w-4 h-4 text-indigo-500" />
                                            <span className="font-mono font-bold text-gray-700 tracking-wide">{p.code}</span>
                                            <Copy className="w-3 h-3 text-gray-400 group-hover/code:text-indigo-500 opacity-0 group-hover/code:opacity-100 transition-all" />
                                        </div>

                                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${p.isActive && !isExpired
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                            {p.isActive && !isExpired ? (
                                                <><CheckCircle2 className="w-3 h-3" /> Active</>
                                            ) : (
                                                <><XCircle className="w-3 h-3" /> Inactive</>
                                            )}
                                        </div>
                                    </div>

                                    {/* Discount Value */}
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-gray-900 tracking-tight">
                                                {p.type === 'FIXED' ? 'Rp' : ''}{p.value.toLocaleString()}
                                            </span>
                                            <span className="text-lg font-bold text-gray-500">
                                                {p.type === 'PERCENT' ? '% OFF' : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Min. Order: <span className="font-medium text-gray-700">Rp {p.minOrderAmount.toLocaleString()}</span>
                                        </p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                                            <span>Terpakai</span>
                                            <span>{p.usageCount} / {p.usageLimit}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : 'bg-indigo-500'
                                                    }`}
                                                style={{ width: `${usagePercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="text-xs text-gray-500 font-medium">
                                            Exp: {new Date(p.endAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEdit(p)}
                                                className="p-2 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                title="Edit Promo"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id, p.code)}
                                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                title="Hapus Promo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingId ? 'Edit Promo' : 'Buat Promo Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Kode Promo</label>
                                    <div className="relative">
                                        <Ticket className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono font-bold uppercase transition-all"
                                            placeholder="CONTOH: SALE10"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tipe Diskon</label>
                                    <div className="relative">
                                        <select
                                            value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                            className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white transition-all font-medium"
                                        >
                                            <option value="PERCENT">Persentase (%)</option>
                                            <option value="FIXED">Nominal (Rp)</option>
                                        </select>
                                        <div className="absolute right-3 top-3 pointer-events-none">
                                            {form.type === 'PERCENT' ? <Percent className="w-4 h-4 text-gray-400" /> : <DollarSign className="w-4 h-4 text-gray-400" />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nilai Diskon</label>
                                    <input
                                        type="number"
                                        value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold text-lg"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Batas Pakai</label>
                                    <input
                                        type="number"
                                        value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Min. Belanja (Rp)</label>
                                    <input
                                        type="number"
                                        value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Max. Potongan (Rp)</label>
                                    <input
                                        type="number"
                                        value={form.maxDiscountAmount} onChange={e => setForm({ ...form, maxDiscountAmount: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mulai Tanggal</label>
                                    <input
                                        type="date"
                                        value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 mr-3 cursor-pointer"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Aktifkan Promo ini sekarang
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/50 transition-all"
                                >
                                    {loading ? 'Menyimpan...' : 'Simpan Promo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
