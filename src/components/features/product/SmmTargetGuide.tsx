'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Search, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SMM_GUIDE_DATA } from '@/lib/smm-guide-data';
import { cn } from '@/lib/utils'; // Assuming you have utility for class merging

export default function SmmTargetGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPlatform, setExpandedPlatform] = useState<string | null>('Instagram'); // Default open first
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(id);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // Filter data
    const filteredData = SMM_GUIDE_DATA.filter(platform =>
        platform.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
        platform.items.some(item => item.type.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-green-100 dark:border-slate-800"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-500">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Panduan Target</h2>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Format pengisian target pesanan</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari platform atau layanan..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                                {filteredData.length > 0 ? (
                                    filteredData.map((data, idx) => (
                                        <div key={idx} className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                            {/* Accordion Header */}
                                            <button
                                                onClick={() => setExpandedPlatform(expandedPlatform === data.platform ? null : data.platform)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("text-xl", data.color)}>
                                                        <FontAwesomeIcon icon={data.icon} />
                                                    </div>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">{data.platform}</span>
                                                </div>
                                                {expandedPlatform === data.platform ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>

                                            {/* Accordion Content */}
                                            <AnimatePresence>
                                                {(expandedPlatform === data.platform || searchTerm) && (
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: "auto" }}
                                                        exit={{ height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="p-4 pt-0 space-y-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5">
                                                            {data.items.map((item, itemIdx) => {
                                                                const uniqueId = `${data.platform}-${itemIdx}`;
                                                                const isCopied = copiedIndex === uniqueId;

                                                                return (
                                                                    <div key={itemIdx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                                                                        <div className="flex items-start justify-between gap-3 mb-2">
                                                                            <div>
                                                                                <p className="font-bold text-xs text-green-600 dark:text-green-500 uppercase tracking-wide mb-1">
                                                                                    {item.type}
                                                                                </p>
                                                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                                    {item.desc}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        {/* Example Box */}
                                                                        <div className="mt-2 bg-gray-50 dark:bg-black/20 rounded-lg p-2.5 flex items-center justify-between gap-2 border border-gray-200 dark:border-white/10 group">
                                                                            <code className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">
                                                                                {item.example}
                                                                            </code>
                                                                            <button
                                                                                onClick={() => handleCopy(item.example, uniqueId)}
                                                                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
                                                                                title="Salin contoh"
                                                                            >
                                                                                {isCopied ? (
                                                                                    <Check className="w-4 h-4 text-green-500" />
                                                                                ) : (
                                                                                    <Copy className="w-4 h-4" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>Tidak ada hasil pencarian untuk "{searchTerm}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Hint */}
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-t border-yellow-100 dark:border-yellow-900/20 text-xs text-yellow-800 dark:text-yellow-200 text-center">
                                Pastikan target sesuai format agar pesanan diproses otomatis.
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
