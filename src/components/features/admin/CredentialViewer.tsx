
'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff, Check } from 'lucide-react';

export default function CredentialViewer({ item, index, mockPayload }: { item: any, index: number, mockPayload: string }) {
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    // In real app, payload might need decryption. Here use mockPayload.
    const payload = mockPayload;

    const handleCopy = () => {
        navigator.clipboard.writeText(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white border rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
                <p className="font-semibold text-gray-800">{item.variantName}</p>
                <p className="text-xs text-gray-500">{item.productName}</p>
            </div>

            <div className="flex items-center bg-gray-100 rounded px-3 py-2 border font-mono text-sm relative min-w-[200px] justify-between">
                <span className={revealed ? 'text-gray-900' : 'text-gray-400 blur-sm select-none'}>
                    {revealed ? payload : '••••••••••••••••'}
                </span>
                <div className="flex items-center space-x-2 ml-4">
                    <button
                        onClick={() => setRevealed(!revealed)}
                        className="text-gray-500 hover:text-gray-700"
                        title={revealed ? "Hide" : "Show"}
                    >
                        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="text-gray-500 hover:text-gray-700"
                        title="Copy"
                    >
                        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
