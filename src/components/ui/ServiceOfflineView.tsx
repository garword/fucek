'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ServiceOfflineView() {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {!imageError ? (
                    <img
                        src="/icons/maintenance.svg"
                        alt="Offline"
                        className="w-12 h-12 opacity-50"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M12 12v6" />
                        <path d="M12 18h.01" />
                    </svg>
                )}
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-900">Layanan Sedang Offline</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    Mohon maaf, layanan untuk kategori ini sedang dalam perbaikan atau dinonaktifkan sementara. Silakan cek kembali nanti.
                </p>
            </div>
            <Link href="/" className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Kembali ke Beranda
            </Link>
        </div>
    );
}
