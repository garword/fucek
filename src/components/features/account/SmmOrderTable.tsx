
'use client';

import { useState } from 'react';
import {
    ShoppingBag,
    Calendar,
    Link as LinkIcon,
    RefreshCw,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Loader2
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import AlertModal from '@/components/ui/AlertModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SmmDetailModal from '@/components/features/account/SmmDetailModal';

interface SmmOrderTableProps {
    orders: any[]; // Serialized order items
}

export default function SmmOrderTable({ orders }: SmmOrderTableProps) {
    const router = useRouter();
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'success' | 'error' | 'info' }>({ isOpen: false, title: '', message: '', type: 'info' });
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, type: 'info' | 'warning' | 'danger' }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'info' });
    const [detailState, setDetailState] = useState<{ isOpen: boolean, order: any, statusData?: any }>({ isOpen: false, order: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    // Helper to format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper for Status Badge
    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'success':
                return <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-bold border border-green-200">Success</span>;
            case 'pending':
                return <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">Pending</span>;
            case 'processing':
                return <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">Processing</span>;
            case 'error':
            case 'partial':
                return <span className="px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-bold border border-red-200">{status}</span>;
            default:
                return <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">{status || 'Unknown'}</span>;
        }
    };

    const processAction = async (action: 'status' | 'refill', orderId: string, providerId: string) => {
        setLoadingAction(`${action}-${orderId}`);
        // Close confirm modal if open
        setConfirmState(prev => ({ ...prev, isOpen: false }));

        try {
            const res = await fetch('/api/profile/smm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, id: providerId }),
            });
            const data = await res.json();

            if (data.success) {
                if (action === 'status') {
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        setDetailState({
                            isOpen: true,
                            order: order,
                            statusData: data.data
                        });
                    }
                } else {
                    setAlertState({
                        isOpen: true,
                        title: 'Berhasil',
                        message: data.data.msg || 'Action successful',
                        type: 'success'
                    });
                }
                router.refresh();
            } else {
                setAlertState({
                    isOpen: true,
                    title: 'Gagal',
                    message: data.error || 'Terjadi kesalahan',
                    type: 'error'
                });
            }
        } catch (err) {
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Terjadi kesalahan koneksi',
                type: 'error'
            });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleActionClick = (action: 'status' | 'refill', orderId: string, providerId: string) => {
        if (!providerId) {
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Order ID Provider tidak ditemukan.',
                type: 'error'
            });
            return;
        }

        if (action === 'refill') {
            setConfirmState({
                isOpen: true,
                title: 'Konfirmasi Refill',
                message: 'Apakah Anda yakin ingin mengajukan refill untuk pesanan ini? Pastikan status pesanan memenuhi syarat refill.',
                type: 'warning',
                onConfirm: () => processAction(action, orderId, providerId)
            });
        } else {
            // Check status directly
            processAction(action, orderId, providerId);
        }
    };

    // Filter Logic
    const filteredOrders = orders.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.target?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.providerTrxId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
                loading={!!loadingAction}
            />

            <SmmDetailModal
                isOpen={detailState.isOpen}
                onClose={() => setDetailState(prev => ({ ...prev, isOpen: false }))}
                order={detailState.order}
                statusData={detailState.statusData}
            />

            {/* Search Bar */}
            <div className="relative z-0">
                <input
                    type="text"
                    placeholder="Cari ID, Layanan, atau Target..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-sm"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">ID / Tanggal</th>
                                <th className="px-4 py-3">Layanan</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3 text-center">Jumlah</th>
                                <th className="px-4 py-3 text-right">Biaya</th>
                                <th className="px-4 py-3 text-center">Awal / Sisa</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.length > 0 ? filteredOrders.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">#{item.providerTrxId || '-'}</span>
                                            <span className="text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top font-medium text-gray-700 max-w-[200px] truncate" title={item.productName}>
                                        {item.productName}
                                    </td>
                                    <td className="px-4 py-3 align-top max-w-[150px] truncate text-blue-600" title={item.target}>
                                        {item.target || '-'}
                                    </td>
                                    <td className="px-4 py-3 align-top text-center font-bold text-gray-700">
                                        {item.quantity}
                                    </td>
                                    <td className="px-4 py-3 align-top text-right font-bold text-green-600">
                                        {formatRupiah(item.subtotal)}
                                    </td>
                                    <td className="px-4 py-3 align-top text-center text-xs">
                                        <div className="font-medium">{item.startCount ?? '-'} / {item.remains ?? '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-center">
                                        {getStatusBadge(item.providerStatus)}
                                    </td>
                                    <td className="px-4 py-3 align-top text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleActionClick('status', item.id, item.providerTrxId)}
                                                disabled={loadingAction === `status-${item.id}`}
                                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                                                title="Cek Status"
                                            >
                                                {loadingAction === `status-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                            </button>
                                            {item.isRefill && (
                                                <button
                                                    onClick={() => handleActionClick('refill', item.id, item.providerTrxId)}
                                                    disabled={loadingAction === `refill-${item.id}`}
                                                    className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                                                    title="Request Refill"
                                                >
                                                    {loadingAction === `refill-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">Belum ada pesanan sosmed.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards (Responsive) */}
            <div className="md:hidden space-y-4">
                {filteredOrders.length > 0 ? filteredOrders.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="font-bold text-gray-900 block">#{item.providerTrxId || '-'}</span>
                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(item.createdAt)}
                                </span>
                            </div>
                            {getStatusBadge(item.providerStatus)}
                        </div>

                        <div className="pt-2 border-t border-gray-50">
                            <p className="font-bold text-gray-800 text-sm line-clamp-2">{item.productName}</p>
                            <p className="text-xs text-blue-600 mt-1 truncate flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" /> {item.target || '-'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                            <div>Start: <b>{item.startCount ?? '-'}</b></div>
                            <div>Remains: <b>{item.remains ?? '-'}</b></div>
                            <div>Qty: <b>{item.quantity}</b></div>
                            <div>Total: <b className="text-green-600">{formatRupiah(item.subtotal)}</b></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => handleActionClick('status', item.id, item.providerTrxId)}
                                disabled={loadingAction === `status-${item.id}`}
                                className="py-2 px-4 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-100 disabled:opacity-50"
                            >
                                {loadingAction === `status-${item.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                                Cek Status
                            </button>
                            {item.isRefill && (
                                <button
                                    onClick={() => handleActionClick('refill', item.id, item.providerTrxId)}
                                    disabled={loadingAction === `refill-${item.id}`}
                                    className="py-2 px-4 rounded-lg bg-orange-50 text-orange-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-orange-100 disabled:opacity-50"
                                >
                                    {loadingAction === `refill-${item.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Refill
                                </button>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8 text-gray-500">Belum ada pesanan sosmed.</div>
                )}
            </div>
        </div>
    );
}
