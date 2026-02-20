'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Calculator, Settings, AlertTriangle, Key, Copy, Terminal } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function PaymentGatewaySettings() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Config State
    const [slug, setSlug] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [mode, setMode] = useState('SANDBOX'); // SANDBOX | PRODUCTION
    const [feePercentage, setFeePercentage] = useState(0);
    const [feeFixed, setFeeFixed] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [walletIconUrl, setWalletIconUrl] = useState('');

    // Simulation State
    const [testAmount, setTestAmount] = useState(100000);
    const [simOrderCode, setSimOrderCode] = useState(''); // For simulation
    const [simulating, setSimulating] = useState(false);

    // Webhook URL
    const [webhookUrl, setWebhookUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWebhookUrl(`${window.location.origin}/api/webhooks/pakasir`);
        }

        fetch('/api/admin/settings/payment-gateway')
            .then(res => res.json())
            .then(data => {
                if (data.name || data.walletIconUrl !== undefined) {
                    setSlug(data.slug || '');
                    setApiKey(data.apiKey || '');
                    setMode(data.mode || 'SANDBOX');
                    setFeePercentage(data.feePercentage || 0);
                    setFeeFixed(Number(data.feeFixed || 0));
                    setIsActive(data.isActive || false);
                    setWalletIconUrl(data.walletIconUrl || '');
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings/payment-gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug,
                    apiKey,
                    mode,
                    feePercentage,
                    feeFixed,
                    isActive,
                    walletIconUrl
                })
            });

            if (res.ok) {
                showToast('Settings saved!', 'success');
            } else {
                showToast('Failed to save settings', 'error');
            }
        } catch (error) {
            showToast('Error saving settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSimulatePayment = async () => {
        if (!simOrderCode) {
            showToast('Enter Invoice Code first', 'error');
            return;
        }

        setSimulating(true);
        try {
            const res = await fetch('/api/admin/settings/payment-gateway/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceCode: simOrderCode
                })
            });

            const data = await res.json();

            if (res.ok) {
                showToast('Simulation request sent! Check Order Status.', 'success');
                console.log(data);
            } else {
                showToast(data.error || 'Simulation failed', 'error');
            }
        } catch (e) {
            showToast('Simulation error', 'error');
        } finally {
            setSimulating(false);
        }
    };

    const copyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        showToast('Webhook URL copied!', 'success');
    };

    // Calculate simulated fee
    const simFee = (testAmount * feePercentage / 100) + Number(feeFixed);
    const simTotal = testAmount + simFee;

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                <Settings className="w-8 h-8 text-indigo-600" />
                Pakasir Configuration
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Settings Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6 relative overflow-hidden">
                        {mode === 'SANDBOX' && (
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Terminal className="w-32 h-32" />
                            </div>
                        )}

                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 relative z-10">
                            <h2 className="text-lg font-bold text-gray-900">General Settings</h2>
                            <div className={`p-1 rounded-full flex gap-1 bg-gray-100`}>
                                <button
                                    type="button"
                                    onClick={() => setMode('SANDBOX')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${mode === 'SANDBOX' ? 'bg-yellow-400 text-yellow-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Terminal className="w-3 h-3" />
                                    SANDBOX
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('PRODUCTION')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${mode === 'PRODUCTION' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Key className="w-3 h-3" />
                                    PRODUCTION
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Project Slug</label>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={e => setSlug(e.target.value)}
                                        placeholder="myshop123"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-gray-400" /> API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="pk_..."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Fee Configuration</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Percentage (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={feePercentage}
                                            onChange={e => setFeePercentage(parseFloat(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Fixed (Rp)</label>
                                        <input
                                            type="number"
                                            value={feeFixed}
                                            onChange={e => setFeeFixed(Number(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <div className="w-5 h-5 flex items-center justify-center bg-yellow-100 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                </div>
                                Wallet Topup Icon URL
                            </label>
                            <input
                                type="text"
                                value={walletIconUrl}
                                onChange={e => setWalletIconUrl(e.target.value)}
                                placeholder="https://example.com/icon.png"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm mb-1"
                            />
                            <p className="text-[10px] text-gray-400 pl-1">
                                Leave empty to use default lightning icon.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsActive(!isActive)}>
                                <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-gray-900">Enable Payment Gateway</span>
                                    <span className="text-xs text-gray-500">Activates QRIS payment method</span>
                                </div>
                            </div>
                        </div>

                        {/* Webhook URL Display */}
                        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-indigo-800 uppercase tracking-wider">Webhook URL (For Pakasir Dashboard)</label>
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">POST</span>
                            </div>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-indigo-200 text-xs font-mono text-indigo-600 break-all shadow-sm">
                                    {webhookUrl}
                                </code>
                                <button type="button" onClick={copyWebhook} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md shadow-indigo-200 transition-all">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            {mode === 'SANDBOX' && (
                                <div className="mt-3 flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p className="text-[11px] leading-relaxed">
                                        <strong>Localhost Warning:</strong> Pakasir cannot send webhooks to <code>localhost</code>.
                                        Please use <strong>Ngrok</strong> or similar to funnel traffic, or use the <strong>Payment Simulation</strong> tool on the right to test locally.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100 relative z-10">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar: Simulation & Tools */}
                <div className="space-y-6">
                    {/* Fee Calculator */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-gray-400" />
                            Fee Simulation
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1 block">Test Amount (Rp)</label>
                                <input
                                    type="number"
                                    value={testAmount}
                                    onChange={e => setTestAmount(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Fee ({feePercentage}%)</span>
                                    <span>+ Rp {(testAmount * feePercentage / 100).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Fixed</span>
                                    <span>+ Rp {Number(feeFixed).toLocaleString()}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                                    <span>User Pays</span>
                                    <span>Rp {simTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sandbox Actions */}
                    {mode === 'SANDBOX' && (
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-sm border border-emerald-100 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Terminal className="w-16 h-16 text-emerald-600" />
                            </div>

                            <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2 relative z-10">
                                <Terminal className="w-5 h-5 text-emerald-600" />
                                Payment Simulation
                            </h3>

                            <div className="space-y-4 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Trigger Webhook (Paid)</label>
                                    <input
                                        type="text"
                                        placeholder="Invoice (INV-...) or Deposit (DEPOSIT-...)"
                                        value={simOrderCode}
                                        onChange={e => setSimOrderCode(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm focus:ring-2 focus:ring-emerald-400 outline-none bg-white/80 backdrop-blur-sm font-mono"
                                    />
                                    <button
                                        onClick={handleSimulatePayment}
                                        disabled={simulating}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-emerald-400/30 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={simulating ? 'Processing...' : 'Simulate Payment'}
                                    >
                                        {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simulate Payment'}
                                    </button>
                                    <p className="text-[10px] text-emerald-700 leading-tight bg-emerald-100/50 p-2 rounded-lg mt-2 border border-emerald-100">
                                        This calls <code>Pakasir Simulation API</code> which triggers a real webhook to your configured URL.
                                        Supports both <strong>Orders</strong> and <strong>Deposits</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
