'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDateShortWIB } from '@/lib/date-utils';
import { formatRupiah } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Search, FileText, CheckCircle, XCircle, Clock, ExternalLink, Wallet } from 'lucide-react';

interface DepositHistoryListProps {
    deposits: any[];
}

export default function DepositHistoryList({ deposits }: DepositHistoryListProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;

    // Filter
    const filteredDeposits = deposits.filter(deposit =>
        deposit.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentDeposits = filteredDeposits.slice(startIndex, startIndex + itemsPerPage);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'FAILED':
            case 'CANCELED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return <CheckCircle size={14} />;
            case 'PENDING': return <Clock size={14} />;
            case 'FAILED':
            case 'CANCELED': return <XCircle size={14} />;
            default: return <FileText size={14} />;
        }
    };

    if (deposits.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="text-green-600 w-8 h-8" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg">Belum ada deposit</h3>
                <p className="text-gray-500 text-sm mb-6">Isi saldo sekarang untuk kemudahan bertransaksi.</p>
                <Link href="/wallet/deposit" className="inline-flex items-center gap-2 bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200/50">
                    Isi Saldo
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header / Filter */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-center bg-gray-50/50">
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <Wallet size={18} className="text-green-600" />
                    Riwayat Deposit
                    <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {filteredDeposits.length}
                    </span>
                </h2>
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Cari ID Deposit..."
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
                            <th className="px-6 py-4">ID Deposit</th>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Metode</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Nominal</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {currentDeposits.map((deposit) => (
                            <tr key={deposit.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4 font-mono font-bold text-gray-700 text-xs sm:text-sm">
                                    {deposit.id}
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {formatDateShortWIB(new Date(deposit.createdAt))} {new Date(deposit.createdAt).toLocaleTimeString('id-ID', {
                                        timeZone: 'Asia/Jakarta',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-medium text-gray-900">{deposit.paymentMethod}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(deposit.status)}`}>
                                        {getStatusIcon(deposit.status)}
                                        {deposit.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-gray-900">{formatRupiah(Number(deposit.amount))}</div>
                                    <div className="text-xs text-gray-400">+Fee {formatRupiah(Number(deposit.feeAmount))}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Link
                                        href={`/invoice/${deposit.id}`}
                                        className="inline-flex items-center justify-center p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                        title="Lihat Invoice"
                                    >
                                        <ExternalLink size={16} />
                                    </Link>
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
        </div>
    );
}
