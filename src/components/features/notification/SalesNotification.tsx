'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, ShoppingBag } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faInstagram, faTiktok, faYoutube, faFacebook, faTwitter,
    faSpotify, faTwitch, faDiscord, faTelegram, faLinkedin
} from '@fortawesome/free-brands-svg-icons';
import { faHashtag } from '@fortawesome/free-solid-svg-icons';

type NotificationData = {
    id: string;
    name: string;
    action: string; // e.g., "baru saja membeli"
    product: string;
    variant: string;
    image: string | null;
    icon: string | null; // SMM Icon key
    categoryType: string | null;
    time: string;
    type: 'REAL' | 'FAKE';
    createdAt?: number;
};

export default function SalesNotification() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [data, setData] = useState<NotificationData | null>(null);

    // Queue management
    const queueRef = useRef<NotificationData[]>([]);
    const processingRef = useRef(false);
    const mountedRef = useRef(false);

    // Hide on Auth/Admin Pages
    const hiddenPaths = ['/login', '/register', '/verify-otp', '/forgot-password', '/admin'];
    const shouldHide = hiddenPaths.some(path => pathname?.startsWith(path));

    // SMM Icon Logic
    const getSmmIcon = (productName: string) => {
        const lower = productName.toLowerCase();
        if (lower.includes('instagram')) return { icon: faInstagram, color: '#E4405F' };
        if (lower.includes('tiktok')) return { icon: faTiktok, color: '#000000' };
        if (lower.includes('youtube')) return { icon: faYoutube, color: '#FF0000' };
        if (lower.includes('facebook')) return { icon: faFacebook, color: '#1877F2' };
        if (lower.includes('twitter') || lower.includes('x ')) return { icon: faTwitter, color: '#000000' };
        if (lower.includes('spotify')) return { icon: faSpotify, color: '#1DB954' };
        if (lower.includes('twitch')) return { icon: faTwitch, color: '#9146FF' };
        if (lower.includes('discord')) return { icon: faDiscord, color: '#5865F2' };
        if (lower.includes('telegram')) return { icon: faTelegram, color: '#0088cc' };
        if (lower.includes('linkedin')) return { icon: faLinkedin, color: '#0077b5' };
        return { icon: faHashtag, color: '#10B981' };
    };

    // Fetch Data from API
    const fetchSalesData = async () => {
        try {
            const res = await fetch('/api/public/recent-sales', { next: { revalidate: 60 } }); // Call API
            if (!res.ok) throw new Error('Failed to fetch');
            const result = await res.json();

            if (Array.isArray(result) && result.length > 0) {
                // Add new unique items to queue
                const currentIds = new Set(queueRef.current.map(i => i.id));
                const newItems = result.filter((item: NotificationData) => !currentIds.has(item.id));

                if (newItems.length > 0) {
                    queueRef.current = [...queueRef.current, ...newItems];
                    processQueue();
                }
            }
        } catch (error) {
            console.error('[SalesNotification] Fetch error:', error);
        }
    };

    // Process Queue
    const processQueue = () => {
        if (processingRef.current || queueRef.current.length === 0 || shouldHide) return;

        processingRef.current = true;
        const nextItem = queueRef.current.shift(); // Dequeue

        if (nextItem) {
            setData(nextItem);
            setIsVisible(true);

            // Hide after 5 seconds
            setTimeout(() => {
                setIsVisible(false);

                // Wait buffer before next (random 5-15s)
                const nextDelay = Math.floor(Math.random() * 10000) + 5000;
                setTimeout(() => {
                    processingRef.current = false;
                    processQueue(); // Loop
                }, nextDelay);

            }, 5000);
        } else {
            processingRef.current = false;
        }
    };

    // Initial Fetch & Interval
    useEffect(() => {
        if (shouldHide) return;
        mountedRef.current = true;

        fetchSalesData();

        // Refresh data every 60s
        const intervalId = setInterval(fetchSalesData, 60000);

        return () => {
            mountedRef.current = false;
            clearInterval(intervalId);
        };
    }, [shouldHide, pathname]);

    // Handle when visibility changes to false (cleanup if needed) or re-trigger
    useEffect(() => {
        if (!isVisible && !processingRef.current && queueRef.current.length > 0) {
            // Retry if queue has items and we are idle
            processQueue();
        }
    }, [isVisible]);


    if (shouldHide || !data) return null;

    const isSmm = data.categoryType === 'SOSMED' || data.categoryType === 'PULSA'; // Adjust based on your schema logic
    // Just a fallback check for SMM styling
    const smmIcon = getSmmIcon(data.product);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: 0 }} // Start from bottom
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-4 left-4 z-[90] max-w-[320px] w-auto bg-white/90 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white transition-colors"
                >
                    {/* Progress Bar */}
                    <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-green-400 to-emerald-500 rounded-bl-2xl"
                    />

                    {/* Image / Icon */}
                    <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center relative shadow-sm">
                        {data.image ? (
                            <img
                                src={data.image}
                                alt="Product"
                                className="w-full h-full object-cover"
                            />
                        ) : smmIcon ? (
                            <FontAwesomeIcon icon={smmIcon.icon} style={{ color: smmIcon.color }} className="text-2xl" />
                        ) : (
                            <ShoppingBag className="w-6 h-6 text-green-600" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-sm text-gray-900 truncate max-w-[140px]">{data.name}</h4>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {data.time}
                            </span>
                        </div>

                        <div className="text-xs text-gray-600 leading-snug line-clamp-2">
                            {data.action === "order" ? "membeli" : data.action} <span className="font-bold text-gray-800">{data.variant || data.product}</span>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsVisible(false);
                        }}
                        className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 transition-colors p-1"
                    >
                        <X size={14} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
