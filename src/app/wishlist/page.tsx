
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { Loader2, Trash2, ShoppingCart, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

export default function WishlistPage() {
    const { showToast } = useToast();
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/wishlist')
            .then((res) => {
                if (res.status === 401) {
                    router.push('/login?next=/wishlist');
                    return [];
                }
                return res.json();
            })
            .then((data) => {
                if (Array.isArray(data)) {
                    setWishlist(data);
                }
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleRemove = async (variantId: string) => {
        try {
            const res = await fetch('/api/wishlist', {
                method: 'POST', // POST acts as toggle, so it removes if exists
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variantId }),
            });
            if (res.ok) {
                setWishlist((prev) => prev.filter((item) => item.variantId !== variantId));
                showToast('Dihapus dari wishlist', 'info');
            } else {
                showToast('Gagal menghapus', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan', 'error');
        }
    };

    const handleAddToCart = async (variantId: string, name: string) => {
        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variantId, quantity: 1 }),
            });
            if (res.ok) {
                showToast(`Berhasil menambahkan ${name} ke keranjang`, 'success');
                router.refresh();
            } else {
                const data = await res.json();
                showToast(data.error || 'Gagal masuk keranjang', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan koneksi', 'error');
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
                <Heart className="w-8 h-8 text-green-600 fill-green-600" />
                Wishlist Saya
            </h1>

            {wishlist.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Wishlist kosong</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">Simpan produk favoritmu disini dan beli nanti.</p>
                    <Link href="/" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl">
                        Cari Produk
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {wishlist.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-all group">
                            <div className="aspect-video bg-gray-50 relative overflow-hidden">
                                <img
                                    src={item.variant.product.imageUrl || 'https://placehold.co/600x400'}
                                    alt={item.variant.product.name}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 right-2">
                                    <button
                                        onClick={() => handleRemove(item.variantId)}
                                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 shadow-sm transition-all"
                                        title="Hapus dari wishlist"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-900 line-clamp-2 min-h-[2.5em] mb-1">{item.variant.product.name}</h3>
                                <p className="text-xs text-gray-500 mb-3 bg-gray-100 w-fit px-2 py-0.5 rounded font-medium">{item.variant.name}</p>

                                <div className="mt-auto">
                                    <p className="text-lg font-bold text-green-600 mb-4">{formatRupiah(Number(item.variant.price))}</p>

                                    <button
                                        onClick={() => handleAddToCart(item.variantId, item.variant.product.name)}
                                        className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-all font-bold text-sm shadow-sm flex items-center justify-center space-x-2"
                                    >
                                        <ShoppingCart size={16} />
                                        <span>+ Keranjang</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
