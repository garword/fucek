'use client';

import { useState } from 'react';
import { User as UserIcon, Mail, Shield, Award, FileText, Wallet, Lock, Activity } from 'lucide-react';
import OrderHistoryList from './OrderHistoryList';
import DepositHistoryList from './DepositHistoryList';
import ChangePasswordForm from '../auth/ChangePasswordForm';
import LogoutButton from '../auth/LogoutButton';

interface AccountDashboardProps {
    user: any;
    tier: any;
    orders: any[];
    deposits: any[];
}

export default function AccountDashboard({ user, tier, orders, deposits }: AccountDashboardProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'transactions' | 'deposits' | 'security'>('profile');

    // Tier Badge Color
    const getTierColor = (tierName: string) => {
        switch (tierName.toLowerCase()) {
            case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'silver': return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'platinum': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
            case 'diamond': return 'bg-purple-100 text-purple-800 border-purple-300';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const navItems = [
        { id: 'profile', label: 'Profil Saya', icon: UserIcon },
        { id: 'transactions', label: 'Riwayat Pesanan', icon: FileText },
        { id: 'deposits', label: 'Riwayat Deposit', icon: Wallet },
        { id: 'smm', label: 'Layanan Sosmed', icon: Activity, href: '/account/smm' },
        { id: 'security', label: 'Keamanan Akun', icon: Lock },
    ];

    // Tier Logic
    const TIER_LEVELS = [
        { name: 'Bronze', minTrx: 0 },
        { name: 'Silver', minTrx: 2 },
        { name: 'Gold', minTrx: 10 },
        { name: 'Platinum', minTrx: 50 },
        { name: 'Diamond', minTrx: 100 },
    ];

    const currentTrx = tier?.trxCount || 0;
    const currentTierIndex = TIER_LEVELS.findIndex(t => t.name === (tier?.name || 'Bronze'));
    const nextTier = TIER_LEVELS[currentTierIndex + 1];
    const remainingTrx = nextTier ? nextTier.minTrx - currentTrx : 0;
    const progressPercent = nextTier ? Math.min((currentTrx / nextTier.minTrx) * 100, 100) : 100;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* ... Header ... */}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 lg:p-4 sticky top-24">
                        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                            {navItems.map((item: any) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;

                                if (item.href) {
                                    return (
                                        <a
                                            key={item.id}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal text-gray-600 hover:bg-gray-50 hover:text-green-600`}
                                        >
                                            <Icon size={20} className="text-gray-400" />
                                            {item.label}
                                        </a>
                                    );
                                }

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as any)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal
                                            ${isActive
                                                ? 'bg-green-50 text-green-700 shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-green-600'
                                            }
                                        `}
                                    >
                                        <Icon size={20} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                                        {item.label}
                                        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 hidden lg:block"></div>}
                                    </button>
                                );
                            })}

                            <div className="h-px bg-gray-100 my-2 hidden lg:block"></div>

                            <div className="hidden lg:block">
                                <LogoutButton />
                            </div>
                        </nav>
                    </div>

                    {/* Mobile Balance Button */}
                    <div className="lg:hidden">
                        <button onClick={() => window.location.href = '/wallet/deposit'} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                            <Wallet size={18} /> Isi Saldo (Rp {Number(user.balance).toLocaleString('id-ID')})
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 min-h-[500px]">
                    {activeTab === 'profile' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            {/* Profile Header Card */}
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                                <div className="h-32 bg-gradient-to-r from-emerald-500 to-green-400 relative">
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                                </div>
                                <div className="px-6 pb-6 relative">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 gap-6 mb-6">
                                        <div className="w-32 h-32 rounded-full bg-white p-1.5 shadow-xl relative z-10">
                                            <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-5xl font-black text-emerald-600 overflow-hidden border-4 border-white shadow-inner">
                                                {user?.image ? (
                                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    (user.username?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()
                                                )}
                                            </div>
                                            <div className="absolute bottom-2 right-2 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center shadow-md">
                                                <Shield size={14} className="text-white fill-current" />
                                            </div>
                                        </div>

                                        <div className="text-center sm:text-left flex-1 mb-2">
                                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2 sm:mb-1">{user.name}</h2>
                                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                                                <p className="text-gray-500 font-medium text-lg">@{user.username}</p>
                                                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider shadow-sm flex items-center gap-1 ${getTierColor(tier?.name || 'Bronze')}`}>
                                                    <Award size={12} className="stroke-[3px]" />
                                                    {tier?.name || 'Bronze'} Member
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 group hover:border-green-200 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm group-hover:text-green-500 transition-colors">
                                                <Mail size={20} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Email Address</p>
                                                <p className="font-semibold text-gray-700 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 group hover:border-green-200 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm group-hover:text-green-500 transition-colors">
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Member Since</p>
                                                <p className="font-semibold text-gray-700">{new Date(user.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tier Info Card */}
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                                            <Award className="text-yellow-400" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Status Keanggotaan</h3>
                                            <p className="text-slate-400 text-sm">Level Anda saat ini berdasarkan jumlah transaksi berhasil</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">CURRENT TIER</p>
                                                <h4 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                                                    {tier?.name || 'BRONZE'}
                                                </h4>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">COMPLETE TRX</p>
                                                <p className="text-xl font-bold font-mono">
                                                    {currentTrx} <span className="text-sm text-slate-500 font-normal">Trx</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-3 relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 relative z-10"
                                                style={{ width: `${progressPercent}%` }}
                                            ></div>
                                            {/* Striped Pattern Overlay */}
                                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] opacity-30 z-20"></div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-mono text-slate-500">
                                                {currentTrx} / {nextTier ? nextTier.minTrx : 'MAX'}
                                            </span>
                                            {nextTier ? (
                                                <p className="text-slate-300">
                                                    Kurang <span className="text-yellow-400 font-bold">{remainingTrx}</span> transaksi lagi untuk ke <span className="font-bold">{nextTier.name}</span>
                                                </p>
                                            ) : (
                                                <p className="text-yellow-400 font-bold">
                                                    Anda telah mencapai level tertinggi! 👑
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <OrderHistoryList orders={orders} />
                        </div>
                    )}

                    {activeTab === 'deposits' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DepositHistoryList deposits={deposits} />
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Shield className="text-green-600" />
                                    Keamanan Akun
                                </h2>
                                <p className="text-gray-500 mb-8 text-sm">
                                    Amankan akun Anda dengan mengganti kata sandi secara berkala. Gunakan kombinasi huruf, angka, dan simbol.
                                </p>
                                <div className="max-w-xl">
                                    <ChangePasswordForm />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Logout (Separate) */}
            <div className="lg:hidden pb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-2">
                    <LogoutButton />
                </div>
            </div>
        </div>
    );
}
