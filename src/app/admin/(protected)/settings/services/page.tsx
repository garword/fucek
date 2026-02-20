'use client';

import { useState, useEffect } from 'react';
import { Save, Gamepad2, Smartphone, Globe, Tag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';

const SERVICES = [
    { id: 'GAME', label: 'Topup Game', icon: Gamepad2, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'DIGITAL', label: 'Produk Digital', icon: Tag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'PULSA', label: 'Pulsa & Data', icon: Smartphone, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'SOSMED', label: 'Social Media', icon: Globe, color: 'text-pink-600', bg: 'bg-pink-100' },
];

export default function ServicesPage() {
    const [status, setStatus] = useState<Record<string, boolean>>({
        GAME: true, DIGITAL: true, PULSA: true, SOSMED: true
    });
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/settings/services');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleService = async (id: string) => {
        const newStatus = { ...status, [id]: !status[id] };
        setStatus(newStatus); // Optimistic

        try {
            const res = await fetch('/api/admin/settings/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStatus)
            });

            if (res.ok) {
                showToast(`Layanan ${id} ${newStatus[id] ? 'Diaktifkan' : 'Dinonaktifkan'}`, 'success');
            } else {
                setStatus(status); // Revert
                showToast('Gagal mengubah status', 'error');
            }
        } catch (error) {
            setStatus(status); // Revert
            showToast('Terjadi kesalahan', 'error');
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Status Layanan Utama</h1>
                    <p className="text-gray-300 max-w-xl">
                        Kontrol visibilitas untuk kategori utama. Jika dimatikan, semua produk dalam kategori tersebut tidak akan bisa dibeli dan halaman akan menampilkan pesan offline.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {SERVICES.map((service) => {
                    const isActive = status[service.id];
                    const Icon = service.icon;

                    return (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative overflow-hidden rounded-3xl border-2 transition-all duration-300 ${isActive
                                    ? 'bg-white border-gray-100 shadow-lg hover:shadow-xl'
                                    : 'bg-gray-50 border-gray-200 opacity-90 grayscale-[0.5]'
                                }`}
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${service.bg} ${service.color}`}>
                                        <Icon size={28} />
                                    </div>
                                    <button
                                        onClick={() => toggleService(service.id)}
                                        className={`w-12 h-7 rounded-full transition-colors duration-300 flex items-center px-1 ${isActive ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isActive ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{service.label}</h3>
                                    <p className={`text-sm font-medium mt-1 flex items-center gap-2 ${isActive ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                        {isActive ? (
                                            <>
                                                <CheckCircle2 size={16} />
                                                Layanan Aktif
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle size={16} />
                                                Layanan Offline
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Decorative Bottom Bar */}
                            <div className={`h-1.5 w-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
