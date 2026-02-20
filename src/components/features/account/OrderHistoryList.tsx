'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDateShortWIB } from '@/lib/date-utils';
import { formatRupiah } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Search, FileText, CheckCircle, XCircle, Clock, ExternalLink, Loader2, Star } from 'lucide-react';
import ReviewModal from './ReviewModal';
import { useToast } from '@/context/ToastContext';

interface OrderHistoryListProps {
    orders: any[];
}

export default function OrderHistoryList({ orders }: OrderHistoryListProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [reviewModalOrder, setReviewModalOrder] = useState<any | null>(null);
    const { showToast } = useToast();
    const itemsPerPage = 10;

    // Filter
    const filteredOrders = orders.filter(order =>
        order.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderItems.some((item: any) => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SUCCESS': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SUCCESS': return <CheckCircle size={14} />;
            case 'PENDING': return <Clock size={14} />;
            case 'FAILED': return <XCircle size={14} />;
            default: return <FileText size={14} />;
        }
    };

    if (orders.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 font-medium">Belum ada riwayat transaksi.</p>
                <Link href="/" className="mt-4 inline-block text-green-600 font-bold hover:underline">
                    Mulai Belanja
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header / Filter */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-center bg-gray-50/50">
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <FileText size={18} className="text-green-600" />
                    Riwayat Transaksi
                    <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {filteredOrders.length}
                    </span>
                </h2>
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Cari invoice..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Invoice</th>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Item</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Total</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {currentOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4 font-mono font-bold text-gray-700">
                                    {order.invoiceCode}
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {formatDateShortWIB(new Date(order.createdAt))} {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                                        timeZone: 'Asia/Jakarta',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {order.orderItems.map((item: any, idx: number) => (
                                            <div key={idx} className="text-gray-900 font-medium">
                                                {item.productName}
                                                <span className="text-gray-400 text-xs ml-1">
                                                    ({item.variantName})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                    {formatRupiah(Number(order.totalAmount))}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Link
                                            href={`/invoice/${order.invoiceCode}`}
                                            className="inline-flex items-center justify-center w-8 h-8 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                            title="Lihat Detail"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>

                                        {(order.status === 'SUCCESS' || order.status === 'DELIVERED') && (
                                            <button
                                                onClick={() => {
                                                    if (order.isReviewed) {
                                                        showToast('Anda sudah memberi rating', 'info');
                                                    } else {
                                                        setReviewModalOrder(order);
                                                    }
                                                }}
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${order.isReviewed
                                                    ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                                                    : 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                                                    }`}
                                                title={order.isReviewed ? "Sudah Dinilai" : "Beri Ulasan"}
                                            >
                                                <Star size={16} className={order.isReviewed ? "fill-yellow-500" : ""} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-gray-600">
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Review Modal */}
            {reviewModalOrder && (
                <ReviewModal
                    isOpen={!!reviewModalOrder}
                    onClose={() => setReviewModalOrder(null)}
                    productId={reviewModalOrder.orderItems[0]?.variant?.productId} // Assuming single main product per invoice or first item
                    productName={reviewModalOrder.orderItems[0]?.productName}
                    variantName={reviewModalOrder.orderItems[0]?.variantName}
                />
            )}
        </div>
    );
}
