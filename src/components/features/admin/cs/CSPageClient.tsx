'use client';

import { useState } from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import ContactSettingsForm from './ContactSettingsForm';
import FaqManager from './FaqManager';

interface CSPageClientProps {
    initialWhatsapp: string;
    initialTelegram: string;
    initialFaqs: any[];
}

export default function CSPageClient({ initialWhatsapp, initialTelegram, initialFaqs }: CSPageClientProps) {
    const [activeTab, setActiveTab] = useState<'contact' | 'faq'>('contact');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pengaturan CS & Bantuan</h1>
                    <p className="text-gray-500">Kelola kontak Customer Service dan daftar pertanyaan bantuan (FAQ).</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('contact')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'contact'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Phone className="w-4 h-4" />
                    Kontak CS
                </button>
                <button
                    onClick={() => setActiveTab('faq')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'faq'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    Manajemen FAQ
                </button>
            </div>

            {/* Content */}
            <div className="transition-all duration-300">
                {activeTab === 'contact' ? (
                    <ContactSettingsForm
                        initialWhatsapp={initialWhatsapp}
                        initialTelegram={initialTelegram}
                    />
                ) : (
                    <FaqManager initialFaqs={initialFaqs} />
                )}
            </div>
        </div>
    );
}
