'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ResendConfigForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const [config, setConfig] = useState({
        apiKey: '',
        fromEmail: ''
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/config');
            if (res.ok) {
                const data = await res.json();
                const apiKey = data.find((c: any) => c.key === 'RESEND_API_KEY')?.value || '';
                const fromEmail = data.find((c: any) => c.key === 'RESEND_FROM_EMAIL')?.value || '';
                setConfig({ apiKey, fromEmail });
            }
        } catch (error) {
            console.error('Failed to load Resend config:', error);
            toast.error('Gagal memuat konfigurasi Email');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Save API Key
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'RESEND_API_KEY',
                    value: config.apiKey,
                    description: 'Resend API Key (Email Service)',
                    isSecret: true
                }),
            });

            // Save From Email
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'RESEND_FROM_EMAIL',
                    value: config.fromEmail,
                    description: 'Sender Email Address (From)',
                    isSecret: false
                }),
            });

            toast.success('Konfigurasi Email berhasil disimpan');
        } catch (error) {
            console.error('Failed to save config:', error);
            toast.error('Gagal menyimpan konfigurasi');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Memuat konfigurasi...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                    <Mail className="text-emerald-600" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Konfigurasi Email (Resend)</h3>
                    <p className="text-sm text-gray-500">Atur kredensial layanan email untuk pengiriman OTP.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                {/* API Key Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resend API Key</label>
                    <div className="relative">
                        <input
                            type={showKey ? "text" : "password"}
                            value={config.apiKey}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors pr-10"
                            placeholder="re_12345678..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Dapatkan API Key di <a href="https://resend.com/api-keys" target="_blank" className="text-emerald-600 hover:underline">Dashboard Resend</a>.
                    </p>
                </div>

                {/* From Email Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email (From)</label>
                    <input
                        type="email" // Changed from text to email for validation
                        value={config.fromEmail}
                        onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        placeholder="onboarding@resend.dev"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Gunakan <code>onboarding@resend.dev</code> untuk testing, atau domain terverifikasi Anda.
                    </p>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Simpan Konfigurasi
                    </button>
                </div>
            </form>
        </div>
    );
}
