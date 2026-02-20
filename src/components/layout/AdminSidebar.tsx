'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard, ShoppingCart, Activity, Gamepad2, CreditCard,
    Smartphone, Share2, Settings, LogOut, Menu, X, ChevronDown, ChevronRight, Image as ImageIcon, LayoutTemplate, FileText, UserCog, Tag
} from 'lucide-react';
import { useState } from 'react';


interface AdminSidebarProps {
    user: {
        name?: string | null;
        email?: string | null;
        role?: string;
    };
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentType = searchParams.get('type');
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(['topup-game']);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);

    const SidebarContent = () => (
        <>
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                        <LayoutDashboard size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                        <p className="text-xs text-gray-500">Business Solutions</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto space-y-1">
                {/* UTAMA Section */}
                <div className="mb-6">
                    <Link
                        href="/admin"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm ${pathname === '/admin'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        href="/admin/orders"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm ${pathname?.startsWith('/admin/orders')
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <ShoppingCart size={18} />
                        <span>Orders</span>
                    </Link>

                    <Link
                        href="/admin/logs"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm ${pathname?.startsWith('/admin/logs')
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <Activity size={18} />
                        <span>Activity</span>
                    </Link>
                </div>

                {/* KATALOG PRODUK Section */}
                <div className="mb-6">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">MANAGEMENT</p>

                    {/* Topup Game - Collapsible */}
                    <div className="mb-1">
                        <button
                            onClick={() => toggleSection('topup-game')}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Gamepad2 size={18} />
                                <span className={expandedSections.includes('topup-game') ? 'text-gray-900' : ''}>Game Topup</span>
                            </div>
                            {expandedSections.includes('topup-game') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {expandedSections.includes('topup-game') && (
                            <div className="ml-4 pl-4 border-l border-gray-200 mt-1 space-y-1">
                                <Link
                                    href="/admin/products?type=GAME"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Products List
                                </Link>
                                <Link
                                    href="/admin/categories?type=GAME"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Kelola Kategori
                                </Link>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-3 pt-2 pb-1">Import</p>
                                <Link
                                    href="/admin/topup/products/digiflazz"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Digiflazz
                                </Link>
                                <Link
                                    href="/admin/topup/products/tokovoucher"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    TokoVoucher
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Produk Digital - Collapsible */}
                    <div className="mb-1">
                        <button
                            onClick={() => toggleSection('digital-products')}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard size={18} />
                                <span className={expandedSections.includes('digital-products') ? 'text-gray-900' : ''}>Digital Products</span>
                            </div>
                            {expandedSections.includes('digital-products') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {expandedSections.includes('digital-products') && (
                            <div className="ml-4 pl-4 border-l border-gray-200 mt-1 space-y-1">
                                <Link
                                    href="/admin/products?type=DIGITAL"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Products List
                                </Link>
                                <Link
                                    href="/admin/categories?type=DIGITAL"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Kelola Kategori
                                </Link>
                                <Link
                                    href="/admin/stocks"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Stock Management
                                </Link>

                            </div>
                        )}
                    </div>

                    {/* All Variants Link */}
                    <Link
                        href="/admin/variants"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm mt-1 ${pathname === '/admin/variants'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <Tag size={18} />
                        <span>Variants</span>
                    </Link>

                    {/* Pulsa & Data - Collapsible */}
                    <div className="mb-1">
                        <button
                            onClick={() => toggleSection('pulsa-data')}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Smartphone size={18} />
                                <span className={expandedSections.includes('pulsa-data') ? 'text-gray-900' : ''}>Pulsa & Data</span>
                            </div>
                            {expandedSections.includes('pulsa-data') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {expandedSections.includes('pulsa-data') && (
                            <div className="ml-4 pl-4 border-l border-gray-200 mt-1 space-y-1">
                                <Link
                                    href="/admin/products?type=PULSA"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Products List
                                </Link>
                                <Link
                                    href="/admin/categories?type=PULSA"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Kelola Kategori
                                </Link>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-3 pt-2 pb-1">Import</p>
                                <Link
                                    href="/admin/pulsa/products/digiflazz"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Digiflazz
                                </Link>
                                <Link
                                    href="/admin/pulsa/products/tokovoucher"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    TokoVoucher
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Sosial Media */}
                    <Link
                        href="/admin/products?type=SOSMED"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm mt-1 ${pathname === '/admin/products' && currentType === 'SOSMED'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <Share2 size={18} />
                        <span>Social Media</span>
                    </Link>
                </div>

                {/* DESAIN Section */}
                <div className="mb-6">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">APPEARANCE</p>

                    <Link
                        href="/admin/design/banners"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm ${pathname === '/admin/design/banners'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <ImageIcon size={18} />
                        <span>Banners</span>
                    </Link>

                    <Link
                        href="/admin/design/identity"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm ${pathname === '/admin/design/identity'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <Settings size={18} />
                        <span>Site Identity</span>
                    </Link>

                    <Link
                        href="/admin/design/footer"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive('/admin/design/footer')
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <LayoutTemplate size={18} />
                        <span className="text-sm">Footer</span>
                    </Link>

                    <Link
                        href="/admin/content/pages"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive('/admin/content/pages')
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <FileText size={18} />
                        <span className="text-sm">Pages</span>
                    </Link>
                </div>

                {/* ADMINISTRATOR Section */}
                <div className="mb-6">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">SYSTEM</p>

                    <Link
                        href="/admin/settings/account"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group mb-1 ${isActive('/admin/settings/account')
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <UserCog size={18} />
                        <span className="text-sm">Administrator</span>
                    </Link>

                    {/* Settings - Collapsible */}
                    <div className="mb-1">
                        <button
                            onClick={() => toggleSection('settings')}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Settings size={18} />
                                <span className={expandedSections.includes('settings') ? 'text-gray-900' : ''}>Settings</span>
                            </div>
                            {expandedSections.includes('settings') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {expandedSections.includes('settings') && (
                            <div className="ml-9 mt-1 space-y-1 relative before:absolute before:left-[-14px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-700/50">
                                <Link
                                    href="/admin/settings"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    AI Config
                                </Link>
                                <Link
                                    href="/admin/settings/services"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Layanan & Maintenance
                                </Link>
                                <Link
                                    href="/admin/settings/cs"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Setting CS
                                </Link>
                                <Link
                                    href="/admin/settings/payment-gateway"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Payment Gateway
                                </Link>
                                <Link
                                    href="/admin/settings/tiers"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Tier & Level
                                </Link>
                                <Link
                                    href="/admin/settings/providers"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Providers
                                </Link>
                                <Link
                                    href="/admin/system"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                    Endpoints
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                    {/* Dynamic Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 group-hover:border-emerald-500 transition-colors">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Admin'}`}
                            alt={user?.name || 'Admin'}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-700 truncate group-hover:text-gray-900">{user?.name || 'Admin'}</p>
                        <p className="text-xs text-gray-400 truncate group-hover:text-emerald-500">{user?.role || 'ADMIN'}</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/admin/logout'}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Menu Button - suppressHydrationWarning to prevent mismatch */}
            <div
                suppressHydrationWarning={true}
                className="md:hidden fixed top-0 left-0 right-0 bg-white px-4 py-3 flex items-center justify-between z-40 shadow-sm border-b border-gray-200"
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200">
                        <span className="text-white font-bold">A</span>
                    </div>
                    <h1 className="font-bold text-gray-800">ADMIN</h1>
                </div>
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                >
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40 mt-[52px]"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                suppressHydrationWarning={true}
                className={`
                fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50
                transition-transform duration-300 md:translate-x-0 overflow-hidden
                ${isMobileOpen ? 'translate-x-0 mt-[52px] h-[calc(100vh-52px)]' : '-translate-x-full'}
            `}>
                <SidebarContent />
            </aside>
        </>
    );
}
