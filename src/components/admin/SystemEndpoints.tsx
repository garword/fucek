'use client';

import { useState, useEffect } from 'react';
import { Copy, CheckCircle } from 'lucide-react';

export default function SystemEndpoints() {
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [baseUrl, setBaseUrl] = useState('https://your-domain.com');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    const endpoints = [
        {
            name: 'Unified Status Check (Cron Job)',
            url: `${baseUrl}/api/cron/check-status`,
            description: 'URL untuk Cron Job VPS (Set setiap 1 menit). Mengecek status SMM, PPOB, dan Expired.'
        },
        {
            name: 'Digiflazz Webhook',
            url: `${baseUrl}/api/webhooks/digiflazz`,
            description: 'Endpoint untuk menerima notifikasi callback dari Digiflazz'
        },
        {
            name: 'TokoVoucher Webhook',
            url: `${baseUrl}/api/webhooks/tokovoucher`,
            description: 'Endpoint untuk menerima notifikasi callback dari TokoVoucher'
        },
        {
            name: 'PaKasir Callback',
            url: `${baseUrl}/api/webhooks/pakasir`,
            description: 'Endpoint untuk QRIS payment callback dari PaKasir'
        },
        {
            name: 'APIGames Webhook',
            url: `${baseUrl}/api/webhooks/apigames`,
            description: 'Endpoint untuk menerima notifikasi callback dari APIGames (Topup Games)'
        }
    ];

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
                {endpoints.map((endpoint, index) => (
                    <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 mb-1">{endpoint.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">{endpoint.description}</p>
                                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <code className="text-sm font-mono text-gray-700 flex-1 overflow-x-auto">
                                        {endpoint.url}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(endpoint.url)}
                                        className="p-2 hover:bg-white rounded-lg transition-colors shrink-0"
                                        title="Copy URL"
                                    >
                                        {copiedUrl === endpoint.url ? (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
