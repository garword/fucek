
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText } from 'lucide-react';

export default function TrackPage() {
    const [invoiceCode, setInvoiceCode] = useState('');
    const router = useRouter();

    const handleTrack = (e: React.FormEvent) => {
        e.preventDefault();
        if (invoiceCode.trim()) {
            router.push(`/invoice/${invoiceCode.trim()}`);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 bg-transparent">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-green-600" />
                </div>

                <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Lacak Pesanan</h1>
                <p className="text-gray-500 text-center mb-8 text-sm">Masukkan kode invoice Anda untuk melihat status pesanan.</p>

                <form onSubmit={handleTrack} className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={invoiceCode}
                            onChange={(e) => setInvoiceCode(e.target.value)}
                            placeholder="Contoh: INV-RW-123456-ABCD"
                            className="w-full border border-gray-200 rounded-xl px-5 py-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-mono uppercase placeholder:normal-case placeholder:font-sans"
                            required
                        />
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-green-600/30 flex items-center justify-center space-x-2 active:scale-[0.98]"
                    >
                        <span>Lacak Pesanan</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
