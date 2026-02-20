'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Filter, Eye, Ban, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useToast } from '@/context/ToastContext';

type Order = {
    id: string;
    invoiceCode: string;
    status: string;
    paymentMethod: string;
    totalAmount: number;
    createdAt: string;
    user: { name: string; email: string; username?: string };
    orderItems: { productName: string; variantName: string; quantity: number }[];
};

export default function OrdersPage() {
    const { showToast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            } else {
                showToast('Gagal memuat data orders', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.user.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        const statusMap: any = {
            'PENDING': { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
            'PROCESSING': { label: 'Diproses', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: RefreshCw },
            'DELIVERED': { label: 'Berhasil', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
            'CANCELED': { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Ban },
            'FAILED': { label: 'Gagal', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
        };
        const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Package };
        const StatusIcon = statusInfo.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusInfo.color}`}>
                <StatusIcon size={12} />
                {statusInfo.label}
            </span>
        );
    };

    const formatRupiah = (amount: number) => {
        return `Rp ${Number(amount).toLocaleString('id-ID')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleExport = () => {
        if (filteredOrders.length === 0) {
            showToast('Tidak ada data untuk diexport', 'error');
            return;
        }

        const dataToExport = filteredOrders.map(order => ({
            'Invoice': order.invoiceCode,
            'Pelanggan': order.user?.name || order.user?.username || 'Unknown',
            'Email': order.user?.email || '-',
            'Produk': order.orderItems.map(item => `${item.productName} (${item.variantName})`).join(', ') || '-',
            'Total Bayar': Number(order.totalAmount),
            'Metode Pembayaran': order.paymentMethod || '-',
            'Status': order.status,
            'Tanggal': new Date(order.createdAt).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

        // Auto-width columns
        const max_width = dataToExport.reduce((w, r) => Math.max(w, r['Produk'].length), 10);
        worksheet['!cols'] = [
            { wch: 15 }, // Invoice
            { wch: 20 }, // Pelanggan
            { wch: 25 }, // Email
            { wch: max_width }, // Produk
            { wch: 15 }, // Total
            { wch: 15 }, // Payment
            { wch: 12 }, // Status
            { wch: 20 }  // Tanggal
        ];

        XLSX.writeFile(workbook, `Orders_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('Berhasil mengexport data ke Excel', 'success');
    };

    return (
        <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search invoices, customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer appearance-none"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="DELIVERED">Success</option>
                            <option value="CANCELED">Canceled</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                    <button onClick={fetchOrders} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Package size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-400 font-bold text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Invoice</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4">Total</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Package className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="font-medium">No orders found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-blue-600">#{order.invoiceCode}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{order.paymentMethod}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {(order.user?.name || order.user?.username || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{order.user?.name || order.user?.username || 'Unknown User'}</span>
                                                        <span className="text-xs text-gray-500">{order.user?.email || 'No Email'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">
                                                    {order.orderItems.length > 0 ? (
                                                        <>
                                                            <div className="font-medium truncate max-w-[200px]">{order.orderItems[0].productName}</div>
                                                            <div className="text-xs text-gray-500">{order.orderItems[0].variantName}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900">{formatRupiah(order.totalAmount)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                                                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                            order.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-500 font-medium">{formatDate(order.createdAt)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/invoice/${order.invoiceCode}`}
                                                    target="_blank"
                                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Invoice"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
