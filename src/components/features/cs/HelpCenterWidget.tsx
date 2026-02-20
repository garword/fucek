'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, X, ChevronDown, ChevronUp, Send, User, HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp, faTelegram } from '@fortawesome/free-brands-svg-icons';

interface Faq {
    id: string;
    question: string;
    answer: string;
}

interface HelpCenterWidgetProps {
    whatsapp: string;
    telegram: string;
    faqs: Faq[];
}

export default function HelpCenterWidget({ whatsapp, telegram, faqs }: HelpCenterWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeFaq, setActiveFaq] = useState<string | null>(null);

    const toggleFaq = (id: string) => {
        setActiveFaq(activeFaq === id ? null : id);
    };

    const handleWhatsapp = () => {
        if (!whatsapp) return;
        window.open(`https://wa.me/${whatsapp}`, '_blank');
    };

    const handleTelegram = () => {
        if (!telegram) return;
        window.open(`https://t.me/${telegram}`, '_blank');
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50 p-4 rounded-full shadow-xl text-white transition-all duration-300",
                    "bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-emerald-500/40 border-2 border-white/20",
                    isOpen ? "opacity-0 pointer-events-none translate-y-10" : "opacity-100 translate-y-0"
                )}
            >
                <div className="relative flex items-center justify-center">
                    <MessageCircle className="w-7 h-7" strokeWidth={2.5} />
                    {/* Pulsing Dot */}
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
                    </span>
                </div>
            </motion.button>

            {/* Modal / Widget */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop (Mobile) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 sm:hidden"
                        />

                        {/* Widget Container */}
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className={cn(
                                "fixed z-50 bg-white shadow-2xl overflow-hidden flex flex-col font-sans",
                                "bottom-0 left-0 right-0 top-20 rounded-t-3xl sm:top-auto sm:left-auto sm:right-6 sm:bottom-24 sm:w-[400px] sm:max-h-[650px] sm:rounded-3xl border border-gray-100 ring-1 ring-black/5"
                            )}
                        >
                            {/* Decorative Header Background */}
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-emerald-500 to-green-600 rounded-b-[50%] scale-x-150 translate-y-[-50%] opacity-10"></div>

                            {/* Header */}
                            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 p-6 text-white flex justify-between items-start shrink-0">
                                {/* Decorative Circles */}
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                            <HelpCircle className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-300/30 text-emerald-50">Online</span>
                                    </div>
                                    <h3 className="font-bold text-xl tracking-tight">Pusat Bantuan</h3>
                                    <p className="text-emerald-100 text-sm mt-1 leading-relaxed max-w-[280px]">
                                        Temukan jawaban cepat atau hubungi tim support kami.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md border border-white/10"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 space-y-5 relative">
                                {/* FAQ Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pertanyaan Umum</h4>
                                    </div>

                                    {faqs.length > 0 ? (
                                        <div className="space-y-3">
                                            {faqs.map((faq) => (
                                                <motion.div
                                                    key={faq.id}
                                                    initial={false}
                                                    className={cn(
                                                        "bg-white rounded-xl overflow-hidden shadow-sm border transition-all duration-200",
                                                        activeFaq === faq.id
                                                            ? "border-emerald-200 shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                                                            : "border-gray-100 hover:border-gray-200 hover:shadow-md"
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => toggleFaq(faq.id)}
                                                        className="w-full flex items-start justify-between p-4 text-left gap-4"
                                                    >
                                                        <span className={cn(
                                                            "font-medium text-sm transition-colors duration-200 leading-snug",
                                                            activeFaq === faq.id ? "text-emerald-700" : "text-gray-700"
                                                        )}>
                                                            {faq.question}
                                                        </span>
                                                        <div className={cn(
                                                            "p-1 rounded-full transition-colors duration-200 shrink-0",
                                                            activeFaq === faq.id ? "bg-emerald-100/50 text-emerald-600" : "bg-gray-50 text-gray-400"
                                                        )}>
                                                            {activeFaq === faq.id ? (
                                                                <ChevronUp className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                    </button>
                                                    <AnimatePresence>
                                                        {activeFaq === faq.id && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                            >
                                                                <div className="px-4 pb-4 pt-0">
                                                                    <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-100 to-transparent mb-3"></div>
                                                                    <div className="text-sm text-gray-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50">
                                                                        <div
                                                                            className="prose prose-sm prose-emerald max-w-none [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
                                                                            dangerouslySetInnerHTML={{ __html: faq.answer }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 bg-white rounded-2xl border border-dashed border-gray-200 text-center">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                <HelpCircle className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">Belum ada pertanyaan</p>
                                            <p className="text-xs text-gray-500 mt-1">FAQ akan segera ditambahkan di sini.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer - Contact Buttons */}
                            <div className="p-5 bg-white border-t border-gray-100 shrink-0 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] z-20">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <span className="h-px w-8 bg-gray-200"></span>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Butuh Bantuan Langsung?</p>
                                    <span className="h-px w-8 bg-gray-200"></span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleWhatsapp}
                                        className="group relative overflow-hidden flex items-center justify-center gap-3 p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white transition-all duration-300 border border-emerald-200 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30"
                                    >
                                        <div className="bg-white/80 p-1.5 rounded-full group-hover:bg-white/20 transition-colors">
                                            <FontAwesomeIcon icon={faWhatsapp} className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={handleTelegram}
                                        className="group relative overflow-hidden flex items-center justify-center gap-3 p-3.5 rounded-xl bg-sky-50 hover:bg-sky-500 text-sky-700 hover:text-white transition-all duration-300 border border-sky-200 hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/30"
                                    >
                                        <div className="bg-white/80 p-1.5 rounded-full group-hover:bg-white/20 transition-colors">
                                            <FontAwesomeIcon icon={faTelegram} className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold">Telegram</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
