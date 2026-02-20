
'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleAuthConfigForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [config, setConfig] = useState({
        clientId: '',
        clientSecret: '',
        appUrl: ''
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
                const clientId = data.find((c: any) => c.key === 'GOOGLE_CLIENT_ID')?.value || '';
                const clientSecret = data.find((c: any) => c.key === 'GOOGLE_CLIENT_SECRET')?.value || '';
                const appUrl = data.find((c: any) => c.key === 'APP_URL')?.value || '';
                setConfig({ clientId, clientSecret, appUrl });
            }
        } catch (error) {
            console.error('Failed to load config:', error);
            toast.error('Gagal memuat konfigurasi Google Auth');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Save Client ID
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'GOOGLE_CLIENT_ID',
                    value: config.clientId,
                    description: 'Google OAuth Client ID',
                    isSecret: false
                }),
            });

            // Save Client Secret
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'GOOGLE_CLIENT_SECRET',
                    value: config.clientSecret,
                    description: 'Google OAuth Client Secret',
                    isSecret: true
                }),
            });

            // Save APP URL
            if (config.appUrl) {
                await fetch('/api/admin/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key: 'APP_URL',
                        value: config.appUrl.replace(/\/$/, ''), // Remove trailing slash
                        description: 'Application URL (for Redirect URI)',
                        isSecret: false
                    }),
                });
            }

            toast.success('Konfigurasi Google Auth berhasil disimpan');
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                    <path d="M12.24 24.0008C15.4764 24.0008 18.2059 22.9382 20.19 21.1039L16.323 18.1056C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853" />
                    <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.5166C-0.18551 10.0056 -0.18551 14.0004 1.5166 17.3912L5.50253 14.3003Z" fill="#FBBC05" />
                    <path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.0344664 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50253 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335" />
                </svg>
                Konfigurasi Google Auth
            </h2>
            <p className="text-sm text-gray-500 mb-6">
                Masukkan Client ID dan Client Secret dari Google Cloud Console. Konfigurasi ini akan menimpa pengaturan di file .env.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Client ID</label>
                    <input
                        type="text"
                        value={config.clientId}
                        onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="contoh: 123456789-abcdef..."
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Client Secret</label>
                    <div className="relative">
                        <input
                            type={showSecret ? "text" : "password"}
                            value={config.clientSecret}
                            onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
                            placeholder="Mulai dengan GOCSPX-..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Application URL (Opsional - Untuk Cloudflare/Domain)</label>
                    <input
                        type="url"
                        value={config.appUrl}
                        onChange={(e) => setConfig({ ...config, appUrl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="https://toko-saya.trycloudflare.com (Tanpa slash akhir)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Jika Anda menggunakan Cloudflare Tunnel atau domain kustom, masukkan URL lengkapnya di sini.
                        Redirect URI Anda akan menjadi: <code className="bg-gray-100 px-1 rounded">{config.appUrl || '...'}/api/auth/google/callback</code>
                    </p>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Simpan Konfigurasi
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
