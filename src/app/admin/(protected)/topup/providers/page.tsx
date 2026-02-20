'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Server, CheckCircle, XCircle, Wallet, RefreshCcw, Banknote, Activity, Settings2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function ProviderSettingsPage() {
    const { showToast } = useToast();
    const [username, setUsername] = useState('');
    const [key, setKey] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [webhookId, setWebhookId] = useState('');
    const [apigamesMerchant, setApigamesMerchant] = useState('');
    const [apigamesSecret, setApigamesSecret] = useState('');
    const [margin, setMargin] = useState('5');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'digiflazz' | 'apigames' | 'settings'>('digiflazz');

    // APIGames Balance & Deposit State
    const [balance, setBalance] = useState<any>(null);
    const [checkingBalance, setCheckingBalance] = useState(false);
    const [depositNominal, setDepositNominal] = useState('');
    const [depositResult, setDepositResult] = useState<any>(null);
    const [isDepositing, setIsDepositing] = useState(false);

    // Engine Check State
    const [loadingEngine, setLoadingEngine] = useState<string | null>(null);
    const [engineResult, setEngineResult] = useState<any>(null);

    useEffect(() => {
        fetch('/api/admin/topup/config')
            .then(res => res.json())
            .then(data => {
                setUsername(data.username || '');
                setKey(data.key || '');
                setWebhookSecret(data.webhook_secret || '');
                setWebhookId(data.webhook_id || '');
                setApigamesMerchant(data.apigames_merchant_id || '');
                setApigamesSecret(data.apigames_secret_key || '');
                setMargin(data.margin || '5');
                setLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/topup/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    key,
                    margin: parseFloat(margin),
                    webhook_secret: webhookSecret,
                    webhook_id: webhookId,
                    apigames_merchant_id: apigamesMerchant,
                    apigames_secret_key: apigamesSecret
                })
            });
            if (res.ok) {
                showToast('Pengaturan berhasil disimpan!', 'success');
            } else {
                showToast('Gagal menyimpan pengaturan', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCheckConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/topup/digiflazz/check-balance', { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.success) {
                const balanceFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.data.balance);
                setTestResult({
                    success: true,
                    message: `Koneksi Aman | Saldo: ${balanceFormatted}`
                });
                showToast('Koneksi Terhubung', 'success');
            } else {
                setTestResult({
                    success: false,
                    message: `Gagal: ${data.error || 'Terjadi kesalahan sistem'}`
                });
                showToast('Koneksi Gagal', 'error');
            }
        } catch (error) {
            setTestResult({ success: false, message: 'Gagal menghubungi server' });
            showToast('Gagal menghubungi server', 'error');
        } finally {
            setTesting(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/topup/test-connection');
            const data = await res.json();
            if (res.ok && data.success) {
                setTestResult({ success: true, message: `Koneksi Berhasil! Saldo: ${data.balance}` });
                showToast('Koneksi Berhasil!', 'success');
            } else {
                setTestResult({ success: false, message: data.error || 'Koneksi Gagal' });
                showToast('Koneksi Gagal: ' + data.error, 'error');
            }
        } catch (error) {
            setTestResult({ success: false, message: 'Gagal menghubungi server' });
            showToast('Gagal menghubungi server', 'error');
        } finally {
            setTesting(false);
        }
    };

    const handleSync = async (provider?: string) => {
        const target = provider || 'Semua Provider';
        if (!confirm(`Mulai sinkronisasi produk dari ${target}?`)) return;
        setTesting(true);
        try {
            const res = await fetch('/api/admin/topup/sync-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
            } else {
                showToast('Sync Gagal: ' + data.error, 'error');
            }
        } catch (error) {
            showToast('Gagal menghubungi server', 'error');
        } finally {
            setTesting(false);
        }
    };

    const handleCheckBalance = async () => {
        setCheckingBalance(true);
        try {
            const res = await fetch('/api/admin/topup/apigames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'BALANCE' })
            });
            const data = await res.json();
            if (res.ok && data.data) {
                setBalance(data.data.saldo);
            } else {
                showToast('Gagal cek saldo: ' + (data.error || data.message), 'error');
            }
        } catch (error) {
            showToast('Error checking balance', 'error');
        } finally {
            setCheckingBalance(false);
        }
    };

    const handleDeposit = async () => {
        if (!depositNominal) return showToast('Masukkan nominal!', 'error');
        setIsDepositing(true);
        setDepositResult(null);
        try {
            const res = await fetch('/api/admin/topup/apigames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'DEPOSIT', nominal: depositNominal })
            });
            const data = await res.json();
            if (res.ok && data.data) {
                setDepositResult(data.data);
                showToast('Request Deposit Berhasil!', 'success');
            } else {
                showToast('Gagal request deposit: ' + (data.error || data.message), 'error');
            }
        } catch (error) {
            showToast('Error requesting deposit', 'error');
        } finally {
            setIsDepositing(false);
        }
    };

    const handleCheckEngine = async (engine: string) => {
        setLoadingEngine(engine);
        setEngineResult(null);
        try {
            const res = await fetch('/api/admin/topup/apigames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CHECK_CONNECTION', engine })
            });
            const data = await res.json();

            const isSuccess = data.status === 1 || res.ok;

            setEngineResult({
                success: isSuccess,
                engine: engine.toUpperCase(),
                message: isSuccess ? (data.message || 'Connected') : (data.error_msg || data.message || 'Failed'),
                data: data.data
            });

        } catch (error) {
            setEngineResult({ success: false, engine: engine.toUpperCase(), message: 'Error calling API' });
        } finally {
            setLoadingEngine(null);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 p-4 md:p-0 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Provider Integrations</h1>
                    <p className="text-sm md:text-base text-gray-500 mt-1">Kelola koneksi ke penyedia layanan Topup Game.</p>
                </div>
            </div>

            {/* Mobile-Friendly Tabs */}
            <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-md py-2 -mx-4 px-4 md:static md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none">
                <div className="flex gap-2 p-1 bg-gray-200/50 backdrop-blur-sm rounded-xl md:rounded-2xl w-full md:w-fit overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'digiflazz', label: 'Digiflazz', color: 'blue' },
                        { id: 'apigames', label: 'APIGames', color: 'orange' },
                        { id: 'settings', label: 'Pengaturan', icon: Settings2 }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-medium text-xs md:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${activeTab === tab.id
                                ? `bg-white text-${tab.color || 'gray'}-600 shadow-sm ring-1 ring-black/5`
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            {tab.icon ? <tab.icon className="w-4 h-4" /> : (
                                <div className={`w-2 h-2 rounded-full ${activeTab === tab.id ? `bg-${tab.color}-500` : 'bg-gray-400'}`} />
                            )}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden relative">
                <form onSubmit={handleSave}>
                    {/* DIGIFLAZZ TAB */}
                    {activeTab === 'digiflazz' && (
                        <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                    <Server className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-gray-900">Konfigurasi Digiflazz</h2>
                                    <p className="text-xs md:text-sm text-gray-500">Provider utama untuk produk game & pulsa.</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:gap-6">
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Username Digiflazz</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none text-sm"
                                        placeholder="username..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">API Key Production</label>
                                    <input
                                        type="text"
                                        value={key}
                                        onChange={e => setKey(e.target.value)}
                                        className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none font-mono text-sm"
                                        placeholder="secret_..."
                                    />
                                    <p className="text-[10px] md:text-xs text-gray-400 mt-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
                                        Pastikan IP Whitelist sudah aktif di dashboard Digiflazz.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Webhook ID</label>
                                    <input
                                        type="text"
                                        value={webhookId}
                                        onChange={e => setWebhookId(e.target.value)}
                                        className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none font-mono text-sm"
                                        placeholder="webhook_id..."
                                    />
                                    <p className="text-[10px] md:text-xs text-gray-400 mt-2">
                                        ID Webhook dari dashboard Digiflazz (Opsional / Referensi).
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Webhook Secret</label>
                                    <input
                                        type="text"
                                        value={webhookSecret}
                                        onChange={e => setWebhookSecret(e.target.value)}
                                        className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none font-mono text-sm"
                                        placeholder="secret_webhook..."
                                    />
                                    <p className="text-[10px] md:text-xs text-gray-400 mt-2">
                                        Digunakan untuk verifikasi data dari Webhook Digiflazz.
                                    </p>
                                </div>

                                {/* Webhook URL Display (Payload URL) */}
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Payload URL <span className="text-gray-400 font-normal">(Webhook)</span></label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/digiflazz`}
                                            className="w-full px-4 py-2 border border-blue-200 rounded-lg bg-white text-gray-600 text-sm font-mono"
                                            onClick={(e) => e.currentTarget.select()}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const url = `${window.location.origin}/api/webhooks/digiflazz`;
                                                navigator.clipboard.writeText(url);
                                                showToast('URL Webhook disalin!', 'success');
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold whitespace-nowrap transition-colors"
                                        >
                                            Salin
                                        </button>
                                    </div>
                                    <p className="text-[10px] md:text-xs text-blue-600 mt-2">
                                        Copy URL ini dan tempel di kolom <strong>Payload URL</strong> pada dashboard Digiflazz.
                                    </p>
                                    {typeof window !== 'undefined' && window.location.origin.includes('localhost') && (
                                        <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-xs border border-yellow-200 flex flex-col gap-1">
                                            <strong>⚠️ Perhatian:</strong>
                                            <span>
                                                Digiflazz tidak bisa mengirim Webhook ke <code>localhost</code>.
                                                Gunakan <strong>Ngrok</strong> atau upload website ke hosting agar URL bisa diakses publik.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Connection Test & Result */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-gray-700">Status Koneksi</span>
                                    <button
                                        type="button"
                                        onClick={handleCheckConnection}
                                        disabled={testing}
                                        className="text-xs bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                                    >
                                        {testing ? 'Mengecek...' : 'Cek Koneksi & Saldo'}
                                    </button>
                                </div>

                                {testResult && (
                                    <div className={`p-3 rounded-lg text-sm font-medium flex items-start gap-2 ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {testResult.success ? <CheckCircle size={18} className="mt-0.5" /> : <XCircle size={18} className="mt-0.5" />}
                                        <div>
                                            <p className="font-bold">{testResult.success ? 'Terhubung' : 'Gagal'}</p>
                                            <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-gray-50 flex flex-col-reverse md:flex-row items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full md:w-auto bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSync('DIGIFLAZZ')}
                                    disabled={testing || !username || !key}
                                    className="w-full md:w-auto ml-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                                >
                                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                                    Sync Digiflazz
                                </button>
                            </div>
                        </div>
                    )}

                    {/* APIGAMES TAB */}
                    {activeTab === 'apigames' && (
                        <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                                        <Server className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg md:text-xl font-bold text-gray-900">Konfigurasi APIGames</h2>
                                        <p className="text-xs md:text-sm text-gray-500">Provider alternatif.</p>
                                    </div>
                                </div>
                                <div className="bg-orange-50 px-4 py-3 rounded-xl flex items-center justify-between md:justify-start gap-4 border border-orange-100 w-full md:w-auto">
                                    <div className="flex items-center gap-3">
                                        <Wallet className="w-5 h-5 text-orange-600" />
                                        <div>
                                            <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider">Saldo Aktif</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {balance !== null ? `Rp ${balance.toLocaleString()}` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCheckBalance}
                                        type="button"
                                        disabled={checkingBalance || !apigamesMerchant}
                                        className="p-2 hover:bg-orange-100 rounded-full transition-colors"
                                    >
                                        <RefreshCcw className={`w-4 h-4 text-orange-600 ${checkingBalance ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-4 md:gap-6">
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Merchant ID</label>
                                    <input
                                        type="text"
                                        value={apigamesMerchant}
                                        onChange={e => setApigamesMerchant(e.target.value)}
                                        className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-orange-50 focus:border-orange-500 transition-all outline-none text-sm"
                                        placeholder="M..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Secret Key</label>
                                    <input
                                        type="text"
                                        value={apigamesSecret}
                                        onChange={e => setApigamesSecret(e.target.value)}
                                        className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-orange-50 focus:border-orange-500 transition-all outline-none font-mono text-sm"
                                        placeholder="secret_..."
                                    />
                                </div>
                            </div>

                            {/* Webhook URL Display */}
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-5 rounded-xl border border-orange-200">
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-orange-600" />
                                    Webhook URL
                                </label>
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/apigames` : '/api/webhooks/apigames'}
                                        className="flex-1 px-4 py-2.5 rounded-lg border border-orange-300 bg-white font-mono text-xs md:text-sm text-gray-700 cursor-text"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = `${window.location.origin}/api/webhooks/apigames`;
                                            navigator.clipboard.writeText(url);
                                            showToast('Webhook URL berhasil di-copy!', 'success');
                                        }}
                                        className="px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                                <p className="text-[10px] text-orange-700 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 block" />
                                    IP Whitelist: <code className="bg-orange-100 px-1.5 py-0.5 rounded">157.245.207.5</code>
                                </p>
                            </div>

                            <div className="pt-6 border-t border-gray-50 flex flex-col-reverse md:flex-row items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full md:w-auto bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSync('APIGAMES')}
                                    disabled={testing || !apigamesMerchant || !apigamesSecret}
                                    className="w-full md:w-auto ml-auto bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                                >
                                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                                    Sync APIGames
                                </button>
                            </div>

                            {/* CONNECTION CHECK START */}
                            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                    Status Koneksi Game
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 md:gap-3">
                                    {['higgs', 'smileone', 'kiosgamer', 'unipin', 'unipinbr', 'unipinmy'].map((engine) => (
                                        <button
                                            key={engine}
                                            type="button"
                                            onClick={() => handleCheckEngine(engine)}
                                            disabled={loadingEngine === engine || !apigamesMerchant}
                                            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-medium transition-all"
                                        >
                                            {loadingEngine === engine ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className={`w-2 h-2 rounded-full ${engineResult && engineResult.engine === engine.toUpperCase() ? (engineResult.success ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-400'}`} />}
                                            {engine.charAt(0).toUpperCase() + engine.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                {engineResult && (
                                    <div className={`mt-4 p-4 rounded-lg text-xs md:text-sm border ${engineResult.success ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                        <strong>{engineResult.engine}: </strong> {engineResult.message}
                                        {engineResult.data && (
                                            <pre className="mt-2 text-[10px] opacity-80 overflow-auto max-h-40 bg-white/50 p-2 rounded">
                                                {JSON.stringify(engineResult.data, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* DEPOSIT SECTION */}
                            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-dashed border-gray-300">
                                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-green-600" />
                                    Isi Saldo (Deposit)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                                    <div>
                                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Nominal Deposit (IDR)</label>
                                        <input
                                            type="number"
                                            value={depositNominal}
                                            onChange={e => setDepositNominal(e.target.value)}
                                            className="w-full px-4 md:px-5 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-green-50 focus:border-green-500 transition-all outline-none text-sm"
                                            placeholder="Contoh: 100000"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDeposit}
                                        disabled={isDepositing || !depositNominal}
                                        className="bg-green-600 text-white px-6 py-2.5 md:py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 h-[45px] md:h-[50px] w-full md:w-auto"
                                    >
                                        {isDepositing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                                        Request Tiket
                                    </button>
                                </div>

                                {depositResult && (
                                    <div className="mt-6 bg-white p-4 md:p-6 rounded-xl border border-green-200 shadow-sm animate-in fade-in zoom-in-95">
                                        <div className="flex items-center gap-3 mb-4 text-green-700">
                                            <CheckCircle className="w-6 h-6" />
                                            <div>
                                                <h4 className="font-bold text-base md:text-lg">Tiket Deposit Berhasil Dibuat!</h4>
                                                <p className="text-xs md:text-sm text-green-600">Transfer sesuai detail (WAJIB SAMA PERSIS):</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 text-xs md:text-sm">
                                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="text-gray-500">Total Transfer</span>
                                                <span className="font-mono font-bold text-lg text-blue-600 cursor-pointer" onClick={() => { navigator.clipboard.writeText(depositResult.total_transfer); showToast('Disalin!', 'success') }}>
                                                    Rp {depositResult.total_transfer?.toLocaleString()} 📋
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="text-gray-500">Rekening Tujuan</span>
                                                <span className="font-bold text-gray-900 text-right">{depositResult.rekening}</span>
                                            </div>
                                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="text-gray-500">Berlaku Hingga</span>
                                                <span className="font-bold text-red-500 text-right">{depositResult.expired}</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-center text-gray-400 mt-4">*Saldo akan masuk otomatis setalah transfer.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                                    <Server className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-gray-900">Pengaturan Global</h2>
                                    <p className="text-xs md:text-sm text-gray-500">Konfigurasi Sistem Topup.</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-200">
                                <p><strong>Info:</strong> Pengaturan Margin sekarang dikelola melalui menu <strong>Atur Margin</strong> pada halaman Produk.</p>
                            </div>

                            <div className="pt-6 border-t border-gray-50 flex flex-col-reverse md:flex-row items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full md:w-auto bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan Konfigurasi
                                </button>

                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing || !username || !key}
                                    className="w-full md:w-auto ml-auto bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                                    Tes Koneksi (Digiflazz)
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {testResult && (
                    <div className={`mx-4 md:mx-8 mb-4 md:mb-8 p-4 rounded-xl flex items-center gap-3 border ${testResult.success ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                        {testResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                        <span className="font-medium text-xs md:text-sm">{testResult.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
