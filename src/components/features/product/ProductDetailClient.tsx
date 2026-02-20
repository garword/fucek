'use client';

import { useState, useEffect } from 'react';
import { formatRupiah, cn, formatCompactNumber } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Minus, Plus, Search, Star, MessageCircle, Share2, ShieldCheck, Clock, Check, AlertCircle, ShoppingCart, CreditCard, User, Loader2, Repeat, FileText, Heart, BookOpen, Sparkles, Send, X } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faTiktok, faYoutube, faFacebook, faTwitter, faSpotify, faTwitch, faDiscord, faTelegram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faShoppingCart as faCartShopping, faUser } from '@fortawesome/free-solid-svg-icons'; // fallback
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import PaymentModal from '@/components/features/payment/PaymentModal';
import { getGameConfig } from '@/lib/game-config';
import SmmTargetGuide from './SmmTargetGuide';

interface ProductDetailClientProps {
    product: any;
    user?: any; // Session user
    tierName?: string;
}

// Helper to generate consistent color from string
const generateColor = (str: string) => {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
        'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
        'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
        'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function ProductDetailClient({ product, user, tierName }: ProductDetailClientProps) {
    const { showToast } = useToast();
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [quantity, setQuantity] = useState<number | ''>(1);

    // Auto-set min quantity for SMM
    useEffect(() => {
        if (product.category?.type === 'SOSMED') {
            setQuantity(''); // Default to empty for SMM
        }
    }, [product.category?.type]);
    const [target, setTarget] = useState('');
    const [zoneId, setZoneId] = useState('');
    const [validating, setValidating] = useState(false);
    const [accountInfo, setAccountInfo] = useState<any>(null);
    const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const router = useRouter();
    const [showTargetGuide, setShowTargetGuide] = useState(false);

    const selectedVariant = product.variants.find((v: any) => v.id === selectedVariantId);
    const gameConfig = getGameConfig(product.name, product.slug);
    const price = selectedVariant ? Number(selectedVariant.price) : product.minPrice;

    // SMM Logic
    const isSmm = product.category?.type === 'SOSMED';

    // Calculate total for PaymentModal
    // If SMM, price is Per Item already (imported as such). So we just multiply by qty.
    // Previous logic (price / 1000) was wrong because it assumed price was "Per 1000" but treated it as "Per Item" during calc?
    // ACTUAL: Variant.price = 464 (Per Item). Qty = 1000. Total = 464,000.
    const qty = typeof quantity === 'string' ? 0 : quantity;
    const totalAmount = price * qty;

    // Digital Product Check (Strict Category)
    const isDigital = product.category?.type === 'VOUCHER' || product.category?.type === 'DIGITAL';

    // Helper to generate target for digital products
    const generateDigitalTarget = (variant: any) => {
        if (!variant) return '-';
        // Abbreviate Variant Name: "Premium 1 Bulan" -> "P1B"
        const nameParts = variant.name.split(' ');
        let abbr = nameParts.map((p: string) => {
            if (!isNaN(parseInt(p))) return p; // Keep numbers
            return p[0].toUpperCase();
        }).join('');
        // Add duration if available and not in name
        if (variant.durationDays && !abbr.match(/\d/)) {
            abbr += variant.durationDays + 'H'; // Hari
        }
        return abbr.replace(/[^A-Z0-9]/g, '');
    };

    // Auto-set target for digital products
    useEffect(() => {
        if (isDigital && selectedVariant) {
            setTarget(generateDigitalTarget(selectedVariant));
        } else if (isDigital && !selectedVariant) {
            setTarget('');
        }
    }, [isDigital, selectedVariant]);

    // --- SMM LOGIC START ---
    // isSmm is already defined above

    // Parse SMM Variants into Categories
    const [smmCategories, setSmmCategories] = useState<Record<string, any[]>>({});
    const [selectedSmmCategory, setSelectedSmmCategory] = useState<string>('');
    const [inputType, setInputType] = useState<'default' | 'custom_comments' | 'mention'>('default');
    const [customComments, setCustomComments] = useState('');

    // Realtime Service Data
    const [serviceData, setServiceData] = useState<any>(null);
    const [loadingServiceData, setLoadingServiceData] = useState(false);

    useEffect(() => {
        if (isSmm && product.variants) {
            const cats: Record<string, any[]> = {};
            product.variants.forEach((v: any) => {
                const match = v.name.match(/^\[(.*?)\]\s*(.*)$/);
                const category = match ? match[1] : 'General';
                const serviceName = match ? match[2] : v.name;

                if (!cats[category]) cats[category] = [];
                const provider = v.providers?.find((p: any) => p.providerCode === 'MEDANPEDIA');
                cats[category].push({
                    ...v,
                    displayName: serviceName,
                    providerSku: provider?.providerSku // Attach SKU for lookup
                });
            });
            setSmmCategories(cats);

            // Set initial category
            const firstCat = Object.keys(cats)[0];
            if (firstCat) {
                setSelectedSmmCategory(firstCat);
                // Set initial variant
                if (cats[firstCat].length > 0 && !selectedVariantId) {
                    setSelectedVariantId(cats[firstCat][0].id);
                }
            }
        }
    }, [isSmm, product.variants, product.variants?.length]); // Added length check

    // Detect Input Type based on Variant Name / Category AND Fetch Realtime Data
    useEffect(() => {
        if (selectedVariant) {
            const nameLower = selectedVariant.name.toLowerCase();
            const catLower = selectedSmmCategory.toLowerCase();

            if (nameLower.includes('custom comment') || nameLower.includes('komentar') || catLower.includes('comment')) {
                setInputType('custom_comments');
            } else if (nameLower.includes('mention')) {
                setInputType('mention');
            } else {
                setInputType('default');
            }

            // FETCH REALTIME DATA
            if (isSmm) {
                const variantData = smmCategories[selectedSmmCategory]?.find((v: any) => v.id === selectedVariantId);
                const sku = variantData?.providerSku || selectedVariant.providers?.[0]?.providerSku;

                if (sku) {
                    setLoadingServiceData(true);
                    setServiceData(null); // Reset
                    fetch(`/api/medanpedia/check-service?id=${sku}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                setServiceData(data.data);
                            }
                        })
                        .catch(err => console.error(err))
                        .finally(() => setLoadingServiceData(false));
                }
            }
        }
    }, [selectedVariant, selectedSmmCategory, isSmm]);


    // Handle Category Change
    const handleSmmCategoryChange = (cat: string) => {
        setSelectedSmmCategory(cat);
        // Select first variant in new category
        if (smmCategories[cat]?.length > 0) {
            setSelectedVariantId(smmCategories[cat][0].id);
        }
    };

    // --- SMM LOGIC END ---

    // Helper to format target string
    const getFormattedTarget = () => {
        if (inputType === 'custom_comments' && customComments) {
            // For display in invoice/UI before backend processing
            return `${target} | COMMENTS: ${customComments.substring(0, 20)}...`;
        }

        if (accountInfo?.name) {
            return zoneId ? `${target} (${zoneId}) - ${accountInfo.name}` : `${target} - ${accountInfo.name}`;
        }
        return zoneId ? `${target} (${zoneId})` : target;
    };

    const handleDirectPurchase = async (method: 'qris' | 'balance') => {
        if (!user) {
            router.push(`/login?next=/p/${product.id}`);
            return;
        }

        if (!quantity || Number(quantity) <= 0) {
            showToast('Masukkan jumlah pesanan', 'error');
            return;
        }

        // Helper to format target for API
        // NOTE: For Direct Purchase, we don't have a specific field for customComments in checkout API body yet
        // So we append it here same as Cart logic
        let apiTarget = target;
        if (inputType === 'custom_comments' && customComments) {
            apiTarget = `${target} | COMMENTS: ${customComments}`;
        }

        const formattedTarget = getFormattedTarget(); // For display/logging

        setProcessingPayment(true);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: method,
                    items: [{
                        variantId: selectedVariantId,
                        quantity: quantity,
                        target: apiTarget, // Send combined string
                    }]
                })
            });

            const data = await res.json();
            if (res.ok) {
                router.refresh(); // Refresh server data (balance)
                router.push(`/invoice/${data.orderId}`); // Use orderId, not invoiceCode
                showToast('Checkout berhasil!', 'success');
            } else {
                showToast(data.error || 'Checkout Gagal', 'error');
                setShowPaymentModal(false);
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan', 'error');
            setShowPaymentModal(false);
        } finally {
            setProcessingPayment(false);
        }
    };
    const originalPrice = selectedVariant ? Number(selectedVariant.originalPrice || 0) : 0; // Default 0
    const hasPromo = originalPrice > price;
    const discountPercent = hasPromo ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    const handleAddToCart = async () => {
        if (!selectedVariantId) return;
        if (!user) {
            router.push(`/login?next=/p/${product.id}`);
            return;
        }

        if (!quantity || Number(quantity) <= 0) {
            showToast('Masukkan jumlah pesanan', 'error');
            return;
        }

        // Check if this is a game product that requires validation
        const isGameProduct = product.slug?.includes('free-fire') ||
            product.slug?.includes('mobile-legends') ||
            product.name?.includes('FREE FIRE') ||
            product.name?.includes('MOBILE');

        if (isGameProduct && !accountInfo) {
            showToast('Silakan periksa ID Game terlebih dahulu', 'error');
            return;
        }

        if (inputType === 'custom_comments' && !customComments) {
            showToast('Mohon isi komentar custom', 'error');
            return;
        }

        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    variantId: selectedVariantId,
                    quantity: quantity,
                    target: target,
                    customComments: inputType === 'custom_comments' ? customComments : undefined, // Pass custom comments
                    zoneId: zoneId || undefined, // For Mobile Legends
                    accountInfo: accountInfo || undefined // Save validated account info
                }),
            });
            if (res.ok) {
                showToast(`Berhasil menambahkan ${product.name} ke keranjang`, 'success');
                router.refresh(); // Update navbar cart count
            } else {
                const data = await res.json();
                showToast(data.error || 'Gagal masuk keranjang', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan koneksi', 'error');
        }
    };

    const handleWishlist = async () => {
        if (!selectedVariantId) {
            showToast('Pilih varian dulu', 'info');
            return;
        }
        if (!user) {
            router.push(`/login?next=/p/${product.id}`);
            return;
        }

        try {
            const res = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variantId: selectedVariantId }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
            } else {
                showToast(data.error, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Gagal update wishlist', 'error');
        }
    }


    const [reviews, setReviews] = useState<any[]>([]);
    const [totalReviews, setTotalReviews] = useState(product.reviewCount || 100);
    const [canReview, setCanReview] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const reviewsPerPage = 10;

    // Smart Natural Comment Generator
    const generateFakeReviews = (count: number, startIndex: number) => {
        const names = [
            "Budi Santoso", "Siti Aminah", "Rizky Pratama", "Dewi Lestari", "Agus Kurniawan",
            "Putri Maharani", "Eko Saputra", "Anisa Rahma", "Dimas Anggara", "Rina Wati",
            "Fajar Nugroho", "Nurul Hidayah", "Bayu Setiawan", "Indah Permata", "Aditya Wijaya",
            "Kevin Sanjaya", "Marcus Gideon", "Taufik Hidayat", "Susi Susanti", "Alan Budikusuma"
        ];

        const variants = product.variants || [];

        const templates = [
            (v: string) => `Mantap, ${v} nya langung aktif. Proses sat set.`,
            (v: string) => `Awalnya ragu, tapi ternyata ${v} disini paling murah & aman.`,
            (v: string) => `Proses kilat, ga sampe 5 menit ${v} udah bisa dipake.`,
            (v: string) => `Garansi ${v} beneran aman, admin fast respon banget.`,
            (v: string) => `Semoga awet full ${v}, sejauh ini lancar jaya.`,
            (v: string) => `Udah langganan 3x disini buat ${v}, gapernah kecewa.`,
            (v: string) => `Top markotop! ${v} premium harga kaki lima.`,
            (v: string) => `Sesuai deskripsi, ${v} full garansi anti hold.`,
            (v: string) => `Mantull gan, makasih ya! ${v} nya works 100%.`,
            (v: string) => `Recommended seller, jangan ragu beli ${v} disini.`,
            (v: string) => `Respon penjual sangat baik, ${v} langsung dikirim wa.`,
            (v: string) => `Barang sesuai pesanan, ${v} kualitas HD no buffer.`,
            (v: string) => `Kualitas oke banget, worth it lah buat harga segini.`,
            (v: string) => `Bakal langganan terus nih kalo ${v} nya awet gini.`
        ];

        return Array.from({ length: count }).map((_, i) => {
            const name = names[Math.floor(Math.random() * names.length)];
            const colorIndex = (name.length + i + startIndex) % 5;
            const colors = ["bg-red-100 text-red-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-yellow-100 text-yellow-700", "bg-purple-100 text-purple-700"];

            // Random Variant
            const variant = variants.length > 0 ? variants[Math.floor(Math.random() * variants.length)].name : product.name;
            const template = templates[Math.floor(Math.random() * templates.length)];

            // Random Time (1 hour to 1 year ago)
            const now = Date.now();
            const oneYear = 365 * 24 * 60 * 60 * 1000;
            const randomTime = Math.floor(Math.random() * oneYear);
            const date = new Date(now - randomTime);
            const diffSeconds = Math.floor((now - date.getTime()) / 1000);

            let timeAgo = "";
            if (diffSeconds < 3600) timeAgo = "Baru saja";
            else if (diffSeconds < 86400) timeAgo = `${Math.floor(diffSeconds / 3600)} jam lalu`;
            else if (diffSeconds < 604800) timeAgo = `${Math.floor(diffSeconds / 86400)} hari lalu`;
            else if (diffSeconds < 2592000) timeAgo = `${Math.floor(diffSeconds / 604800)} minggu lalu`;
            else if (diffSeconds < 31536000) timeAgo = `${Math.floor(diffSeconds / 2592000)} bulan lalu`;
            else timeAgo = "1 tahun lalu";

            return {
                id: `fake-${startIndex + i}`,
                name,
                comment: template(variant),
                rating: 4 + Math.random(), // 4.0 - 5.0
                hours: Math.floor(diffSeconds / 3600), // Keep for sort if needed
                timeAgo,
                initial: name.charAt(0),
                colorClass: colors[colorIndex],
                isOwn: false,
                isFake: true,
                variantName: variant,
                isRepeatOrder: Math.random() > 0.7 // 30% chance of repeat order
            };
        });
    };

    const fetchPageReviews = async (page: number) => {
        if (page === 1) {
            // Page 1: Fetch Real + Fill with Fake
            try {
                const res = await fetch(`/api/reviews?productId=${product.id}`);
                const data = await res.json();
                let realReviews = [];
                if (res.ok) {
                    realReviews = data.reviews.map((r: any) => {
                        // Calculate Time Ago for Real Reviews
                        let timeAgo = "";
                        if (r.createdAt) {
                            const now = Date.now();
                            const diffSeconds = Math.floor((now - new Date(r.createdAt).getTime()) / 1000);

                            if (diffSeconds < 60) timeAgo = "Baru saja";
                            else if (diffSeconds < 3600) timeAgo = `${Math.floor(diffSeconds / 60)} menit lalu`;
                            else if (diffSeconds < 86400) timeAgo = `${Math.floor(diffSeconds / 3600)} jam lalu`;
                            else if (diffSeconds < 604800) timeAgo = `${Math.floor(diffSeconds / 86400)} hari lalu`;
                            else if (diffSeconds < 2592000) timeAgo = `${Math.floor(diffSeconds / 604800)} minggu lalu`;
                            else if (diffSeconds < 31536000) timeAgo = `${Math.floor(diffSeconds / 2592000)} bulan lalu`;
                            else timeAgo = "1 tahun lalu";
                        } else {
                            // Fallback for old reviews without createdAt
                            timeAgo = r.hours ? (r.hours > 24 ? Math.floor(r.hours / 24) + " hari lalu" : r.hours + " jam lalu") : "Baru saja";
                        }

                        return {
                            ...r,
                            timeAgo: timeAgo,
                            hours: r.hours || 0
                        };
                    });
                    setCanReview(data.canReview);
                }

                // Use actual product reviewCount, max with real total
                const targetCount = Math.max(product.reviewCount || 0, data.totalCount || 0);
                const neededFake = Math.max(0, Math.min(reviewsPerPage - realReviews.length, targetCount - realReviews.length));
                const fakes = generateFakeReviews(neededFake, 0);

                setReviews([...realReviews, ...fakes]);
                setTotalReviews(targetCount);
            } catch (err) {
                // On error, use product's reviewCount
                const targetCount = product.reviewCount || 0;
                const fakes = generateFakeReviews(Math.min(targetCount, reviewsPerPage), 0);
                setReviews(fakes);
                setTotalReviews(targetCount);
            }
        } else {
            // Page > 1: Use product reviewCount
            const targetCount = product.reviewCount || 0;
            const startOffset = (page - 1) * reviewsPerPage;
            const remaining = Math.max(0, targetCount - startOffset);
            const fakes = generateFakeReviews(Math.min(remaining, reviewsPerPage), startOffset);
            setReviews(fakes);
        }
    };

    useEffect(() => {
        fetchPageReviews(1);
        if (product.category?.type === 'DIGITAL') {
            setTarget('AUTO');
        }
    }, [product.id, product.name, product.category?.type]);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        fetchPageReviews(newPage);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return alert("Pilih bintang dulu!");
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, rating, comment }),
            });
            const data = await res.json();

            if (res.ok) {
                alert("Ulasan berhasil dikirim!");
                setComment("");
                setRating(0);
                // Refresh reviews
                // Re-fetch the first page to include the new review
                fetchPageReviews(1);
            } else {
                alert(data.error || "Gagal mengirim ulasan");
            }
        } catch (err) {
            alert("Terjadi kesalahan");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative">
            <SmmTargetGuide isOpen={showTargetGuide} onClose={() => setShowTargetGuide(false)} />
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onConfirm={handleDirectPurchase}
                totalAmount={totalAmount}
                userBalance={user && !isNaN(Number(user.balance)) ? Number(user.balance) : 0}
                loading={processingPayment}
            />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
                {/* ... Left Side (Image) - Spans 7 columns on large screens ... */}
                {isSmm ? (
                    <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* LEFT SIDE: Info & Description */}
                        <div className="md:col-span-5 space-y-6">
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                                <div className="p-8 text-center space-y-4">
                                    <div className="w-24 h-24 mx-auto bg-green-50 rounded-full flex items-center justify-center text-6xl shadow-inner mb-4 overflow-hidden">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-contain p-2"
                                            />
                                        ) : (
                                            (() => {
                                                const lower = product.name.toLowerCase();
                                                if (lower.includes('instagram')) return <FontAwesomeIcon icon={faInstagram} className="text-[#E4405F]" />;
                                                if (lower.includes('tiktok')) return <FontAwesomeIcon icon={faTiktok} className="text-black" />;
                                                if (lower.includes('youtube')) return <FontAwesomeIcon icon={faYoutube} className="text-[#FF0000]" />;
                                                if (lower.includes('facebook')) return <FontAwesomeIcon icon={faFacebook} className="text-[#1877F2]" />;
                                                if (lower.includes('twitter') || lower.includes('x ')) return <FontAwesomeIcon icon={faTwitter} className="text-black" />;
                                                if (lower.includes('spotify')) return <FontAwesomeIcon icon={faSpotify} className="text-[#1DB954]" />;
                                                if (lower.includes('twitch')) return <FontAwesomeIcon icon={faTwitch} className="text-[#9146FF]" />;
                                                if (lower.includes('discord')) return <FontAwesomeIcon icon={faDiscord} className="text-[#5865F2]" />;
                                                if (lower.includes('telegram')) return <FontAwesomeIcon icon={faTelegram} className="text-[#0088cc]" />;
                                                if (lower.includes('linkedin')) return <FontAwesomeIcon icon={faLinkedin} className="text-[#0077b5]" />;
                                                return <div className="font-bold text-4xl text-green-600">{product.name.charAt(0)}</div>;
                                            })()
                                        )}
                                    </div>
                                    <h1 className="text-2xl font-black text-gray-900">{product.name}</h1>
                                    <p className="text-gray-500 font-medium bg-gray-50 inline-block px-4 py-1.5 rounded-full text-sm border border-gray-100">
                                        Layanan Social Media Marketing
                                    </p>
                                </div>

                                {/* Product Description - Moved here */}
                                <div className="px-8 pb-8">
                                    <div className="bg-green-50/50 rounded-2xl p-5 border border-green-100/50">
                                        <h3 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wide flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-green-600" />
                                            Deskripsi Layanan
                                        </h3>
                                        <div
                                            className="text-gray-600 text-sm leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: product.description || 'Pilih layanan yang sesuai dengan kebutuhan Anda pada form di samping.' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                                    <Clock className="w-8 h-8 text-green-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Proses</p>
                                        <p className="text-sm font-bold text-gray-900">Otomatis</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                                    <ShieldCheck className="w-8 h-8 text-green-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Garansi</p>
                                        <p className="text-sm font-bold text-gray-900">Tersedia</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Order Form */}
                        <div className="md:col-span-7">
                            {product.category && product.category.isActive === false ? (
                                <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center space-y-6 sticky top-24">
                                    <div className="w-24 h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2 animate-in zoom-in duration-300">
                                        <div className="relative">
                                            <ShoppingCart className="w-10 h-10 opacity-40" />
                                            <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 border-4 border-white shadow-sm">
                                                <X className="w-5 h-5 text-white" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-black text-gray-900">
                                            Layanan Tutup Sementara
                                        </h2>
                                        <div className="inline-block px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-sm font-bold border border-red-100">
                                            Kategori: {product.category?.name}
                                        </div>
                                    </div>
                                    <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                                        Mohon maaf, seluruh layanan dalam kategori ini sedang dinonaktifkan sementara waktu untuk pemeliharaan sistem atau stok opname.
                                    </p>
                                    <div className="pt-4">
                                        <button
                                            onClick={() => router.push('/')}
                                            className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                        >
                                            Cari Produk Lain
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden sticky top-24">
                                    <div className="p-6 sm:p-8 space-y-6">
                                        <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                <ShoppingCart className="w-5 h-5" />
                                            </div>
                                            <h2 className="text-lg font-bold text-gray-900">Form Pemesanan</h2>
                                        </div>

                                        {/* Kategori */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Kategori Layanan</label>
                                            <div className="relative group">
                                                <select
                                                    value={selectedSmmCategory}
                                                    onChange={(e) => handleSmmCategoryChange(e.target.value)}
                                                    className="w-full p-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:ring-0 focus:border-green-500 focus:bg-white transition-all text-sm font-medium appearance-none cursor-pointer hover:border-green-200"
                                                >
                                                    {Object.keys(smmCategories).map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                <ChevronLeft className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none text-gray-400 group-hover:text-green-500 transition-colors" />
                                            </div>
                                        </div>

                                        {/* Layanan */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Pilih Layanan</label>
                                            <div className="relative group">
                                                <select
                                                    value={selectedVariantId}
                                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                                    className="w-full p-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:ring-0 focus:border-green-500 focus:bg-white transition-all text-sm font-medium appearance-none truncate pr-10 cursor-pointer hover:border-green-200"
                                                >
                                                    {smmCategories[selectedSmmCategory]?.map((v: any) => (
                                                        <option key={v.id} value={v.id}>
                                                            {v.displayName}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronLeft className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none text-gray-400 group-hover:text-green-500 transition-colors" />
                                            </div>
                                            {/* Price Preview for Dropdown */}
                                            {selectedVariant && (
                                                <div className="text-right">
                                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                        Harga: <span className="text-green-600 font-bold">
                                                            {formatRupiah(isSmm ? price * 1000 : price)}
                                                        </span> {isSmm ? '/ 1000' : '/ 1 Pesanan'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info Box (Variant Specific) */}

                                        {/* Service Details Card (Realtime) */}
                                        {isSmm && selectedVariant && (
                                            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-4 sm:p-6 space-y-4 transition-all animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm relative overflow-hidden">
                                                {loadingServiceData ? (
                                                    <div className="flex flex-col items-center justify-center p-8 text-blue-400 gap-3">
                                                        <Loader2 className="w-8 h-8 animate-spin" />
                                                        <span className="text-sm font-medium animate-pulse">Mengambil data layanan...</span>
                                                    </div>
                                                ) : serviceData ? (
                                                    <>
                                                        {/* Header: Name & Price */}
                                                        <div className="flex flex-col gap-3 border-b border-blue-100/50 pb-4 relative z-10">
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3">
                                                                <div className="flex-1">
                                                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-relaxed">
                                                                        {selectedVariant.name}
                                                                    </h3>
                                                                </div>
                                                                <div className="self-start sm:self-auto bg-white px-2.5 py-1 rounded-lg border border-blue-100 shadow-sm text-[10px] sm:text-xs text-blue-600 font-bold whitespace-nowrap">
                                                                    ID: {serviceData.id}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                                <p className="text-xl sm:text-2xl font-black text-green-600 tracking-tight">
                                                                    {formatRupiah(isSmm ? price * 1000 : price)} <span className="text-sm font-normal text-gray-500">{isSmm ? '/ 1000' : '/ 1 Pesanan'}</span>
                                                                </p>
                                                                {hasPromo && (
                                                                    <p className="text-xs text-gray-400 line-through decoration-red-300">
                                                                        {formatRupiah(originalPrice)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Data Grid - Stack on Mobile (grid-cols-1), 2 Cols on Tablet+ */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-white/60 rounded-xl p-3 sm:p-4 border border-blue-100/50">
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider">Min / Max Order</p>
                                                                <p className="text-gray-800 font-bold text-sm">
                                                                    {formatCompactNumber(serviceData.min)} / {formatCompactNumber(serviceData.max)}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-1 pl-0 sm:pl-3 sm:border-l border-blue-100/50 border-t sm:border-t-0 pt-3 sm:pt-0">
                                                                <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider">Estimasi Waktu</p>
                                                                <p className="text-gray-800 font-medium text-sm leading-relaxed text-pretty">
                                                                    {serviceData.average_time}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <div className="bg-white rounded-xl p-3 sm:p-4 border border-blue-100/50 shadow-sm">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                                                                <p className="font-bold text-gray-900 text-xs uppercase tracking-wide">Deskripsi Layanan</p>
                                                            </div>
                                                            <div className="text-gray-600 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar pr-1 break-words">
                                                                {serviceData.description || "Tidak ada deskripsi tersedia."}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center p-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                        Gagal memuat detail layanan. Silakan coba lagi.
                                                    </div>
                                                )}
                                            </div>
                                        )}{/* Target (Link / Username) - Dynamic based on Type */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 ml-1">
                                                    {inputType === 'custom_comments' ? 'Link Postingan' :
                                                        inputType === 'mention' ? 'Username / Link' :
                                                            'Target (Link / Username)'}
                                                </label>
                                                {isSmm && (
                                                    <button
                                                        onClick={() => setShowTargetGuide(true)}
                                                        className="text-xs flex items-center gap-1.5 text-green-600 hover:text-green-700 font-bold bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors border border-green-200"
                                                    >
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        Panduan
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={target}
                                                    onChange={(e) => setTarget(e.target.value)}
                                                    placeholder={
                                                        inputType === 'custom_comments' ? "Contoh: https://instagram.com/p/..." :
                                                            selectedSmmCategory.toLowerCase().includes('follows') || selectedSmmCategory.toLowerCase().includes('subscriber') ? "Contoh: Username (tanpa @) atau Link Profile" :
                                                                "Contoh: https://instagram.com/p/... atau Username"

                                                    }
                                                    className="w-full p-4 pl-12 rounded-xl border-2 border-gray-100 focus:outline-none focus:ring-0 focus:border-green-500 bg-white transition-all"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                    <User className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 ml-1">
                                                {inputType === 'custom_comments' ? 'Masukkan link postingan yang ingin dikomentari.' : 'Pastikan akun tidak di-private.'}
                                            </p>
                                        </div>

                                        {/* Custom Comments Input */}
                                        {inputType === 'custom_comments' && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 ml-1">Custom Komentar</label>
                                                <div className="relative">
                                                    <textarea
                                                        value={customComments}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setCustomComments(val);
                                                            // Auto update quantity based on lines
                                                            const lines = val.split('\n').filter(line => line.trim() !== '').length;
                                                            if (lines > 0) setQuantity(lines);
                                                        }}
                                                        placeholder="Isi komentar, pisahkan dengan baris baru (Enter).&#10;Keren banget!&#10;Mantap gan&#10;Nice picture"
                                                        className="w-full p-4 rounded-xl border-2 border-gray-100 focus:outline-none focus:ring-0 focus:border-green-500 bg-white transition-all h-32"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 ml-1">
                                                    Total Komentar: <span className="font-bold text-green-600">{customComments.split('\n').filter(l => l.trim()).length}</span> (Jumlah otomatis mengikuti baris)
                                                </p>
                                            </div>
                                        )}

                                        {/* Jumlah */}
                                        {/* Jumlah & Total Harga */}
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 ml-1">Jumlah</label>
                                                <input
                                                    type="number"
                                                    value={quantity}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') setQuantity('');
                                                        else setQuantity(Number(val));
                                                    }}
                                                    placeholder={isSmm ? "0" : "1"}
                                                    className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-100 focus:outline-none focus:ring-0 focus:border-green-500 bg-white transition-all font-bold text-gray-900 text-sm sm:text-base"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 ml-1">Total Harga</label>
                                                <div className="relative w-full p-3 sm:p-4 rounded-xl border-2 border-green-100 bg-green-50/50 flex items-center justify-end min-h-[50px] sm:min-h-[58px]">
                                                    <span className="text-green-700 font-black text-right text-sm sm:text-lg break-all leading-tight">
                                                        {formatRupiah(price * (Number(quantity) || 0))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Button Pesan */}
                                        <div className="flex flex-col gap-3 mt-4">
                                            <button
                                                onClick={handleAddToCart}
                                                disabled={!selectedVariantId || !target}
                                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
                                            >
                                                <ShoppingCart className="w-5 h-5" />
                                                <span>Tambah ke Keranjang</span>
                                            </button>

                                            <button
                                                onClick={() => setShowPaymentModal(true)}
                                                disabled={!selectedVariantId || !target}
                                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
                                            >
                                                <CreditCard className="w-5 h-5" />
                                                <span>Beli Sekarang</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="md:col-span-7 space-y-6">
                            <div className="aspect-video bg-gray-100 rounded-3xl overflow-hidden relative shadow-2xl border border-white/20">
                                <img
                                    src={product.imageUrl || 'https://placehold.co/800x450'}
                                    alt={product.name}
                                    className="object-cover w-full h-full transform hover:scale-105 transition-transform duration-500"
                                />
                                {/* Total Stock Check - Skip for instant delivery products */}
                                {(() => {
                                    const hasInstantDelivery = product.category?.type === 'GAME' || product.variants.some((v: any) =>
                                        v.deliveryType === 'instant' ||
                                        product.slug?.includes('free-fire') ||
                                        product.slug?.includes('mobile-legends') ||
                                        product.name?.includes('FREE FIRE') ||
                                        product.name?.includes('MOBILE')
                                    );
                                    const totalStock = product.variants.reduce((acc: number, v: any) => acc + (v.stocks?.length || 0), 0);

                                    if (!hasInstantDelivery && totalStock === 0) {
                                        return (
                                            <div className="absolute top-4 left-4 bg-gray-800 text-white font-bold px-4 py-2 rounded-full shadow-lg text-sm tracking-wide z-20 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                Stok Habis
                                            </div>
                                        );
                                    } else if (product.socialProofMode) {
                                        return (
                                            <div className="absolute top-4 left-4 bg-red-600 text-white font-bold px-4 py-2 rounded-full shadow-lg text-sm tracking-wide">
                                                {product.socialProofMode}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center">
                                <button onClick={() => setInfoModal({ title: 'Auto Kirim', content: product.instantDeliveryInfo || 'Produk dikirim otomatis 24/7.' })} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-white/40 hover:bg-green-50 group">
                                    <Clock className="w-8 h-8 mx-auto text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm text-gray-700 font-bold group-hover:text-green-700">Auto Kirim</p>
                                </button>
                                <button onClick={() => setInfoModal({ title: 'Garansi', content: product.warrantyInfo || 'Garansi penuh selama durasi langganan.' })} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-white/40 hover:bg-green-50 group">
                                    <ShieldCheck className="w-8 h-8 mx-auto text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm text-gray-700 font-bold group-hover:text-green-700">Garansi</p>
                                </button>
                                <button onClick={() => setInfoModal({ title: 'Support', content: product.supportInfo || 'Hubungi kami jika ada kendala.' })} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-white/40 hover:bg-green-50 group">
                                    <MessageCircle className="w-8 h-8 mx-auto text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm text-gray-700 font-bold group-hover:text-green-700">Support</p>
                                </button>
                            </div>

                            {/* Reviews Section (Desktop Only - Left Side) */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20 hidden lg:block" id="reviews-section">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">Ulasan Pembeli ({totalReviews})</h3>
                                    <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100 shadow-sm">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="font-bold text-sm">{product.ratingValue || 5.0}</span>
                                    </div>
                                </div>

                                {/* Review Form removed as per new flow (Review from Order History) */}

                                <div className="space-y-4 min-h-[400px]">
                                    {reviews.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <p className="text-gray-900 font-bold mb-1">Belum ada ulasan</p>
                                            <p className="text-gray-500 text-sm">Jadilah yang pertama memberikan ulasan via Riwayat Pesanan!</p>
                                        </div>
                                    ) : reviews.map((review, i) => (
                                        <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 min-w-[2.5rem] rounded-full flex items-center justify-center font-bold text-sm shadow-sm text-white ${generateColor(review.name)}`} style={{ aspectRatio: '1/1' }}>
                                                    {review.initial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-900 truncate">{review.name}</p>
                                                            <div className="flex items-center flex-wrap gap-2 mt-1">
                                                                <div className="flex">
                                                                    {[...Array(5)].map((_, starIndex) => (
                                                                        <Star
                                                                            key={starIndex}
                                                                            className={`w-3 h-3 ${starIndex < Math.round(review.rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 font-medium">• {review.timeAgo || (review.hours ? review.hours + " jam lalu" : "Baru saja")}</span>

                                                                {/* Repeat Buyer Badge */}
                                                                {review.isRepeatOrder && (
                                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                                        <Repeat className="w-3 h-3" />
                                                                        Langganan
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {review.isOwn && (
                                                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                                                Kamu
                                                            </span>
                                                        )}
                                                    </div>

                                                    {review.variantName && (
                                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                                Varian: {review.variantName}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <p className="text-gray-600 text-sm leading-relaxed mt-3 bg-gray-50/50 p-3 rounded-xl rounded-tl-none">
                                                        "{review.comment}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination Controls */}
                                <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-bold text-gray-700 font-mono bg-gray-50 px-4 py-2 rounded-lg">
                                        Halaman {currentPage} / {Math.max(1, Math.ceil(totalReviews / reviewsPerPage))}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(Math.min(Math.ceil(totalReviews / reviewsPerPage), currentPage + 1))}
                                        disabled={currentPage >= Math.ceil(totalReviews / reviewsPerPage)}
                                        className="p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* Info Modal */}
                        {
                            infoModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                                    <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl scale-100 transition-transform relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-gray-900">{infoModal.title}</h3>
                                            <button onClick={() => setInfoModal(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                                <span className="sr-only">Close</span>
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed text-base">{infoModal.content}</p>
                                        <button onClick={() => setInfoModal(null)} className="w-full mt-8 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                                            Tutup
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        {/* Right: Details (Sticky on Desktop only) - Spans 5 columns */}
                        <div className="md:col-span-5 space-y-6 md:sticky md:top-24">
                            {product.category && product.category.isActive === false ? (
                                <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center space-y-6 sticky top-24">
                                    <div className="w-24 h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2 animate-in zoom-in duration-300">
                                        <div className="relative">
                                            <ShoppingCart className="w-10 h-10 opacity-40" />
                                            <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 border-4 border-white shadow-sm">
                                                <X className="w-5 h-5 text-white" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-black text-gray-900">
                                            Layanan Tutup Sementara
                                        </h2>
                                        <div className="inline-block px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-sm font-bold border border-red-100">
                                            Kategori: {product.category?.name}
                                        </div>
                                    </div>
                                    <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                                        Mohon maaf, seluruh layanan dalam kategori ini sedang dinonaktifkan sementara waktu untuk pemeliharaan sistem atau stok opname.
                                    </p>
                                    <div className="pt-4">
                                        <button
                                            onClick={() => router.push('/')}
                                            className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                        >
                                            Cari Produk Lain
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
                                        {/* Decorative Blob */}
                                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

                                        <div>
                                            <nav className="text-xs font-medium text-green-600 mb-3 uppercase tracking-wider">
                                                {product.category?.name}
                                            </nav>

                                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight tracking-tight">{product.name}</h1>

                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="flex items-center text-yellow-500 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
                                                    <Star className="w-4 h-4 fill-current" />
                                                    <span className="font-bold text-sm ml-1.5">{product.ratingValue || 5.0}</span>
                                                </div>
                                                <span className="text-gray-300">|</span>
                                                <span className="text-gray-500 text-sm font-medium">{formatCompactNumber(product.soldCount || 0)} Terjual</span>

                                                {/* Tier Badge */}
                                                {tierName && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-gray-900 to-gray-700 text-white px-3 py-1.5 rounded-full ring-2 ring-gray-100 shadow-md">
                                                            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                                                            <span className="text-xs font-bold tracking-wide uppercase">Member {tierName}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="bg-white/60 rounded-2xl p-5 border-2 border-dashed border-gray-300 mb-8">
                                                <h3 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wide flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-green-600" />
                                                    Deskripsi
                                                </h3>
                                                <div
                                                    className="text-gray-600 text-sm leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: product.description || '' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Variants */}
                                        <div className="mb-8">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                                <span className="w-1 h-4 bg-green-500 rounded-full mr-2"></span>
                                                Pilih Varian
                                            </h3>
                                            <div className="space-y-3">
                                                {product.variants.map((variant: any, index: number) => {
                                                    const stock = variant.stocks?.length || 0;
                                                    // For instant delivery (game topup via API), ignore stock check
                                                    const isInstantDelivery = product.category?.type === 'GAME' || variant.deliveryType === 'instant' ||
                                                        product.slug?.includes('free-fire') ||
                                                        product.slug?.includes('mobile-legends') ||
                                                        product.name?.includes('FREE FIRE') ||
                                                        product.name?.includes('MOBILE');
                                                    const isOutOfStock = !isInstantDelivery && stock === 0;
                                                    const isLastVariant = index === product.variants.length - 1;

                                                    // Generate Display Code
                                                    const displayCode = isDigital ? generateDigitalTarget(variant) : (variant.sku || variant.id.substring(0, 8));


                                                    return (
                                                        <div
                                                            key={variant.id}
                                                            className={cn(
                                                                "relative pb-3",
                                                                !isLastVariant && "border-b-2 border-gray-200 mb-3"
                                                            )}
                                                        >
                                                            <button
                                                                disabled={isOutOfStock}
                                                                onClick={() => !isOutOfStock && setSelectedVariantId(variant.id)}
                                                                className={cn(
                                                                    "w-full relative p-4 border-2 rounded-2xl text-left transition-all duration-200 outline-none group",
                                                                    isOutOfStock
                                                                        ? "opacity-60 cursor-not-allowed bg-gray-100 border-gray-200 grayscale"
                                                                        : selectedVariantId === variant.id
                                                                            ? "border-green-500 bg-green-50/50 shadow-green-100 shadow-lg scale-[1.02]"
                                                                            : "border-gray-300 bg-gray-50 hover:bg-white hover:border-green-400 hover:shadow-md"
                                                                )}
                                                            >
                                                                <div className="flex flex-col gap-3">
                                                                    {/* Top Side: Name & Stock */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={cn("font-bold text-sm sm:text-base mb-1.5 truncate pr-2", selectedVariantId === variant.id ? "text-green-800" : "text-gray-700")}>
                                                                            {variant.name}
                                                                        </p>
                                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-medium">
                                                                            <span className="text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100 font-mono text-[10px] sm:text-xs">
                                                                                {displayCode}
                                                                            </span>
                                                                            <span className={cn("font-semibold text-[10px] sm:text-xs", isInstantDelivery ? "text-green-600" : (stock > 0 ? "text-green-600" : "text-red-500"))}>
                                                                                {isInstantDelivery ? "Unlimited" : `Stok: ${stock}`}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Bottom Side: Price (Always bottom, consistent on all screens) */}
                                                                    <div className="flex flex-row justify-between items-center w-full mt-2 pt-2 border-t border-dashed border-gray-200">
                                                                        {/* Label "Harga:" (Visible on all screens) */}
                                                                        <span className="text-xs text-gray-400 font-medium">Harga:</span>

                                                                        <div className="text-right">
                                                                            <p className={cn("font-black text-lg whitespace-nowrap", selectedVariantId === variant.id ? "text-green-600" : "text-gray-900")}>
                                                                                {formatRupiah(Number(variant.price))}
                                                                            </p>
                                                                            {(variant as any).originalPrice && (variant as any).originalPrice > Number(variant.price) && (
                                                                                <div className="flex flex-col items-end">
                                                                                    <p className="text-[10px] sm:text-xs text-gray-400 line-through decoration-red-300">
                                                                                        {formatRupiah(Number((variant as any).originalPrice))}
                                                                                    </p>
                                                                                    {tierName && (
                                                                                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">
                                                                                            Hemat {formatRupiah(Number((variant as any).originalPrice) - Number(variant.price))}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {selectedVariantId === variant.id && (
                                                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-md animate-in zoom-in">
                                                                        <Check className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Price & Action */}
                                        <div className="border-t border-gray-100 pt-6">

                                            {/* GAME INPUT SECTION */}
                                            {(() => {
                                                // Use the scope variable gameConfig
                                                const manualNeedsZone = product.slug?.includes('mobile-legends') || product.name?.includes('MOBILE LEGENDS');
                                                const isGame = !!gameConfig || product.category?.type === 'GAME' || product.slug?.includes('fire') || product.slug?.includes('mobile') || product.slug?.includes('pubg');

                                                if (!isGame) return null;

                                                const inputType = gameConfig?.inputType || 'ID_ONLY';
                                                const needsZone = inputType === 'ID_ZONE' || inputType === 'ID_SERVER' || manualNeedsZone;

                                                const zoneLabel = gameConfig?.zoneLabel || (manualNeedsZone ? 'Zone ID' : 'Zone ID');
                                                const placeholderZone = gameConfig?.zonePlaceholder || '12345';
                                                const placeholderID = "Contoh: 12345678";

                                                return (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 mb-6 animate-in fade-in slide-in-from-bottom-4">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="p-1.5 bg-green-100 rounded-lg text-green-600">
                                                                <User size={18} />
                                                            </div>
                                                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                                                                Data Akun {gameConfig ? `(${gameConfig.name})` : ''}
                                                            </h3>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                                                <div className="relative w-full space-y-1.5">
                                                                    <label className="text-xs font-bold text-gray-500 ml-1">
                                                                        User ID / Player ID
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={target}
                                                                        onChange={(e) => { setTarget(e.target.value); setAccountInfo(null); }}
                                                                        placeholder={placeholderID}
                                                                        className="w-full p-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white font-mono text-gray-900 shadow-sm transition-all"
                                                                    />
                                                                </div>

                                                                {needsZone && (
                                                                    <div className="relative w-full sm:w-32 space-y-1.5 shrink-0">
                                                                        <label className="text-xs font-bold text-gray-500 ml-1">
                                                                            {zoneLabel}
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={zoneId}
                                                                            onChange={(e) => { setZoneId(e.target.value); setAccountInfo(null); }}
                                                                            placeholder={placeholderZone}
                                                                            className="w-full p-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white font-mono text-gray-900 shadow-sm transition-all"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* CHECK BUTTON */}
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!target) return showToast('Masukkan ID dulu', 'info');
                                                                        if (needsZone && !zoneId) return showToast(`Masukkan ${zoneLabel} dulu`, 'info');

                                                                        setValidating(true);
                                                                        setAccountInfo(null);
                                                                        try {
                                                                            const gameCode = gameConfig?.code || (manualNeedsZone ? 'ml' : 'ff');

                                                                            const res = await fetch('/api/utils/check-nickname', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    game: gameCode,
                                                                                    id: target,
                                                                                    server: zoneId
                                                                                })
                                                                            });
                                                                            const data = await res.json();
                                                                            if (data.success) {
                                                                                setAccountInfo(data);
                                                                                showToast(`Akun ditemukan: ${data.name}`, 'success');
                                                                            } else {
                                                                                showToast(data.error || 'Akun tidak ditemukan', 'error');
                                                                            }
                                                                        } catch (err) {
                                                                            showToast('Gagal memvalidasi akun', 'error');
                                                                        } finally {
                                                                            setValidating(false);
                                                                        }
                                                                    }}
                                                                    disabled={validating || !target || (needsZone && !zoneId)}
                                                                    className="w-full sm:w-14 p-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-green-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                                                                    title="Cek Validitas Akun"
                                                                >
                                                                    {validating ? (
                                                                        <Loader2 className="w-6 h-6 animate-spin" />
                                                                    ) : (
                                                                        <Search className="w-6 h-6" />
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {/* RESULT CARD */}
                                                            <AnimatePresence>
                                                                {accountInfo && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
                                                                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                                                                                <Check className="w-6 h-6 text-white" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-0.5">
                                                                                    Akun Valid
                                                                                </p>
                                                                                <p className="text-lg font-black text-gray-900 leading-none">
                                                                                    {accountInfo.name}
                                                                                </p>
                                                                                <div className="flex gap-2 text-[10px] text-gray-500 font-mono mt-1">
                                                                                    <span>ID: {target}</span>
                                                                                    {zoneId && <span>({zoneId})</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* SOSMED INPUT SECTION */}
                                            {(() => {
                                                if (product.category?.type !== 'SOSMED') return null;

                                                return (
                                                    <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 sm:p-5 mb-6 animate-in fade-in slide-in-from-bottom-4">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="p-1.5 bg-pink-100 rounded-lg text-pink-600">
                                                                <User size={18} />
                                                            </div>
                                                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                                                                Data Pesanan SMM
                                                            </h3>
                                                        </div>

                                                        <div className="space-y-4">
                                                            {/* Target Input */}
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-bold text-gray-500 ml-1">
                                                                    Target (Username / Link)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={target}
                                                                    onChange={(e) => setTarget(e.target.value)}
                                                                    placeholder="Contoh: https://instagram.com/user atau @username"
                                                                    className="w-full p-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 bg-white font-mono text-gray-900 shadow-sm transition-all"
                                                                />
                                                                <p className="text-[10px] text-gray-400 ml-1">
                                                                    Pastikan akun <strong>tidak diprivate</strong>.
                                                                </p>
                                                            </div>

                                                            {/* Quantity Input */}
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-bold text-gray-500 ml-1">
                                                                    Jumlah (Quantity)
                                                                </label>
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => setQuantity(Math.max(10, (Number(quantity) || 0) - 10))}
                                                                        className="p-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"
                                                                    >
                                                                        <Minus className="w-4 h-4" />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        value={quantity}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '') setQuantity('');
                                                                            else setQuantity(Math.max(1, Number(val)));
                                                                        }}
                                                                        className="flex-1 p-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 bg-white font-bold text-center text-gray-900 shadow-sm"
                                                                    />
                                                                    <button
                                                                        onClick={() => setQuantity((Number(quantity) || 0) + 10)}
                                                                        className="p-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                <div className="flex gap-2 justify-center mt-2">
                                                                    {[100, 500, 1000, 2000].map(q => (
                                                                        <button key={q} onClick={() => setQuantity(q)} className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full hover:bg-pink-50 hover:text-pink-600 transition-colors">
                                                                            {q}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Total Estimation */}
                                                            <div className="bg-white p-4 rounded-xl border border-pink-100 flex justify-between items-center">
                                                                <span className="text-xs font-bold text-gray-500">Total Estimasi:</span>
                                                                <span className="font-black text-lg text-pink-600">
                                                                    {formatRupiah((price / 1000) * (Number(quantity) || 0))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            {/* OTHER INPUTS (Non-Game & Non-Digital & Non-SMM) */}
                                            {product.category?.type !== 'GAME' && product.category?.type !== 'SOSMED' && !isDigital && !product.slug?.includes('fire') && !product.slug?.includes('mobile') && !product.slug?.includes('pubg') && (
                                                <>
                                                    {/* ... (Existing logic for non-game, e.g. Phone Number) ... */}
                                                    <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Target / Tujuan</p>
                                                    <input
                                                        type="text"
                                                        value={target}
                                                        onChange={(e) => setTarget(e.target.value)}
                                                        placeholder="Nomor HP / ID Pln / Email"
                                                        className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-gray-50 text-lg font-mono mb-4"
                                                    />
                                                </>
                                            )}

                                            {/* Quantity Selector */}

                                            {/* Quantity Selector - Hide for SMM since we have custom one */}
                                            {product.category?.type !== 'SOSMED' && (
                                                <div className="space-y-6 mb-6">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Jumlah</p>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 p-1">
                                                                <button
                                                                    onClick={() => setQuantity(Math.max(1, (Number(quantity) || 1) - 1))}
                                                                    disabled={(Number(quantity) || 0) <= 1}
                                                                    className="p-3 hover:bg-white rounded-lg transition-all disabled:opacity-50 text-gray-600"
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        if (!isNaN(val) && val >= 1) {
                                                                            // Check stock
                                                                            const max = !selectedVariant ? 100000 : (
                                                                                (product.category?.type === 'GAME' || selectedVariant.deliveryType === 'instant' || product.slug?.includes('free-fire') || product.slug?.includes('mobile-legends') || product.name?.includes('FREE FIRE') || product.name?.includes('MOBILE'))
                                                                                    ? 100000
                                                                                    : (selectedVariant.stocks?.length || 0)
                                                                            );
                                                                            if (val <= max) setQuantity(val);
                                                                        }
                                                                    }}
                                                                    className="w-24 text-center bg-transparent font-bold text-gray-900 focus:outline-none border border-gray-300 rounded-lg mx-1 py-1"
                                                                />
                                                                <button
                                                                    onClick={() => setQuantity((Number(quantity) || 0) + 1)}
                                                                    disabled={(() => {
                                                                        if (!selectedVariant) return true;
                                                                        const isInstant = product.category?.type === 'GAME' || selectedVariant.deliveryType === 'instant' || product.slug?.includes('free-fire') || product.slug?.includes('mobile-legends') || product.name?.includes('FREE FIRE') || product.name?.includes('MOBILE');
                                                                        const stock = selectedVariant.stocks?.length || 0;
                                                                        return !isInstant && (Number(quantity) || 0) >= stock;
                                                                    })()}
                                                                    className="p-3 hover:bg-white rounded-lg transition-all disabled:opacity-50 text-gray-600"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <span className="text-sm text-gray-500">
                                                                {(() => {
                                                                    if (!selectedVariant) return null;
                                                                    const isInstant = product.category?.type === 'GAME' || selectedVariant.deliveryType === 'instant' || product.slug?.includes('free-fire') || product.slug?.includes('mobile-legends') || product.name?.includes('FREE FIRE') || product.name?.includes('MOBILE');
                                                                    const stock = selectedVariant.stocks?.length || 0;
                                                                    return isInstant ? 'Stok Tersedia' : `Tersisa ${stock} stok`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-6 border-t border-gray-100 flex flex-col items-start gap-1">
                                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total Pembayaran</p>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">{formatRupiah(price * (Number(quantity) || 0))}</p>
                                                            {hasPromo && (
                                                                <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded-lg shadow-red-200 shadow-sm animate-pulse">
                                                                    -{discountPercent}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={handleAddToCart}
                                                disabled={!selectedVariantId || ((product.slug?.includes('free-fire') || product.slug?.includes('mobile-legends') || product.name?.includes('FREE FIRE') || product.name?.includes('MOBILE')) && !accountInfo)}
                                                className="w-full bg-slate-900 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 sm:gap-3 shadow-xl hover:shadow-2xl"
                                            >
                                                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                                                <span className="truncate">Tambah ke Keranjang</span>
                                            </button>

                                            <button
                                                onClick={() => setShowPaymentModal(true)}
                                                disabled={!selectedVariantId || ((product.slug?.includes('free-fire') || product.slug?.includes('mobile-legends') || product.name?.includes('FREE FIRE') || product.name?.includes('MOBILE')) && !accountInfo)}
                                                className="w-full bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-green-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 sm:gap-3 shadow-xl hover:shadow-green-600/30"
                                            >
                                                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                                                <span className="truncate">Beli Langsung</span>
                                            </button>

                                            <button
                                                onClick={handleWishlist}
                                                className="w-full py-3 text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Heart className="w-4 h-4" />
                                                <span>Simpan ke Wishlist ({formatCompactNumber(product.wishlistCount || 0)})</span>
                                            </button>
                                        </div>
                                        {!selectedVariantId && (
                                            <p className="text-xs text-red-500 mt-3 text-center font-medium bg-red-50 py-2 rounded-lg">
                                                ⚠️ Silakan pilih varian terlebih dahulu
                                            </p>
                                        )}
                                        {selectedVariantId && (product.slug?.includes('free-fire') || product.slug?.includes('mobile-legends') || product.name?.includes('FREE FIRE') || product.name?.includes('MOBILE')) && !accountInfo && (
                                            <p className="text-xs text-orange-600 mt-3 text-center font-medium bg-orange-50 py-2 rounded-lg border border-orange-200">
                                                🔍 Harap periksa ID Game terlebih dahulu untuk melanjutkan
                                            </p>
                                        )}
                                    </div>
                                    {/* Reviews Section (Mobile Only - Bottom) */}
                                    <div className="lg:hidden mt-8">
                                        {/* Separator */}
                                        <div className="border-t-2 border-dashed border-gray-200 mb-8" />

                                        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border-2 border-gray-100">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-lg font-bold text-gray-900">Ulasan Pembeli ({totalReviews})</h3>
                                                <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-3 py-1 rounded-full">
                                                    <Star className="w-4 h-4 fill-current" />
                                                    <span className="font-bold text-sm">{product.ratingValue || 5.0}</span>
                                                </div>
                                            </div>

                                            {/* Write Review Form - Only if purchased */}
                                            {canReview && (
                                                <form onSubmit={handleSubmitReview} className="mb-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-4">
                                                    <h4 className="font-bold text-sm text-gray-700 mb-2">Tulis Ulasan</h4>
                                                    <div className="flex gap-1 mb-3">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                type="button"
                                                                onClick={() => setRating(star)}
                                                                className={`transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                                            >
                                                                <Star className="w-6 h-6 fill-current" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <textarea
                                                        value={comment}
                                                        onChange={(e) => setComment(e.target.value)}
                                                        placeholder="Bagaimana pengalamanmu?"
                                                        className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-white"
                                                        rows={3}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleSubmitReview}
                                                        disabled={isSubmitting || rating === 0}
                                                        className="mt-2 w-full bg-black text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                                                    >
                                                        {isSubmitting ? 'Mengirim...' : 'Kirim Ulasan'}
                                                    </button>
                                                </form>
                                            )}

                                            <div className="space-y-4 min-h-[400px]">
                                                {reviews.length === 0 ? (
                                                    <p className="text-gray-500 text-center py-4">Belum ada ulasan publik.</p>
                                                ) : reviews.map((review, i) => (
                                                    <div key={i} className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                                        <div className="flex items-start gap-2 sm:gap-3 mb-2">
                                                            <div className={`w-10 h-10 min-w-[2.5rem] rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${review.colorClass}`} style={{ aspectRatio: '1/1' }}>
                                                                {review.initial}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-sm text-gray-900 truncate">{review.name}</p>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    {[...Array(5)].map((_, starIndex) => (
                                                                        <Star
                                                                            key={starIndex}
                                                                            className={`w-3 h-3 ${starIndex < Math.round(review.rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                {review.variantName && (
                                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                                            Varian: {review.variantName}
                                                                        </span>
                                                                        {review.isRepeatOrder && (
                                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                                <Repeat className="w-3 h-3" />
                                                                                Langganan
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                                                {review.timeAgo || (review.hours ? review.hours + "jm" : "Baru")}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 text-sm leading-relaxed pl-0 sm:pl-12">
                                                            "{review.comment}"
                                                        </p>
                                                        {review.isOwn && (
                                                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded mt-2 inline-block">Review Anda</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Pagination Controls */}
                                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <span className="text-sm font-bold text-gray-500 font-mono">
                                                    {currentPage} / {Math.ceil(totalReviews / reviewsPerPage)}
                                                </span>
                                                <button
                                                    onClick={() => handlePageChange(Math.min(Math.ceil(totalReviews / reviewsPerPage), currentPage + 1))}
                                                    disabled={currentPage >= Math.ceil(totalReviews / reviewsPerPage)}
                                                    className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function FileTextIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
    )
}
