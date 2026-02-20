'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, cn } from '@/lib/utils';
import { Loader2, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import PaymentModal from '@/components/features/payment/PaymentModal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faTiktok, faYoutube, faFacebook, faTwitter, faSpotify, faTwitch, faDiscord, faTelegram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

export default function CartPage() {
    const { showToast } = useToast();
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [promoCode, setPromoCode] = useState('');
    const [promoApplied, setPromoApplied] = useState<any>(null);
    const [promoError, setPromoError] = useState('');

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [userBalance, setUserBalance] = useState(0);

    const router = useRouter();

    const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.variant.price) * item.quantity), 0);
    const discount = promoApplied ? (promoApplied.type === 'FIXED' ? promoApplied.value : (subtotal * promoApplied.value / 100)) : 0;
    const total = Math.max(0, subtotal - discount);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cartRes, userRes] = await Promise.all([
                    fetch('/api/cart'),
                    fetch('/api/user/me') // Assuming this endpoint exists, or we use api/wallet/balance?
                    // Let's check if api/user/me exists or create safe fallback
                ]);

                if (cartRes.status === 401) {
                    router.push('/login?next=/cart');
                    return;
                }

                const cartData = await cartRes.json();
                if (cartData.items) {
                    setCartItems(cartData.items);
                }

                // Try to get balance
                const userData = await userRes.json().catch(() => ({}));
                if (userData.balance !== undefined && userData.balance !== null) {
                    setUserBalance(Number(userData.balance));
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    // ... (keep updateQuantity, removeItem, handleApplyPromo)

    const handleCheckoutClick = () => {
        setShowPaymentModal(true);
    };

    const handlePaymentConfirm = async (method: 'qris' | 'balance') => {
        setProcessingPayment(true);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: method
                })
            });
            const data = await res.json();
            if (res.ok) {
                router.push(`/invoice/${data.orderId}`); // Fixed: data.orderId
                showToast('Checkout berhasil, silakan bayar', 'success');
            } else {
                showToast(data.error || 'Checkout Gagal', 'error');
                setShowPaymentModal(false);
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan saat checkout', 'error');
            setShowPaymentModal(false);
        } finally {
            setProcessingPayment(false);
        }
    };

    const updateQuantity = async (id: string, newQty: number) => {
        if (newQty < 1) return;

        // Optimistic update
        const originalItems = [...cartItems];
        setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));

        try {
            const res = await fetch(`/api/cart/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: newQty })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal update keranjang');
            }
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Gagal update quantity', 'error');
            // Revert
            setCartItems(originalItems);
        }
    };

    const removeItem = async (id: string) => {
        setCartItems(prev => prev.filter(item => item.id !== id));
        try {
            await fetch(`/api/cart/${id}`, { method: 'DELETE' });
            router.refresh();
            showToast('Produk dihapus dari keranjang', 'info');
        } catch (error) {
            console.error(error);
            showToast('Gagal menghapus produk', 'error');
        }
    };

    const handleApplyPromo = async () => {
        setPromoError('');
        try {
            const res = await fetch('/api/promo/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: promoCode })
            });
            const data = await res.json();
            if (res.ok) {
                setPromoApplied(data.promo);
                showToast(`Promo ${data.promo.code} berhasil dipakai!`, 'success');
            } else {
                setPromoError(data.error);
                setPromoApplied(null);
                showToast(data.error, 'error');
            }
        } catch (error) {
            setPromoError('Gagal menggunakan promo');
            showToast('Gagal menggunakan promo', 'error');
        }
    };

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                router.push(`/invoice/${data.invoiceCode}`);
                showToast('Checkout berhasil, silakan bayar', 'success');
            } else {
                showToast(data.error || 'Checkout Gagal', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan saat checkout', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin h-8 w-8 text-green-600" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-green-600" />
                Keranjang Belanja
            </h1>

            {cartItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Keranjang masih kosong</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">Yuk isi keranjangmu dengan produk digital terbaik pilihan kami.</p>
                    <Link href="/" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl">
                        Mulai Belanja
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Items List */}
                    <div className="lg:col-span-2 space-y-4">
                        {cartItems.map((item) => (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 transition-shadow hover:shadow-md">
                                <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                                    {item.variant.product.category?.type === 'SOSMED' && !item.variant.product.imageUrl ? (
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            {(() => {
                                                const lower = item.variant.product.name.toLowerCase();
                                                if (lower.includes('instagram')) return <FontAwesomeIcon icon={faInstagram} className="text-[#E4405F] text-4xl" />;
                                                if (lower.includes('tiktok')) return <FontAwesomeIcon icon={faTiktok} className="text-black text-4xl" />;
                                                if (lower.includes('youtube')) return <FontAwesomeIcon icon={faYoutube} className="text-[#FF0000] text-4xl" />;
                                                if (lower.includes('facebook')) return <FontAwesomeIcon icon={faFacebook} className="text-[#1877F2] text-4xl" />;
                                                if (lower.includes('twitter') || lower.includes('x ')) return <FontAwesomeIcon icon={faTwitter} className="text-black text-4xl" />;
                                                if (lower.includes('spotify')) return <FontAwesomeIcon icon={faSpotify} className="text-[#1DB954] text-4xl" />;
                                                if (lower.includes('twitch')) return <FontAwesomeIcon icon={faTwitch} className="text-[#9146FF] text-4xl" />;
                                                if (lower.includes('discord')) return <FontAwesomeIcon icon={faDiscord} className="text-[#5865F2] text-4xl" />;
                                                if (lower.includes('telegram')) return <FontAwesomeIcon icon={faTelegram} className="text-[#0088cc] text-4xl" />;
                                                if (lower.includes('linkedin')) return <FontAwesomeIcon icon={faLinkedin} className="text-[#0077b5] text-4xl" />;
                                                return <Users className="w-8 h-8 text-green-600" />;
                                            })()}
                                        </div>
                                    ) : (
                                        <img
                                            src={item.variant.product.imageUrl || 'https://placehold.co/100'}
                                            alt={item.variant.product.name}
                                            className="object-cover w-full h-full"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.variant.product.name}</h3>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <p className="text-sm text-gray-500 bg-gray-100 w-fit px-2 py-0.5 rounded text-xs font-semibold">{item.variant.name}</p>

                                            {/* Generated ID (Product + Random/Unique) */}
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 w-fit px-2 py-1 rounded-md">
                                                <span>ID:</span>
                                                <span className="font-mono uppercase">
                                                    {item.variant.product.id.substring(0, 4)}-{item.id.substring(item.id.length - 4)}
                                                </span>
                                            </div>

                                            {item.target && (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-blue-50 border border-blue-100 w-fit px-2 py-1 rounded-md">
                                                    <span className="text-blue-500">Target:</span>
                                                    <span className="font-mono truncate max-w-[150px]" title={item.target}>{item.target}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="font-bold text-green-600 text-lg">
                                            {item.variant.product.category?.type === 'SOSMED' ? (
                                                <>
                                                    {formatRupiah(Number(item.variant.price) * 1000)}
                                                    <span className="text-xs font-normal text-gray-500 ml-1">/ 1000</span>
                                                </>
                                            ) : (
                                                formatRupiah(Number(item.variant.price))
                                            )}
                                        </p>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-1.5 hover:bg-gray-200 rounded-l-lg disabled:opacity-50 transition-colors"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-1.5 hover:bg-gray-200 rounded-r-lg disabled:opacity-50 transition-colors"
                                                    disabled={
                                                        !(item.variant.deliveryType === 'instant' || item.variant.product?.category?.type === 'GAME') &&
                                                        item.quantity >= item.variant.stock
                                                    }
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all"
                                                title="Hapus"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="h-fit space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Tag className="w-5 h-5 text-green-600" />
                                Promo & Diskon
                            </h2>
                            <div className="space-y-2">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        placeholder="Masukkan Kode Promo"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all uppercase"
                                    />
                                    <button
                                        onClick={handleApplyPromo}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                                    >
                                        Pakai
                                    </button>
                                </div>
                                {promoError && <p className="text-xs text-red-500 font-medium pl-1">{promoError}</p>}
                                {promoApplied && <p className="text-xs text-green-600 font-bold pl-1">Promo aktif: Hemat {formatRupiah(discount)}</p>}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 sticky top-24">
                            <h2 className="text-lg font-bold text-gray-900">Ringkasan Pesanan</h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Total Harga ({cartItems.length} barang)</span>
                                    <span>{formatRupiah(subtotal)}</span>
                                </div>
                                {promoApplied && (
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>Total Diskon Barang</span>
                                        <span>-{formatRupiah(discount)}</span>
                                    </div>
                                )}
                                <div className="border-t border-dashed pt-4 flex justify-between items-center">
                                    <span className="font-bold text-lg text-gray-900">Total Belanja</span>
                                    <span className="font-bold text-xl text-green-600">{formatRupiah(total)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckoutClick}
                                className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-green-600/30 flex items-center justify-center space-x-2 active:scale-[0.98]"
                            >
                                <span>Beli ({cartItems.length})</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onConfirm={handlePaymentConfirm}
                totalAmount={total}
                userBalance={userBalance}
                loading={processingPayment}
            />
        </div>
    );
}
