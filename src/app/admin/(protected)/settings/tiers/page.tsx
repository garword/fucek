'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type TierConfig = {
    name: string;
    minTrx: number;
    marginPercent: number;
    isActive: boolean;
};

export default function TierSettingsPage() {
    const [tiers, setTiers] = useState<TierConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchTiers();
    }, []);

    const fetchTiers = async () => {
        try {
            const res = await fetch('/api/admin/settings/tiers');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTiers(data);
            }
        } catch (error) {
            console.error('Failed to fetch tiers', error);
            showToast('Gagal memuat data tier', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (index: number, field: keyof TierConfig, value: any) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/settings/tiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tiers }),
            });

            if (res.ok) {
                showToast('Konfigurasi Tier berhasil disimpan', 'success');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Failed to save tiers', error);
            showToast('Gagal menyimpan perubahan', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Konfigurasi Level Member</h1>
                    <p className="text-sm text-gray-500">Atur syarat transaksi dan margin keuntungan untuk setiap level member.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Simpan Perubahan</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-emerald-50 to-white border-b border-gray-100 mb-4">
                    <div className="flex gap-4">
                        <div className="p-3 bg-emerald-100 rounded-lg h-fit">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Skema Tier & Keuntungan</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Semakin tinggi level member, semakin kecil margin keuntungan yang diambil (harga lebih murah).
                                Level ditentukan secara otomatis berdasarkan jumlah transaksi sukses (<b>Min. Trx</b>).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-bold">Nama Level</th>
                                <th className="px-6 py-4 font-bold text-center">Min. Transaksi Sukses</th>
                                <th className="px-6 py-4 font-bold text-center">Margin Admin (%)</th>
                                <th className="px-6 py-4 font-bold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tiers.map((tier, index) => (
                                <tr key={tier.name} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                                ${tier.name === 'Bronze' ? 'bg-orange-100 text-orange-700' :
                                                    tier.name === 'Silver' ? 'bg-gray-100 text-gray-700' :
                                                        tier.name === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                                                            tier.name === 'Platinum' ? 'bg-cyan-100 text-cyan-700' :
                                                                'bg-indigo-100 text-indigo-700'
                                                }`}
                                            >
                                                {tier.name[0]}
                                            </div>
                                            {tier.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="number"
                                            value={tier.minTrx}
                                            onChange={(e) => handleChange(index, 'minTrx', parseInt(e.target.value))}
                                            className="w-24 text-center px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                                            min={0}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <input
                                                type="number"
                                                value={tier.marginPercent}
                                                onChange={(e) => handleChange(index, 'marginPercent', parseFloat(e.target.value))}
                                                className="w-20 text-center px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                                                step="0.1"
                                                min={0}
                                            />
                                            <span className="text-gray-400 font-bold">%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                    Perubahan akan langsung berlaku untuk perhitungan harga user.
                </div>
            </div>
        </div>
    );
}
