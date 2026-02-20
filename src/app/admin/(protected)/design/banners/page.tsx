'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Image as ImageIcon, ExternalLink, X, MoveUp, MoveDown, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Banner {
    id: string;
    imageUrl: string;
    linkUrl: string;
    active: boolean;
}

export default function BannerManagementPage() {
    const router = useRouter();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state for new banner
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await fetch('/api/admin/design/banners');
            const data = await res.json();
            if (data.success) {
                setBanners(data.banners);
            }
        } catch (error) {
            console.error('Failed to fetch banners', error);
            toast.error('Gagal mengambil data banner');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBanner = () => {
        if (!newImageUrl.trim()) {
            toast.error('URL Gambar harus diisi');
            return;
        }

        if (banners.length >= 4) {
            toast.error('Maksimal 4 banner diizinkan. Hapus banner lama terlebih dahulu.');
            return;
        }

        const newBanner: Banner = {
            id: crypto.randomUUID(),
            imageUrl: newImageUrl.trim(),
            linkUrl: newLinkUrl.trim() || '#',
            active: true
        };

        const updatedBanners = [...banners, newBanner];
        setBanners(updatedBanners);
        setNewImageUrl('');
        setNewLinkUrl('');

        // Auto save on add
        saveBanners(updatedBanners, 'Banner berhasil ditambahkan!');
    };

    const handleRemoveBanner = (id: string) => {
        const updatedBanners = banners.filter(b => b.id !== id);
        setBanners(updatedBanners);
        // Auto save on remove
        saveBanners(updatedBanners, 'Banner berhasil dihapus!');
    };

    const saveBanners = async (currentBanners: Banner[], successMessage: string) => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/design/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ banners: currentBanners })
            });

            const data = await res.json();
            if (data.success) {
                toast.success(successMessage);
                router.refresh();
            } else {
                toast.error(data.error || 'Gagal menyimpan perubahan');
                // Revert if failed (optional, but good for UX)
                fetchBanners();
            }
        } catch (error) {
            console.error('Save error', error);
            toast.error('Terjadi kesalahan saat menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => saveBanners(banners, 'Perubahan berhasil disimpan!');

    const moveBanner = (index: number, direction: 'up' | 'down') => {
        const newBanners = [...banners];
        if (direction === 'up' && index > 0) {
            [newBanners[index], newBanners[index - 1]] = [newBanners[index - 1], newBanners[index]];
        } else if (direction === 'down' && index < newBanners.length - 1) {
            [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];
        }
        setBanners(newBanners);
    };

    // Hero Text State
    const [heroText, setHeroText] = useState({
        title: '',
        subtitle: '',
        buttonText: '',
        buttonLink: ''
    });

    useEffect(() => {
        fetchHeroText();
    }, []);

    const fetchHeroText = async () => {
        try {
            const res = await fetch('/api/admin/design/hero-text');
            const data = await res.json();
            if (data.success) {
                setHeroText(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch hero text', error);
        }
    };

    const handleSaveHeroText = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/design/hero-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(heroText)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Teks utama berhasil disimpan!');
            } else {
                toast.error('Gagal menyimpan teks');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading banners...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Hero Text Editor */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Edit Teks Utama</h2>
                        <p className="text-sm text-gray-500">Sesuaikan judul dan deskripsi pada banner utama.</p>
                    </div>
                    <button
                        onClick={handleSaveHeroText}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                        <Save size={18} />
                        Simpan Teks
                    </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama</label>
                            <input
                                type="text"
                                value={heroText.title}
                                onChange={(e) => setHeroText({ ...heroText, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 font-bold text-lg"
                                placeholder="Topup Cepat, *Murah*, dan Aman"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Gunakan tanda bintang <code>*kata*</code> untuk mewarnai teks menjadi <span className="text-emerald-600 font-bold">hijau</span>.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Judul</label>
                            <textarea
                                value={heroText.subtitle}
                                onChange={(e) => setHeroText({ ...heroText, subtitle: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 h-24"
                                placeholder="Platform topup game terpercaya..."
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teks Tombol</label>
                            <input
                                type="text"
                                value={heroText.buttonText}
                                onChange={(e) => setHeroText({ ...heroText, buttonText: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Mulai Belanja"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Link Tombol</label>
                            <input
                                type="text"
                                value={heroText.buttonLink}
                                onChange={(e) => setHeroText({ ...heroText, buttonLink: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="#products"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Banner Utama</h1>
                    <p className="text-sm text-gray-500">Kelola banner slide di halaman utama (Maks. 4)</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                    <Save size={18} />
                    {saving ? 'Menyimpan...' : 'Simpan Banner'}
                </button>
            </div>

            {/* Current Banners Grid */}
            <div className="space-y-6">
                {banners.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Belum ada banner aktif</p>
                    </div>
                ) : (
                    banners.map((banner, index) => (
                        <div key={banner.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                            {/* Header: Controls */}
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                                        SLIDE {index + 1}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono hidden md:inline truncate max-w-[200px]">{banner.imageUrl}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => moveBanner(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Geser Atas"
                                    >
                                        <MoveUp size={18} />
                                    </button>
                                    <button
                                        onClick={() => moveBanner(index, 'down')}
                                        disabled={index === banners.length - 1}
                                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Geser Bawah"
                                    >
                                        <MoveDown size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Main: Large Image Preview */}
                            <div className="relative w-full aspect-[3/1] bg-gray-100 group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={banner.imageUrl}
                                    alt={`Banner ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/1200x400?text=Invalid+Image+URL'; }}
                                />
                                {banner.linkUrl !== '#' && (
                                    <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2">
                                        <ExternalLink size={12} />
                                        Link: {banner.linkUrl}
                                    </div>
                                )}
                            </div>

                            {/* Footer: Actions */}
                            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
                                <div className="w-full sm:w-auto text-xs text-gray-400">
                                    ID: <span className="font-mono">{banner.id.split('-')[0]}...</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveBanner(banner.id)}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-red-100"
                                >
                                    <Trash2 size={18} />
                                    HAPUS BANNER INI
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add New Section */}
            {banners.length < 4 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-emerald-500" />
                        Tambah Banner Baru
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar (Wajib)</label>
                            <input
                                type="text"
                                placeholder="https://example.com/banner.jpg"
                                value={newImageUrl}
                                onChange={(e) => setNewImageUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2 flex items-start gap-2">
                                <Info className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-yellow-700">
                                    <strong>Rekomendasi Ukuran:</strong> 1200 x 400 pixel (Rasio 3:1).<br />
                                    Pastikan gambar berkualitas tinggi agar tidak pecah.
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (Opsional)</label>
                            <input
                                type="text"
                                placeholder="/produk/mlbb-promo"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleAddBanner}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Tambahkan ke Daftar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
