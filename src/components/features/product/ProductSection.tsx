'use client';

import { useRef, useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';

interface ProductSectionProps {
    title: string;
    slug: string; // Category slug for "View All" link
    products: any[];
}

export default function ProductSection({ title, slug, products }: ProductSectionProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;

        if (indicatorRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll > 0) {
                const progress = (scrollLeft / maxScroll) * 100;
                indicatorRef.current.style.left = `${progress * 0.65}%`;
            }
        }

        setIsVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 1500);
    };

    if (products.length === 0) return null;

    return (
        <div className="py-4 border-b border-gray-100 dark:border-white/5 last:border-0 relative">
            {/* Header */}
            <SectionHeader
                title={title}
                href={`/?category=${slug}`}
            />

            {/* Horizontal Slider Container */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto pb-2 px-1 gap-3 md:gap-6 snap-x snap-mandatory scroll-px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="flex-shrink-0 w-[145px] sm:w-[170px] md:w-[200px] snap-start transition-transform duration-300 hover:scale-[1.02]"
                    >
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            {/* Custom Mini Scroll Indicator */}
            <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
                <div className="w-12 h-1 bg-gray-200/40 rounded-full overflow-hidden backdrop-blur-sm relative">
                    <div
                        ref={indicatorRef}
                        className="h-full bg-green-500 rounded-full absolute top-0 left-0 transition-none will-change-transform"
                        style={{
                            width: '35%',
                            left: '0%'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

