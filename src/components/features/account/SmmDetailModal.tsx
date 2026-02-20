import { X, Copy, Check, Clock } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useState } from 'react';

interface SmmDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    statusData?: any; // Data from correct Status Check (start_count, remains)
}

export default function SmmDetailModal({ isOpen, onClose, order, statusData }: SmmDetailModalProps) {
    const [copied, setCopied] = useState<string | null>(null);

    if (!isOpen || !order) return null;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase();
        let colorClass = 'bg-gray-100 text-gray-800';
        if (s === 'success' || s === 'completed') colorClass = 'bg-green-100 text-green-800';
        if (s === 'pending') colorClass = 'bg-yellow-100 text-yellow-800';
        if (s === 'processing') colorClass = 'bg-blue-100 text-blue-800';
        if (s === 'error' || s === 'canceled') colorClass = 'bg-red-100 text-red-800';

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${colorClass}`}>
                {status}
            </span>
        );
    };

    // Merge status data if available
    const displayStatus = statusData?.status || order.providerStatus;
    const displayStartCount = statusData?.start_count || order.startCount || '0';
    const displayRemains = statusData?.remains || order.remains || '0';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-gray-900">Detail Pesanan #{order.providerTrxId}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 text-sm">

                    {/* ID Pesanan */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">ID Pesanan</label>
                        <div className="flex gap-2">
                            <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-gray-700">
                                {order.providerTrxId}
                            </div>
                            <button
                                onClick={() => handleCopy(order.providerTrxId, 'id')}
                                className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                {copied === 'id' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Dibuat */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Dibuat</label>
                        <div className="text-gray-700 font-medium border-b border-gray-100 pb-2">
                            {formatDate(order.createdAt)}
                        </div>
                    </div>

                    {/* Layanan */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Layanan</label>
                        <div className="text-gray-700 font-medium leading-relaxed border-b border-gray-100 pb-2">
                            {order.productName}
                        </div>
                    </div>

                    {/* Target */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Target</label>
                        <div className="flex gap-2">
                            <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 truncate">
                                {order.target}
                            </div>
                            <button
                                onClick={() => handleCopy(order.target, 'target')}
                                className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                {copied === 'target' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Jumlah Pesan</label>
                            <div className="text-gray-900 font-bold text-lg">
                                {parseInt(order.quantity).toLocaleString('id-ID')}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Biaya</label>
                            <div className="text-gray-900 font-bold text-lg">
                                {formatRupiah(order.subtotal)}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Jumlah Awal</label>
                            <div className="text-gray-900 font-bold text-lg">
                                {displayStartCount}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Sisa</label>
                            <div className="text-gray-900 font-bold text-lg">
                                {displayRemains}
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase block">Status</label>
                            {getStatusBadge(displayStatus)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
