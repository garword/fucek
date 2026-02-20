"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Save, Loader2, Layout, Link as LinkIcon } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";

export default function CreatePagePage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        content: "<p>Mulai tulis konten disini...</p>",
    });

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        // Auto-generate slug from title if slug is empty or matches previous auto-slug
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        setFormData(prev => ({ ...prev, title, slug }));
    };

    const handleSave = async () => {
        if (!formData.title || !formData.slug) {
            toast.error("Judul dan Slug wajib diisi");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/content/pages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg);
            }

            toast.success("Halaman berhasil dibuat!");
            router.push("/admin/content/pages");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Gagal membuat halaman");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/content/pages" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
                    <ChevronLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Buat Halaman Baru</h1>
                    <p className="text-gray-500">Tambahkan halaman statis baru ke website.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Editor */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Konten Halaman</label>
                        <RichTextEditor
                            content={formData.content}
                            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Sidebar Settings */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Layout size={18} className="text-emerald-600" />
                            Pengaturan Halaman
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Halaman</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={handleTitleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                                placeholder="Contoh: Tentang Kami"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug URL</label>
                            <div className="relative">
                                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-mono text-gray-600 bg-gray-50"
                                    placeholder="tentang-kami"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">URL: domain.com/info/{formData.slug || '...'}</p>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 mt-4"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Halaman
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
