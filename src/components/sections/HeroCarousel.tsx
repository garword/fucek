'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Banner {
    id: string;
    imageUrl: string;
    linkUrl: string;
    active: boolean;
    createdAt: string;
}

interface StaticSlide {
    type: 'static';
    id: string;
}

interface ImageSlide extends Banner {
    type: 'image';
}

type Slide = StaticSlide | ImageSlide;

interface HeroCarouselProps {
    banners?: Banner[];
    heroText?: {
        title: string;
        subtitle: string;
        buttonText: string;
        buttonLink: string;
    };
}

export default function HeroCarousel({ banners = [], heroText = {
    title: "Topup Cepat, *Murah*, dan Aman",
    subtitle: "Platform topup game dan produk digital terpercaya. Proses otomatis 24 jam dengan harga terbaik.",
    buttonText: "Mulai Belanja",
    buttonLink: "#products"
} }: HeroCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Combine static default banner with dynamic banners
    const allSlides: Slide[] = [
        { type: 'static', id: 'default-banner' },
        ...banners.map(b => ({ ...b, type: 'image' as const }))
    ];

    useEffect(() => {
        if (allSlides.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % allSlides.length);
        }, 4000); // 4 seconds auto-slide

        return () => clearInterval(interval);
    }, [allSlides.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % allSlides.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + allSlides.length) % allSlides.length);
    };

    // Helper to render title with highlights (e.g., *word* becomes green)
    const renderTitle = (text: string) => {
        if (!text) return null;
        const parts = text.split('*');
        return parts.map((part, index) => {
            // Even indices are normal, Odd indices are highlighted
            if (index % 2 === 1) {
                return <span key={index} className="text-emerald-600">{part}</span>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <section className="relative w-full h-64 md:h-80 lg:h-96 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg group bg-white border border-gray-100">
            {allSlides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                >
                    {slide.type === 'static' ? (
                        // Static Default Banner (The 'Green Card')
                        <div className="w-full h-full bg-gradient-to-r from-emerald-50 to-teal-50 p-6 md:p-12 flex flex-col justify-center relative overflow-hidden">
                            <div className="relative z-10 max-w-3xl">
                                <h1 className="text-2xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-4 leading-tight">
                                    {renderTitle(heroText.title)}
                                </h1>
                                <p className="text-gray-600 text-sm md:text-lg max-w-2xl mb-4 md:mb-8">
                                    {heroText.subtitle}
                                </p>
                                <div className="flex gap-3">
                                    <a href={heroText.buttonLink} className="px-5 py-2 md:px-6 md:py-3 bg-emerald-600 text-white text-sm md:text-base font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20">
                                        {heroText.buttonText}
                                    </a>
                                </div>
                            </div>
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 md:w-64 h-48 md:h-64 bg-emerald-400/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 md:w-64 h-48 md:h-64 bg-teal-400/10 rounded-full blur-3xl"></div>
                        </div>
                    ) : (
                        // Dynamic Image Banner
                        <Link href={(slide as ImageSlide).linkUrl} className="block w-full h-full relative" target={(slide as ImageSlide).linkUrl.startsWith('http') ? '_blank' : '_self'}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={(slide as ImageSlide).imageUrl}
                                alt={`Banner ${index}`}
                                className="w-full h-full object-cover"
                                loading={index === 0 ? "eager" : "lazy"}
                            />
                        </Link>
                    )}
                </div>
            ))}

            {/* Navigation Arrows */}
            {allSlides.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 z-20"
                        aria-label="Previous Slide"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 z-20"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Dots Indicators - Removed */}
            {/* Removed per user request */}
        </section>
    );
}
