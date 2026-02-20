'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Database, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function TursoConfigForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [config, setConfig] = useState({
        dbUrl: '',
        authToken: ''
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
                const dbUrl = data.find((c: any) => c.key === 'TURSO_DATABASE_URL')?.value || '';
                const authToken = data.find((c: any) => c.key === 'TURSO_AUTH_TOKEN')?.value || '';
                setConfig({ dbUrl, authToken });
            }
        } catch (error) {
            console.error('Failed to load config:', error);
            toast.error('Gagal memuat konfigurasi Turso');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Save DB URL
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'TURSO_DATABASE_URL',
                    value: config.dbUrl,
                    description: 'Turso Database Connection URL (libsql://...)',
                    isSecret: false
                }),
            });

            // Save Auth Token
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'TURSO_AUTH_TOKEN',
                    value: config.authToken,
                    description: 'Turso Authentication Token',
                    isSecret: true
                }),
            });

            toast.success('Konfigurasi Turso berhasil disimpan');
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
                <div className="p-2 bg-teal-50 rounded-lg">
                    <Database className="w-5 h-5 text-teal-600" />
                </div>
                Konfigurasi Database Turso
            </h2>

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-sm text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>
                    <strong>Perhatian:</strong> Kredensial ini disimpan di database sistem (`SystemConfig`) sebagai cadangan atau untuk fitur dinamis di masa depan.
                    <br />
                    Aplikasi saat ini menggunakan koneksi yang didefinisikan di `.env` saat startup. Mengubah nilai di sini <strong>mungkin tidak langsung berpengaruh</strong> tanpa restart aplikasi / redeploy, tergantung implementasi Prisma Client Anda.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Database URL</label>
                    <input
                        type="text"
                        value={config.dbUrl}
                        onChange={(e) => setConfig({ ...config, dbUrl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors font-mono text-sm"
                        placeholder="libsql://your-db-name.turso.io"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        URL koneksi LibSQL dari dashboard Turso.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
                    <div className="relative">
                        <input
                            type={showToken ? "text" : "password"}
                            value={config.authToken}
                            onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors pr-10 font-mono text-sm"
                            placeholder="eyJhbGciOiJIUzI1NiI..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
