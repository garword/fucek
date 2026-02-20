
'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Globe, FileText } from 'lucide-react';

type SiteContent = {
    id: string;
    slug: string;
    title: string;
    content: string;
    updatedAt: string;
};

export default function ContentPage() {
    const [contents, setContents] = useState<SiteContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [form, setForm] = useState({ slug: '', title: '', content: '' });
    const [saving, setSaving] = useState(false);
    const [isNew, setIsNew] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/content');
            if (res.ok) {
                const data = await res.json();
                setContents(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (slug: string) => {
        const item = contents.find(c => c.slug === slug);
        if (item) {
            setSelectedSlug(slug);
            setForm({ slug: item.slug, title: item.title || '', content: item.content || '' });
            setIsNew(false);
        }
    };

    const handleCreateNew = () => {
        setSelectedSlug('new');
        setForm({ slug: '', title: '', content: '' });
        setIsNew(true);
    };

    const handleSave = async () => {
        if (!form.slug) return alert('Slug is required');

        setSaving(true);
        try {
            const res = await fetch('/api/admin/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                // alert('Saved!');
                await fetchData();
                if (isNew) {
                    setSelectedSlug(form.slug);
                    setIsNew(false);
                }
            } else {
                alert('Failed to save');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-100px)]">
            {/* Sidebar List */}
            <div className="md:col-span-1 bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-gray-800">Halaman</h2>
                    <button
                        onClick={handleCreateNew}
                        className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title="Buat Halaman Baru"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
                    ) : contents.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm">Belum ada halaman.</div>
                    ) : (
                        contents.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item.slug)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${selectedSlug === item.slug
                                        ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                                        : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <FileText size={16} className={selectedSlug === item.slug ? 'text-green-600' : 'text-gray-400'} />
                                <span className="truncate">{item.title || item.slug}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="md:col-span-3 bg-white shadow-sm border border-gray-200 rounded-xl p-6 flex flex-col">
                {(selectedSlug || isNew) ? (
                    <div className="flex flex-col h-full space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {isNew ? 'Buat Halaman Baru' : 'Edit Halaman'}
                            </h2>
                            {!isNew && (
                                <a
                                    href={`/pages/${form.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                                >
                                    <Globe size={14} />
                                    Lihat Live
                                </a>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Halaman</label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                    placeholder="Contoh: Tentang Kami"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug / URL Info</label>
                                <input
                                    value={form.slug}
                                    onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-green-500 focus:border-green-500 outline-none transition-all font-mono text-sm bg-gray-50"
                                    placeholder="contoh: tentang-kami"
                                    disabled={!isNew && form.slug !== 'new'}
                                />
                                <p className="text-xs text-gray-500 mt-1">URL: /pages/{form.slug || '...'}</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Konten (HTML / Teks)</label>
                            <textarea
                                value={form.content}
                                onChange={e => setForm({ ...form, content: e.target.value })}
                                className="flex-1 w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-green-500 focus:border-green-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                placeholder="Tulis konten di sini. Support tag HTML dasar seperti <p>, <b>, <ul>, dsb."
                            />
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-green-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-70"
                            >
                                <Save size={18} />
                                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>Pilih halaman di sebelah kiri untuk mengedit</p>
                        <button onClick={handleCreateNew} className="mt-4 text-green-600 font-medium hover:underline">
                            atau Buat Baru
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
