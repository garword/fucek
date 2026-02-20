'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function DepositPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    const presets = [10000, 20000, 50000, 100000, 200000, 500000];

    const handleDeposit = async () => {
        if (!amount || Number(amount) < 1000) {
            showToast('Minimum deposit Rp 1.000', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount) })
            });

            const data = await res.json();

            if (res.ok) {
                showToast('Deposit created!', 'success');
                router.push(`/invoice/${data.depositId}`);
            } else {
                showToast(data.error || 'Failed to create deposit', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto py-10 px-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="bg-green-600 p-6 text-white text-center relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                    </div>

                    <Wallet className="w-12 h-12 mx-auto mb-2 opacity-90 relative z-10" />
                    <h1 className="text-2xl font-bold relative z-10">Isi Saldo</h1>
                    <p className="text-green-100 text-sm relative z-10">Topup instan, bebas admin saat belanja.</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Nominal Deposit (Rp)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold bg-gray-50 dark:bg-slate-900 dark:text-white transition-all"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-3 gap-3">
                        {presets.map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val)}
                                className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${amount === val
                                        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400 ring-2 ring-green-500/20'
                                        : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300'
                                    }`}
                            >
                                {val.toLocaleString('id-ID')}
                            </button>
                        ))}
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3 items-start">
                        <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full text-amber-700 dark:text-amber-500 mt-0.5 shrink-0">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-amber-800 dark:text-amber-500 leading-relaxed">
                            <span className="font-bold block mb-0.5">Info Biaya Layanan</span>
                            Biaya admin payment gateway akan ditambahkan otomatis. Saldo yang masuk akan utuh sesuai nominal yang Anda pilih.
                        </div>
                    </div>

                    <button
                        onClick={handleDeposit}
                        disabled={loading || !amount}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lanjut Pembayaran'}
                        {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </button>

                    <div className="text-center">
                        <p className="text-xs text-gray-400">
                            Pembayaran diamankan dengan enkripsi SSL 256-bit.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
