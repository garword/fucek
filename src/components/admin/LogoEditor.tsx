'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, Image as ImageIcon, Type, Monitor, Smartphone, AlertTriangle, Save } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface IdentityConfig {
    mode: 'text' | 'image';
    text: string;
    subText: string;
    imageUrl: string;
    imageAlt: string;
}

export default function LogoEditor() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Server Config
    const [config, setConfig] = useState<IdentityConfig>({
        mode: 'text',
        text: 'STORE',
        subText: '.',
        imageUrl: '',
        imageAlt: 'Store Logo'
    });

    // Local Editing State
    const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
    const [tempText, setTempText] = useState('');
    const [tempSubText, setTempSubText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hasNewFile, setHasNewFile] = useState(false);

    useEffect(() => {
        fetch('/api/admin/design/identity')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setTempText(data.text || 'STORE');
                setTempSubText(data.subText || '.');
                if (data.imageUrl) setImagePreview(data.imageUrl);
                setActiveTab(data.mode || 'text'); // Sync tab with active mode initially
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();

            if (activeTab === 'image' && hasNewFile && fileInputRef.current?.files?.[0]) {
                // Case 1: Uploading New Image
                formData.append('type', 'upload_image');
                formData.append('file', fileInputRef.current.files[0]);
            } else {
                // Case 2: Updating Config (Text or switching to existing Image)
                formData.append('type', 'update_config');
                formData.append('mode', activeTab);
                formData.append('text', tempText);
                formData.append('subText', tempSubText);
            }

            const res = await fetch('/api/admin/design/identity', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const newData = await res.json();
                setConfig(newData.data);
                showToast('Identitas Website Diperbarui!', 'success');
                setHasNewFile(false);
                // Force reload to update Navbar
                window.location.reload();
            } else {
                throw new Error('Gagal menyimpan');
            }
        } catch (error) {
            showToast('Terjadi kesalahan saat menyimpan', 'error');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImagePreview(URL.createObjectURL(file));
        setHasNewFile(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Memuat Konfigurasi...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <Monitor className="w-5 h-5" />
                </div>
                Logo & Identitas Website
            </h3>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6 w-full md:w-fit self-center md:self-start">
                <button
                    onClick={() => setActiveTab('text')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'text' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Type className="w-4 h-4" />
                    Mode Teks
                </button>
                <button
                    onClick={() => setActiveTab('image')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'image' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ImageIcon className="w-4 h-4" />
                    Mode Gambar
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6">

                {activeTab === 'text' ? (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teks Utama</label>
                                <input
                                    type="text"
                                    value={tempText}
                                    onChange={(e) => setTempText(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-xl"
                                    placeholder="STORE"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sub Teks / Titik</label>
                                <input
                                    type="text"
                                    value={tempSubText}
                                    onChange={(e) => setTempSubText(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-xl text-emerald-600"
                                    placeholder="."
                                />
                            </div>
                        </div>

                        {/* Text Preview */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200/50 space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</p>
                            <div className="h-16 bg-white border border-gray-200 rounded-xl px-8 flex items-center shadow-sm w-full max-w-md">
                                <span className="font-bold text-2xl text-green-600 tracking-tight">
                                    {tempText}<span className="text-gray-800">{tempSubText}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700 text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div>
                                <p className="font-bold">Panduan Ukuran Logo</p>
                                <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                                    <li>Format: <b>PNG (Transparan)</b> sangat disarankan.</li>
                                    <li>Tinggi: <b>40px - 50px</b>. File terlalu besar akan otomatis diperkecil (visual).</li>
                                    <li>Lebar: Usahakan di bawah <b>200px</b> agar aman di HP.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative group">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="font-medium">Klik untuk Upload Logo Baru</p>
                                <p className="text-xs">PNG, JPG, WEBP</p>
                            </div>
                        </div>

                        {imagePreview && (
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200/50 space-y-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visual Check</p>

                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <Monitor className="w-4 h-4 text-gray-400" />
                                        <div className="h-16 bg-white border border-gray-200 rounded-xl px-8 flex items-center shadow-sm w-full max-w-md bg-[url('/grid.png')]">
                                            <img src={imagePreview} alt="Preview" className="h-10 w-auto object-contain" />
                                        </div>
                                        <span className="text-xs text-gray-500">Desktop</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Smartphone className="w-4 h-4 text-gray-400" />
                                        <div className="h-14 bg-white border border-gray-200 rounded-xl px-4 flex items-center shadow-sm w-48 overflow-hidden bg-[url('/grid.png')]">
                                            <img src={imagePreview} alt="Preview" className="h-8 w-auto object-contain max-w-[140px]" />
                                        </div>
                                        <span className="text-xs text-gray-500">Mobile</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Action Button */}
                <div className="pt-6 border-t border-gray-50 mt-auto">
                    <button
                        onClick={handleSave}
                        disabled={saving || (activeTab === 'image' && !imagePreview)}
                        className="w-full bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-sm md:text-base hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {activeTab === 'text'
                            ? 'Simpan Pengaturan Logo Teks'
                            : (hasNewFile ? 'Upload & Gunakan Logo Gambar' : 'Gunakan Logo Gambar Ini')}
                    </button>
                    {!hasNewFile && activeTab === 'image' && config.mode !== 'image' && imagePreview && (
                        <p className="text-center text-xs text-gray-500 mt-2">
                            *Klik tombol di atas untuk mengaktifkan mode gambar dengan logo yang sudah ada.
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
}
