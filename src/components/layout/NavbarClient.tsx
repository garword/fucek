'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, User, Heart, FileText } from 'lucide-react';
import LogoutButton from '../features/auth/LogoutButton';
import SearchBar from '../ui/SearchBar';

export default function NavbarClient({ session, cartCount, wishlistCount, userBalance = 0, identity }: { session: any, cartCount: number, wishlistCount: number, userBalance?: number, identity?: any }) {
    const pathname = usePathname();
    const router = useRouter();

    // Default to strict defaults if identity prop missing (failsafe)
    const brand = identity || { mode: 'text', text: 'STORE', subText: '.', imageUrl: '' };

    // Hide on admin pages and auth pages
    const hiddenPaths = ['/admin', '/login', '/register', '/verify-otp', '/forgot-password'];
    if (hiddenPaths.some(path => pathname?.startsWith(path))) {
        return null;
    }

    return (
        <nav className="bg-white dark:bg-slate-900 lg:bg-white/95 lg:dark:bg-slate-900/95 lg:backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-white/10 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 gap-4 sm:gap-8">
                    {/* Logo - Smart Auto-Fit */}
                    <Link href="/" className="flex-shrink-0 flex items-center max-w-[60%] md:max-w-none">
                        {brand.mode === 'image' && brand.imageUrl ? (
                            <Image
                                src={brand.imageUrl}
                                alt={brand.imageAlt || "Logo"}
                                width={200}
                                height={80}
                                className="
                                    h-8 sm:h-9 md:h-10 lg:h-11
                                    w-auto 
                                    object-contain
                                "
                                priority
                            />
                        ) : (
                            <span className="font-bold text-lg md:text-2xl text-green-600 dark:text-green-500 tracking-tight truncate">
                                {brand.text || "STORE"}<span className="text-secondary-500 text-gray-800 dark:text-white">{brand.subText}</span>
                            </span>
                        )}
                    </Link>

                    {/* Kategori (Optional, plain text for now) */}
                    <Link href="/track" className="hidden lg:block text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-green-600 dark:hover:text-green-400 cursor-pointer transition-colors">
                        Cek Pesanan
                    </Link>

                    {/* Search Bar - Hidden on mobile initially or handled nicely */}
                    <div className="hidden md:block flex-1 max-w-2xl px-2">
                        <SearchBar />
                    </div>

                    {/* Mobile Search Icon? Or Actions */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {/* Track Order Mobile Icon */}
                        <Link href="/track" className="lg:hidden text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 p-2 transition-colors">
                            <FileText className="h-6 w-6" />
                        </Link>

                        {/* Cart */}
                        <Link href="/cart" className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500 p-2 relative transition-colors group">
                            <ShoppingCart className="h-6 w-6 transition-colors" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm border-2 border-white dark:border-slate-900">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>

                        <div className="h-6 w-[1px] bg-gray-200 hidden sm:block"></div>

                        {session ? (
                            <>
                                {/* Wallet Balance */}
                                <Link href="/wallet/deposit" className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-bold hover:bg-green-100 transition-colors border border-green-200 dark:border-green-800">
                                    <span>Rp {userBalance.toLocaleString('id-ID')}</span>
                                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">+</div>
                                </Link>

                                <Link href="/wishlist" className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500 p-2 relative transition-colors group">
                                    <Heart className="h-6 w-6 group-hover:text-red-500 transition-colors" />
                                    {wishlistCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm border-2 border-white dark:border-slate-900">
                                            {wishlistCount > 99 ? '99+' : wishlistCount}
                                        </span>
                                    )}
                                </Link>
                                <div className="relative group flex items-center">
                                    <Link href="/account" className="flex items-center text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 gap-2 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-800">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="hidden lg:block text-sm font-semibold pr-2 max-w-[100px] truncate">
                                            {session.name || session.email?.split('@')[0]}
                                        </div>
                                    </Link>
                                </div>
                                <div className="border-l pl-4 border-gray-200 dark:border-white/10">
                                    <LogoutButton />
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1 sm:gap-2">
                                <Link
                                    href="/login"
                                    className="border border-green-600 text-green-600 hover:bg-green-50 font-bold text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all whitespace-nowrap"
                                >
                                    Masuk
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-green-600 text-white hover:bg-green-700 font-bold text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                                >
                                    Daftar
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
                {/* Mobile Search Bar (Visible only on small screens) */}
                <div className="md:hidden pb-4">
                    <SearchBar />
                </div>
            </div>
        </nav>
    );
}
