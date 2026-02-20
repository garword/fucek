
'use client';

import { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Film, Music, Shield, Cpu, LayoutGrid, Gamepad2, Smartphone, Monitor, Tag } from 'lucide-react';

const iconMap: any = {
    film: Film,
    music: Music,
    shield: Shield,
    cpu: Cpu,
    'gamepad-2': Gamepad2,
    signal: Smartphone,
    instagram: Monitor,
    video: Film,
    youtube: Monitor,
    default: LayoutGrid
};

interface ProductTabsProps {
    categories: any[];
}

export default function ProductTabs({ categories = [] }: ProductTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'foryou';

    // Scroll handling refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.classList.add('scrolling');

            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.classList.remove('scrolling');
                }
            }, 1000); // Hide after 1 second
        }
    };

    // Static tabs mapping to Schema Types
    const tabs = [
        { id: 'foryou', label: 'Semua', icon: LayoutGrid },
        { id: 'promo', label: 'Promo', icon: Tag },
        { id: 'digital', label: 'Produk Digital', icon: Cpu },
        { id: 'games', label: 'Topup Game', icon: Gamepad2 },
        { id: 'pulsa', label: 'Pulsa & Data', icon: Smartphone },
        { id: 'sosmed', label: 'Sosmed', icon: Monitor },
    ];

    const handleTabClick = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString());

        // Handle "Semua" / foryou
        if (tabId === 'foryou') {
            params.delete('tab');
            params.delete('category'); // Clear category param if exists
        } else {
            params.set('tab', tabId);
            params.delete('category'); // Clear legacy category param to avoid conflict
        }

        // Reset page if needed, or keep other params like search 'q'
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    return (
        <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="mb-6 overflow-x-auto scrollbar-green py-3 px-1 transition-all"
        >
            <div className="flex space-x-3 min-w-max">
                {tabs.map((tab) => {
                    const isActive = currentTab === tab.id || (tab.id === 'foryou' && !searchParams.get('tab'));
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={cn(
                                "flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 border-b-[4px] active:border-b-0 active:translate-y-[4px]",
                                isActive
                                    ? "bg-green-500 text-white border-green-700"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            )}
                        >
                            {Icon && <Icon size={18} strokeWidth={2.5} />}
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
