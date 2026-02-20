'use client';

import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import RichTextEditor from '@/components/admin/RichTextEditor';

interface Faq {
    id: string;
    question: string;
    answer: string;
    isActive: boolean;
    sortOrder: number;
}

interface FaqManagerProps {
    initialFaqs: Faq[];
}

export default function FaqManager({ initialFaqs }: FaqManagerProps) {
    const [faqs, setFaqs] = useState<Faq[]>(initialFaqs);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ question: '', answer: '' });

    // Filter FAQs
    const filteredFaqs = useMemo(() => {
        return faqs.filter(f =>
            f.question.toLowerCase().includes(search.toLowerCase()) ||
            f.answer.toLowerCase().includes(search.toLowerCase())
        );
    }, [faqs, search]);

    const openModal = (faq?: Faq) => {
        if (faq) {
            setEditingFaq(faq);
            setFormData({ question: faq.question, answer: faq.answer });
        } else {
            setEditingFaq(null);
            setFormData({ question: '', answer: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingFaq(null);
        setFormData({ question: '', answer: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const url = editingFaq ? `/api/admin/faq/${editingFaq.id}` : '/api/admin/faq';
            const method = editingFaq ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to save');

            const savedFaq = await res.json();

            if (editingFaq) {
                setFaqs(faqs.map(f => f.id === savedFaq.id ? savedFaq : f));
                toast.success('Pertanyaan diperbarui!');
            } else {
                setFaqs([...faqs, savedFaq]);
                toast.success('Pertanyaan ditambahkan!');
            }
            closeModal();
        } catch (error) {
            toast.error('Gagal menyimpan data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus pertanyaan ini?')) return;

        try {
            await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' });
            setFaqs(faqs.filter(f => f.id !== id));
            toast.success('Pertanyaan dihapus.');
        } catch (error) {
            toast.error('Gagal menghapus data.');
        }
    };

    const toggleActive = async (faq: Faq) => {
        try {
            const newStatus = !faq.isActive;
            // Optimistic update
            setFaqs(faqs.map(f => f.id === faq.id ? { ...f, isActive: newStatus } : f));

            await fetch(`/api/admin/faq/${faq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newStatus }),
            });
            toast.success(newStatus ? 'Pertanyaan diaktifkan' : 'Pertanyaan dinonaktifkan');
        } catch (error) {
            // Revert
            setFaqs(faqs.map(f => f.id === faq.id ? { ...f, isActive: !faq.isActive } : f));
            toast.error('Gagal update status.');
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Daftar Pertanyaan (FAQ)</h3>
                    <p className="text-sm text-gray-500">Kelola pertanyaan yang sering diajukan pengguna.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Pertanyaan
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari pertanyaan..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    />
                </div>
            </div>

            {/* FAQ List */}
            <div className="divide-y divide-gray-100">
                {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq) => (
                        <div key={faq.id} className="p-4 hover:bg-gray-50 transition flex items-start justify-between group">
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-gray-900">{faq.question}</h4>
                                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${faq.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {faq.isActive ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2">{faq.answer}</p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => toggleActive(faq)}
                                    className={`p-2 rounded-lg transition ${faq.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                    title={faq.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                    {faq.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => openModal(faq)}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                    title="Edit"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(faq.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Hapus"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        Tidak ada pertanyaan ditemukan.
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-semibold text-gray-900">{editingFaq ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}</h3>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Pertanyaan</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.question}
                                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                        placeholder="Contoh: Bagaimana cara topup?"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Jawaban</label>
                                    <div className="prose-sm">
                                        <RichTextEditor
                                            content={formData.answer}
                                            onChange={(content) => setFormData({ ...formData, answer: content })}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
