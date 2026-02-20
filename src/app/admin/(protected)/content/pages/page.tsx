"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Loader2, FileText, Calendar, Globe } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Page {
    id: string;
    title: string;
    slug: string;
    updatedAt: string;
}

export default function ContentPagesPage() {
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const res = await fetch("/api/admin/content/pages");
            if (!res.ok) throw new Error("Failed to fetch pages");
            const data = await res.json();
            setPages(data);
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat daftar halaman");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus halaman ini?")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/content/pages/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Halaman berhasil dihapus");
            fetchPages();
        } catch (error) {
            console.error(error);
            toast.error("Gagal menghapus halaman");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredPages = pages.filter(page =>
        (page.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (page.slug || "").toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Halaman Statis</h1>
                    <p className="text-gray-500">Kelola konten halaman informasi website (About, FAQ, Terms, dll).</p>
                </div>
                <Link
                    href="/admin/content/pages/new"
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                >
                    <Plus size={18} />
                    Buat Halaman
                </Link>
            </div>

            {/* Search & Stats */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={search}
                        placeholder="Cari halaman..."
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
            </div>

            {/* Pages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPages.map((page) => (
                    <div key={page.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/info/${page.slug}`}
                                        target="_blank"
                                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Lihat Halaman"
                                    >
                                        <Globe size={16} />
                                    </Link>
                                    <Link
                                        href={`/admin/content/pages/${page.id}`}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(page.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Hapus"
                                        disabled={deletingId === page.id}
                                    >
                                        {deletingId === page.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-900 mb-1 truncate">{page.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-600">/{page.slug}</span>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                                <Calendar size={12} />
                                <span>Diperbarui {format(new Date(page.updatedAt), "d MMM yyyy, HH:mm", { locale: id })}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPages.length === 0 && !loading && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center translate-x-1/2 right-1/2 relative mb-4">
                        <FileText size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Tidak ada halaman</h3>
                    <p className="text-gray-500 mb-6">Belum ada halaman statis yang dibuat.</p>
                    <Link
                        href="/admin/content/pages/new"
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Buat Halaman Baru
                    </Link>
                </div>
            )}
        </div>
    );
}
