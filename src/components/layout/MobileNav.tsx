'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function MobileNav() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Hide on admin pages and auth pages
    const hiddenPaths = ['/admin', '/login', '/register', '/verify-otp', '/forgot-password'];
    const shouldShow = !hiddenPaths.some(path => pathname?.startsWith(path));

    // Auto-hide on scroll down, show on scroll up
    useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                if (window.scrollY > lastScrollY && window.scrollY > 100) { // Scroll down
                    setIsVisible(false);
                } else { // Scroll up
                    setIsVisible(true);
                }
                setLastScrollY(window.scrollY);
            }
        };

        window.addEventListener('scroll', controlNavbar);
        return () => window.removeEventListener('scroll', controlNavbar);
    }, [lastScrollY]);
    const navItems = [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/track', icon: FileText, label: 'Cek Invoice' },
        { href: '/cart', icon: ShoppingCart, label: 'Keranjang' },
        { href: '/account', icon: User, label: 'Akun' },
    ];

    if (!shouldShow) return null;

    return (
        <div className={cn(
            "fixed bottom-6 left-6 right-6 z-50 lg:hidden transition-transform duration-300 ease-in-out",
            isVisible ? "translate-y-0" : "translate-y-[150%]"
        )}>
            <nav className="bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-green-900/10 p-2 flex justify-around items-center">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    // ... (rest of the map function)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 relative",
                                isActive
                                    ? "bg-green-100/80 text-green-700 translate-y-[-4px] shadow-lg shadow-green-100"
                                    : "text-gray-500 hover:text-green-600 hover:bg-green-50/50"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                            {isActive && (
                                <span className="absolute -bottom-8 text-[10px] font-bold text-green-900 bg-white/90 backdrop-blur px-2.5 py-0.5 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-2 border border-green-100">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
