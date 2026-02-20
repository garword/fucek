'use client';

import { Search, Bell, HelpCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminHeader() {
    const pathname = usePathname();

    const getPageTitle = () => {
        if (pathname === '/admin') return 'Overview';
        const parts = pathname?.split('/').filter(Boolean) || [];
        if (parts.length > 1) {
            return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1).replace(/-/g, ' ');
        }
        return 'Overview';
    };

    return (
        <header className="bg-white/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-30">
            {/* Left: Page Title */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">{getPageTitle()}</h2>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 md:gap-6">
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Global search..."
                        className="bg-gray-100 border-transparent rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 w-64 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-gray-500 outline-none transition-all"
                    />
                </div>

                {/* Icons */}
                <div className="flex items-center gap-2 md:gap-4">
                    <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100 rounded-lg">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100 rounded-lg">
                        <HelpCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
