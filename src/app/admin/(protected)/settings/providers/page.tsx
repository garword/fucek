'use client';

import { useState, useEffect } from 'react';
import { Save, Radio, CheckCircle, XCircle, AlertCircle, Globe, Key, ShieldCheck, Zap, Server, Percent, Wallet } from 'lucide-react';
import { toast } from 'sonner';

type ProviderTab = 'tokovoucher' | 'digiflazz' | 'apigames' | 'medanpedia';

export default function ProviderSettingsPage() {
    const [activeTab, setActiveTab] = useState<ProviderTab>('tokovoucher');

    // TokoVoucher State
    const [memberCode, setMemberCode] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [signatureDefault, setSignatureDefault] = useState('');
    const [baseUrl, setBaseUrl] = useState('https://api.tokovoucher.net/v1');
    const [isActive, setIsActive] = useState(false);

    // Digiflazz State
    const [digiflazzUsername, setDigiflazzUsername] = useState('');
    const [digiflazzApiKey, setDigiflazzApiKey] = useState('');
    const [digiflazzWebhookSecret, setDigiflazzWebhookSecret] = useState('');
    const [digiflazzActive, setDigiflazzActive] = useState(false);

    // APIGames State
    const [apigamesMerchantId, setApigamesMerchantId] = useState('');
    const [apigamesSecretKey, setApigamesSecretKey] = useState('');
    const [apigamesActive, setApigamesActive] = useState(false);

    // MedanPedia State
    const [medanpediaApiId, setMedanpediaApiId] = useState('');
    const [medanpediaApiKey, setMedanpediaApiKey] = useState('');
    const [medanpediaMargin, setMedanpediaMargin] = useState(10);
    const [medanpediaActive, setMedanpediaActive] = useState(false);

    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    // Provider Config Mapping
    const providerConfig = {
        tokovoucher: {
            name: 'TokoVoucher',
            color: 'emerald',
            icon: Zap,
            description: 'Provider Vouchers & Topup Games',
            gradient: 'from-emerald-500 to-teal-400'
        },
        digiflazz: {
            name: 'Digiflazz',
            color: 'blue',
            icon: Radio,
            description: 'Digital Products Aggregator',
            gradient: 'from-blue-500 to-cyan-400'
        },
        apigames: {
            name: 'APIGames',
            color: 'purple',
            icon: Server,
            description: 'Game Topup Gateway',
            gradient: 'from-purple-500 to-violet-400'
        },
        medanpedia: {
            name: 'MedanPedia',
            color: 'pink',
            icon: Globe,
            description: 'SMM Panel Integration',
            gradient: 'from-pink-500 to-rose-400'
        }
    };

    const currentProvider = providerConfig[activeTab];

    useEffect(() => {
        fetchConfig();
    }, [activeTab]);

    async function fetchConfig() {
        setTestResult(null);
        try {
            if (activeTab === 'tokovoucher') {
                const res = await fetch('/api/admin/settings/providers/tokovoucher');
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setMemberCode(data.config.slug || '');
                        setSecretKey(data.config.secretKey || '');
                        setSignatureDefault(data.config.signatureDefault || '');
                        setBaseUrl(data.config.baseUrl || 'https://api.tokovoucher.net/v1');
                        setIsActive(data.config.isActive || false);
                    }
                }
            } else if (activeTab === 'digiflazz') {
                const res = await fetch('/api/admin/settings/providers/digiflazz');
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setDigiflazzUsername(data.config.username || '');
                        setDigiflazzApiKey(data.config.apiKey || '');
                        setDigiflazzWebhookSecret(data.config.webhookSecret || '');
                        setDigiflazzActive(data.config.isActive || false);
                    }
                }
            } else if (activeTab === 'apigames') {
                const res = await fetch('/api/admin/settings/providers/apigames');
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setApigamesMerchantId(data.config.merchantId || '');
                        setApigamesSecretKey(data.config.secretKey || '');
                        setApigamesActive(data.config.isActive || false);
                    }
                }
            } else if (activeTab === 'medanpedia') {
                const res = await fetch('/api/admin/settings/providers/medanpedia');
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setMedanpediaApiId(data.config.apiId || '');
                        setMedanpediaApiKey(data.config.apiKey || '');

                        // FIX: Allow 0 as valid margin
                        const margin = Number(data.config.marginPercent);
                        setMedanpediaMargin(isNaN(margin) ? 10 : margin);

                        setMedanpediaActive(data.config.isActive || false);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    }

    async function handleSave() {
        setLoading(true);
        try {
            let endpoint = '';
            let body = {};

            if (activeTab === 'tokovoucher') {
                endpoint = '/api/admin/settings/providers/tokovoucher';
                body = { memberCode, secretKey, signatureDefault, baseUrl, isActive };
            } else if (activeTab === 'digiflazz') {
                endpoint = '/api/admin/settings/providers/digiflazz';
                body = {
                    username: digiflazzUsername,
                    apiKey: digiflazzApiKey,
                    webhookSecret: digiflazzWebhookSecret,
                    isActive: digiflazzActive
                };
            } else if (activeTab === 'apigames') {
                endpoint = '/api/admin/settings/providers/apigames';
                body = { merchantId: apigamesMerchantId, secretKey: apigamesSecretKey, isActive: apigamesActive };
            } else if (activeTab === 'medanpedia') {
                endpoint = '/api/admin/settings/providers/medanpedia';
                body = {
                    apiId: medanpediaApiId,
                    apiKey: medanpediaApiKey,
                    marginPercent: medanpediaMargin,
                    isActive: medanpediaActive
                };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success(`Konfigurasi ${currentProvider.name} berhasil disimpan`);
            } else {
                toast.error(data.error || 'Gagal menyimpan konfigurasi');
            }
        } catch (error) {
            toast.error('Network error');
        }
        setLoading(false);
    }

    async function handleTest() {
        setLoading(true);
        setTestResult(null);

        try {
            const endpoint = `/api/admin/settings/providers/${activeTab}/test`;
            let body = {};

            if (activeTab === 'tokovoucher') {
                body = { memberCode, secretKey, signatureDefault, baseUrl };
            } else if (activeTab === 'digiflazz') {
                body = { username: digiflazzUsername, apiKey: digiflazzApiKey };
            } else if (activeTab === 'apigames') {
                body = { merchantId: apigamesMerchantId, secretKey: apigamesSecretKey };
            } else if (activeTab === 'medanpedia') {
                body = { apiId: medanpediaApiId, apiKey: medanpediaApiKey };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            setTestResult(data);

            if (data.success) {
                toast.success('Koneksi berhasil terhubung!');
            } else {
                toast.error(data.error || 'Koneksi gagal');
            }
        } catch (error) {
            console.error('[Test Connection] Error:', error);
            setTestResult({ error: 'Network error: ' + (error as Error).message });
            toast.error('Network error');
        }
        setLoading(false);
    }

    const getCurrentActive = () => {
        if (activeTab === 'tokovoucher') return isActive;
        if (activeTab === 'digiflazz') return digiflazzActive;
        if (activeTab === 'apigames') return apigamesActive;
        if (activeTab === 'medanpedia') return medanpediaActive;
        return false;
    };

    const setCurrentActive = (value: boolean) => {
        if (activeTab === 'tokovoucher') setIsActive(value);
        if (activeTab === 'digiflazz') setDigiflazzActive(value);
        if (activeTab === 'apigames') setApigamesActive(value);
        if (activeTab === 'medanpedia') setMedanpediaActive(value);
    };

    // Style helpers based on active tab
    const getRingColor = () => {
        if (activeTab === 'tokovoucher') return 'focus:ring-emerald-500/50 focus:border-emerald-500';
        if (activeTab === 'digiflazz') return 'focus:ring-blue-500/50 focus:border-blue-500';
        if (activeTab === 'apigames') return 'focus:ring-purple-500/50 focus:border-purple-500';
        if (activeTab === 'medanpedia') return 'focus:ring-pink-500/50 focus:border-pink-500';
        return 'focus:ring-gray-500/50';
    };

    const getToggleColor = () => {
        if (activeTab === 'tokovoucher') return 'peer-checked:bg-emerald-500';
        if (activeTab === 'digiflazz') return 'peer-checked:bg-blue-500';
        if (activeTab === 'apigames') return 'peer-checked:bg-purple-500';
        if (activeTab === 'medanpedia') return 'peer-checked:bg-pink-500';
        return 'peer-checked:bg-gray-500';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Provider Configuration</h1>
                    <p className="text-gray-500 mt-1">Kelola koneksi API ke penyedia layanan (H2H).</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 w-fit ${getCurrentActive()
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${getCurrentActive() ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {getCurrentActive() ? 'MODULE ACTIVE' : 'MODULE INACTIVE'}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-2xl overflow-x-auto">
                {(Object.keys(providerConfig) as ProviderTab[]).map((tab) => {
                    const config = providerConfig[tab];
                    const isActiveTab = activeTab === tab;
                    const Icon = config.icon;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex flex-1 items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap
                                ${isActiveTab
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            <Icon size={18} className={isActiveTab ? `text-${config.color}-500` : ''} />
                            {config.name}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Configuration Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden relative">
                        {/* Decorative Header Bar */}
                        <div className={`h-2 w-full bg-gradient-to-r ${currentProvider.gradient}`} />

                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`p-4 rounded-2xl bg-${currentProvider.color}-50 text-${currentProvider.color}-600`}>
                                    <currentProvider.icon size={32} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{currentProvider.name} Settings</h2>
                                    <p className="text-sm text-gray-500">{currentProvider.description}</p>
                                </div>
                            </div>

                            {activeTab === 'tokovoucher' && (
                                <>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Member Code</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    value={memberCode}
                                                    onChange={(e) => setMemberCode(e.target.value)}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                                    placeholder="Contoh: M230101"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Secret Key</label>
                                            <div className="relative">
                                                <ShieldCheck className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="password"
                                                    value={secretKey}
                                                    onChange={(e) => setSecretKey(e.target.value)}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                                    placeholder="••••••••••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Signature Default</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="password"
                                                    value={signatureDefault}
                                                    onChange={(e) => setSignatureDefault(e.target.value)}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                                    placeholder="••••••••••••••••"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1.5 ml-1">Digunakan untuk autentikasi cek saldo & status.</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'digiflazz' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Username</label>
                                        <input
                                            type="text"
                                            value={digiflazzUsername}
                                            onChange={(e) => setDigiflazzUsername(e.target.value)}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                            placeholder="username123"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">API Key (Production)</label>
                                        <input
                                            type="password"
                                            value={digiflazzApiKey}
                                            onChange={(e) => setDigiflazzApiKey(e.target.value)}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                            placeholder="••••••••••••••••"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Webhook Secret</label>
                                        <input
                                            type="password"
                                            value={digiflazzWebhookSecret}
                                            onChange={(e) => setDigiflazzWebhookSecret(e.target.value)}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                            placeholder="secret_wh_..."
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'apigames' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Merchant ID</label>
                                        <input
                                            type="text"
                                            value={apigamesMerchantId}
                                            onChange={(e) => setApigamesMerchantId(e.target.value)}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                            placeholder="M-12345"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Secret Key</label>
                                        <input
                                            type="password"
                                            value={apigamesSecretKey}
                                            onChange={(e) => setApigamesSecretKey(e.target.value)}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                            placeholder="••••••••••••••••"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'medanpedia' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">API ID</label>
                                            <input
                                                type="text"
                                                value={medanpediaApiId}
                                                onChange={(e) => setMedanpediaApiId(e.target.value)}
                                                className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                                placeholder="12345"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Margin Profit (%)</label>
                                            <div className="relative">
                                                <Percent className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    value={medanpediaMargin}
                                                    onChange={(e) => setMedanpediaMargin(Number(e.target.value))}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-bold text-sm text-gray-800 ${getRingColor()}`}
                                                    placeholder="10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">API Key</label>
                                        <input
                                            type="password"
                                            value={medanpediaApiKey}
                                            onChange={(e) => setMedanpediaApiKey(e.target.value)}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition-all font-mono text-sm text-gray-800 ${getRingColor()}`}
                                            placeholder="••••••••••••••••"
                                        />
                                    </div>

                                    <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 flex gap-3">
                                        <div className="p-2 bg-pink-100 rounded-full h-fit text-pink-500"><Zap size={16} /></div>
                                        <div>
                                            <h4 className="font-bold text-pink-700 text-sm">SMM Integration</h4>
                                            <p className="text-xs text-pink-600 mt-0.5">Produk dari MedanPedia otomatis masuk kategori SOSMED. Margin di atas akan diterapkan otomatis ke Base Price.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                <label className="relative inline-flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={getCurrentActive()}
                                        onChange={(e) => setCurrentActive(e.target.checked)}
                                    />
                                    <div className={`w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer 
                                        peer-checked:after:translate-x-full peer-checked:after:border-white 
                                        after:content-[''] after:absolute after:top-[4px] after:left-[4px] 
                                        after:bg-white after:border-gray-300 after:border after:rounded-full 
                                        after:h-6 after:w-6 after:transition-all 
                                        ${getToggleColor()}
                                        transition-colors duration-300 ease-in-out`}></div>
                                    <span className="ml-3 text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
                                        Active Status
                                    </span>
                                </label>

                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95
                                        bg-gradient-to-r ${currentProvider.gradient} hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Info & Status */}
                <div className="space-y-6">
                    {/* Connection Status Card */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Server size={20} className="text-gray-400" />
                            Connection Check
                        </h3>

                        <div className="space-y-4">
                            <button
                                onClick={handleTest}
                                disabled={loading}
                                className="w-full py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap size={18} />
                                Test Connection
                            </button>

                            {testResult && (
                                <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {testResult.success ? (
                                            <CheckCircle className="text-green-500 shrink-0" size={20} />
                                        ) : (
                                            <XCircle className="text-red-500 shrink-0" size={20} />
                                        )}
                                        <div>
                                            <p className={`font-bold text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                                {testResult.success ? 'Connected Successfully' : 'Connection Failed'}
                                            </p>

                                            {testResult.success && (
                                                <div className="mt-2 space-y-1">
                                                    {testResult.balance !== undefined && (
                                                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100/50 px-2 py-1 rounded-lg w-fit">
                                                            <Wallet size={14} />
                                                            <span className="font-mono font-bold">Rp {testResult.balance.toLocaleString('id-ID')}</span>
                                                        </div>
                                                    )}
                                                    {testResult.memberName && (
                                                        <p className="text-xs text-green-600">Member: {testResult.memberName}</p>
                                                    )}
                                                </div>
                                            )}

                                            {!testResult.success && (
                                                <p className="text-xs text-red-600 mt-1">{testResult.error || testResult.msg || 'Unknown error occurred'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-blue-50/50 rounded-3xl border border-blue-100 p-6 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-100 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Integration Info
                            </h3>

                            <div className="space-y-3 text-sm text-blue-700/80 leading-relaxed">
                                {activeTab === 'tokovoucher' && (
                                    <>
                                        <p>Pastikan IP Address server Anda sudah di-whitelist di dashboard TokoVoucher.</p>
                                        <div className="bg-white/80 p-2 rounded-lg border border-blue-200 font-mono text-xs text-blue-900 break-all">
                                            Webhook: /api/webhooks/tokovoucher
                                        </div>
                                    </>
                                )}
                                {activeTab === 'digiflazz' && (
                                    <>
                                        <p>Digiflazz menggunakan sistem Webhook untuk update status transaksi secara real-time.</p>
                                        <div className="bg-white/80 p-2 rounded-lg border border-blue-200 font-mono text-xs text-blue-900 break-all">
                                            Webhook: /api/webhooks/digiflazz
                                        </div>
                                    </>
                                )}
                                {activeTab === 'apigames' && (
                                    <>
                                        <p>APIGames membutuhkan Callback URL yang valid untuk notifikasi status topup.</p>
                                        <div className="bg-white/80 p-2 rounded-lg border border-blue-200 font-mono text-xs text-blue-900 break-all">
                                            Callback: /api/webhooks/apigames
                                        </div>
                                    </>
                                )}
                                {activeTab === 'medanpedia' && (
                                    <p>
                                        Saldo akun MedanPedia Anda akan terpotong otomatis saat ada pesanan masuk. Pastikan saldo mencukupi.
                                        Status pesanan akan dicek berkala oleh sistem (Schedular/Cron).
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
