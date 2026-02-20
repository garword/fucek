
'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaymentConfirmationForm({ invoiceCode }: { invoiceCode: string }) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/payments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceCode, note })
            });
            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed');
            }
        } catch (error) {
            console.error(error);
            alert('Error submitting confirmation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Nama Pengirim</label>
                <textarea
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Ex: Transfer dari BCA a.n Budi sebesar Rp 50.000"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>Kirim Konfirmasi</span>
            </button>
        </form>
    );
}
