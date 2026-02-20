
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean } | null>(null);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => {
            setToast((prev) => (prev ? { ...prev, visible: false } : null));
        }, 3000); // Hide after 3s
        setTimeout(() => {
            setToast(null);
        }, 3300); // Remove from DOM after animation
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div
                    className={cn(
                        "fixed top-24 right-4 z-[9999] flex items-center gap-3 px-6 py-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border backdrop-blur-md transition-all duration-300 transform",
                        toast.visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none",
                        toast.type === 'success' && "bg-white/80 border-green-200 text-green-800",
                        toast.type === 'error' && "bg-white/80 border-red-200 text-red-800",
                        toast.type === 'info' && "bg-white/80 border-blue-200 text-blue-800"
                    )}
                >
                    {toast.type === 'success' && <CheckCircle className="w-6 h-6 text-green-500 fill-green-100" />}
                    {toast.type === 'error' && <XCircle className="w-6 h-6 text-red-500 fill-red-100" />}
                    {toast.type === 'info' && <Info className="w-6 h-6 text-blue-500 fill-blue-100" />}

                    <div>
                        <p className="font-bold text-sm">
                            {toast.type === 'success' ? 'Berhasil' : toast.type === 'error' ? 'Gagal' : 'Info'}
                        </p>
                        <p className="text-xs font-medium opacity-90">{toast.message}</p>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
