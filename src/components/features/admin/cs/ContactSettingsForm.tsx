'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { MessageCircle, Phone, Save, Send } from 'lucide-react';

interface ContactSettingsFormProps {
    initialWhatsapp: string;
    initialTelegram: string;
}

export default function ContactSettingsForm({ initialWhatsapp, initialTelegram }: ContactSettingsFormProps) {
    const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
    const [telegram, setTelegram] = useState(initialTelegram);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Save WhatsApp
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'CS_WHATSAPP',
                    value: whatsapp,
                    description: 'Nomor WhatsApp Customer Service'
                })
            });

            // Save Telegram
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'CS_TELEGRAM',
                    value: telegram,
                    description: 'Username Telegram Customer Service'
                })
            });

            toast.success('Kontak CS berhasil diperbarui!');
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan pengaturan.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Kontak Customer Service</h3>
                <p className="text-sm text-gray-500 mb-6">Atur nomor WhatsApp dan username Telegram agar pengguna mudah menghubungi Anda.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* WhatsApp Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-emerald-600" />
                            WhatsApp Number
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+</span>
                            <input
                                type="text"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="628123456789"
                                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <p className="text-xs text-gray-400">Gunakan format internasional tanpa '+', contoh: 628123456789</p>
                    </div>

                    {/* Telegram Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Send className="w-4 h-4 text-sky-500" />
                            Telegram Username
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
                            <input
                                type="text"
                                value={telegram}
                                onChange={(e) => setTelegram(e.target.value)}
                                placeholder="username_cs"
                                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <p className="text-xs text-gray-400">Masukkan username tanpa '@', contoh: market_cs</p>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    Simpan Perubahan
                </button>
            </div>
        </form>
    );
}
