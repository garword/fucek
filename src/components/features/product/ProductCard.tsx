
import Image from 'next/image';
import Link from 'next/link';
import { formatRupiah, formatCompactNumber } from '@/lib/utils';
import { ShoppingCart, Star, ShieldCheck, Gamepad2, Zap } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faTiktok, faYoutube, faFacebook, faTwitter, faSpotify, faTwitch, faDiscord, faTelegram, faSoundcloud, faPinterest, faLinkedin, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faGlobe, faHashtag } from '@fortawesome/free-solid-svg-icons';

interface ProductCardProps {
    product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
    // Use real data from DB
    const rating = (product.ratingValue || 5.0).toFixed(1);
    const sold = product.soldCount || product.reviewCount || 100;
    const soldDisplay = formatCompactNumber(sold);

    // Use DB data
    // If product.originalPrice exists (pre-calculated) use it, otherwise find from variants
    const variant = product.variants?.[0];

    // Helper to safely convert Decimal/Number/String to Number
    const toNum = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return Number(val.toString());
    };

    const originalPrice = product.originalPrice ? toNum(product.originalPrice) : (variant?.originalPrice ? toNum(variant.originalPrice) : 0);
    const price = product.minPrice ? toNum(product.minPrice) : (variant?.price ? toNum(variant.price) : 0);

    const discount = originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    // Only show if discount > 0
    const showDiscount = discount > 0;

    // Logic to determine if product is unlimited (Game/Topup/Pulsa)
    const isUnlimited = product.category?.type === 'GAME' ||
        product.category?.type === 'PULSA' ||
        product.slug?.includes('free-fire') ||
        product.slug?.includes('mobile-legends') ||
        product.name?.includes('FREE FIRE') ||
        product.name?.includes('MOBILE');

    const isOutOfStock = !isUnlimited && product.totalStock === 0;

    // SMM Logic
    const isSmm = product.category?.type === 'SOSMED';

    const getSmmIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('instagram')) return { icon: faInstagram, color: '#E4405F' };
        if (lower.includes('youtube')) return { icon: faYoutube, color: '#FF0000' };
        if (lower.includes('tiktok')) return { icon: faTiktok, color: '#000000' };
        if (lower.includes('facebook')) return { icon: faFacebook, color: '#1877F2' };
        if (lower.includes('twitter') || lower.includes('x ')) return { icon: faTwitter, color: '#000000' };
        if (lower.includes('spotify')) return { icon: faSpotify, color: '#1DB954' };
        if (lower.includes('twitch')) return { icon: faTwitch, color: '#9146FF' };
        if (lower.includes('discord')) return { icon: faDiscord, color: '#5865F2' };
        if (lower.includes('telegram')) return { icon: faTelegram, color: '#26A5E4' };
        if (lower.includes('soundcloud')) return { icon: faSoundcloud, color: '#FF5500' };
        if (lower.includes('pinterest')) return { icon: faPinterest, color: '#BD081C' };
        if (lower.includes('linkedin')) return { icon: faLinkedin, color: '#0077B5' };
        if (lower.includes('google')) return { icon: faGoogle, color: '#4285F4' };
        if (lower.includes('website')) return { icon: faGlobe, color: '#4285F4' };
        return { icon: faHashtag, color: '#DB2777' }; // Default
    };

    return (
        <Link
            href={`/p/${product.slug}`}
            className={`group block bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-green-200 hover:shadow-lg hover:border-green-400 dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] active:ring-4 active:ring-green-400/50 active:bg-green-50 active:scale-[0.98] transition-all duration-200 overflow-hidden border border-gray-100 dark:border-white/5 flex flex-col h-full ${isOutOfStock ? 'grayscale-[0.8] hover:grayscale-0 opacity-80 hover:opacity-100' : ''
                }`}
        >
            {/* Image Section */}
            <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-slate-900">
                {isSmm && !product.imageUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-800">
                        {(() => {
                            const { icon, color } = getSmmIcon(product.name);
                            return <FontAwesomeIcon icon={icon} className="text-6xl sm:text-7xl drop-shadow-md transition-transform duration-500 group-hover:scale-110" style={{ color }} />;
                        })()}
                    </div>
                ) : (
                    <Image
                        src={product.imageUrl || 'https://placehold.co/400x400/png'}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                )}

                {/* Discount Badge (Top Left) */}
                {showDiscount && !isOutOfStock && (
                    <div className="absolute top-0 left-0 z-10">
                        <div className="bg-red-600 text-white font-bold text-[10px] px-2 py-1 rounded-br-lg shadow-sm">
                            {discount}% OFF
                        </div>
                    </div>
                )}

                {/* Out of Stock Badge (Center Overlay & Top Right) */}
                {isOutOfStock && (
                    <>
                        <div className="absolute top-0 right-0 z-10">
                            <div className="bg-gray-800/90 text-white font-bold text-[10px] px-2 py-1 rounded-bl-lg shadow-md backdrop-blur-sm">
                                Stok Habis
                            </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
                            <div className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                                HABIS
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Content Section */}
            <div className="p-2.5 flex flex-col flex-1">
                {/* Title */}
                <h3 className="font-normal text-gray-800 dark:text-gray-100 text-xs md:text-sm leading-snug line-clamp-2 min-h-[2.5em] mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {product.name}
                </h3>

                {/* Price */}
                <div className="mt-auto">
                    <div className={`font-bold text-sm md:text-base leading-tight ${isOutOfStock ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {formatRupiah(product.minPrice)}
                    </div>
                    {/* Strikethrough Price (Optional) */}
                    {showDiscount && !isOutOfStock && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through decoration-gray-400">
                                {formatRupiah(originalPrice)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Rating & Sold */}
                <div className="flex items-center gap-1 mt-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span>{rating}</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>{soldDisplay} terjual</span>
                </div>

                {/* Stock Info */}
                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                    {isUnlimited ? (
                        <span className="truncate text-green-600 dark:text-green-500 font-medium">Stok: Unlimited</span>
                    ) : (
                        <span className={`truncate font-medium ${isOutOfStock ? 'text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                            Stok: {product.totalStock}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
