import { useState } from 'react';
import { Loader2, Wallet, QrCode, X } from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (method: 'qris' | 'balance') => void;
    totalAmount: number;
    userBalance: number;
    loading: boolean;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, totalAmount, userBalance, loading }: PaymentModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<'qris' | 'balance'>('qris');

    if (!isOpen) return null;

    const isBalanceSufficient = userBalance >= totalAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-900">Pilih Pembayaran</h3>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Amount Summary */}
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Total Pembayaran</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{formatRupiah(totalAmount)}</p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Metode Tersedia</p>

                        {/* QRIS Option */}
                        <button
                            onClick={() => setSelectedMethod('qris')}
                            className={cn(
                                "w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all relative overflow-hidden group text-left",
                                selectedMethod === 'qris'
                                    ? "border-emerald-500 bg-emerald-50/50 shadow-emerald-100 shadow-lg"
                                    : "border-gray-200 hover:border-emerald-200 hover:bg-gray-50"
                            )}
                        >
                            <div className={cn("p-3 rounded-xl transition-colors", selectedMethod === 'qris' ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500")}>
                                <QrCode className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">QRIS (All Payment)</p>
                                <p className="text-xs text-gray-500">Scan QR via GoPay, OVO, Dana, dll.</p>
                            </div>
                            {selectedMethod === 'qris' && <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-md"></div>}
                        </button>

                        {/* Balance Option */}
                        <button
                            disabled={!isBalanceSufficient}
                            onClick={() => isBalanceSufficient && setSelectedMethod('balance')}
                            className={cn(
                                "w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all relative overflow-hidden group text-left",
                                !isBalanceSufficient
                                    ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-100"
                                    : selectedMethod === 'balance'
                                        ? "border-blue-500 bg-blue-50/50 shadow-blue-100 shadow-lg"
                                        : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                            )}
                        >
                            <div className={cn("p-3 rounded-xl transition-colors", selectedMethod === 'balance' ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500")}>
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">Saldo Akun</p>
                                <p className={cn("text-xs", isBalanceSufficient ? "text-gray-500" : "text-red-500 font-bold")}>
                                    Saldo: {formatRupiah(userBalance)}
                                    {!isBalanceSufficient && " (Tidak Cukup)"}
                                </p>
                            </div>
                            {selectedMethod === 'balance' && <div className="w-4 h-4 rounded-full bg-blue-500 shadow-md"></div>}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => onConfirm(selectedMethod)}
                        disabled={loading}
                        className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {loading ? 'Memproses Transaksi...' : 'Bayar Sekarang'}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan.
                    </p>
                </div>
            </div>
        </div>
    );
}
