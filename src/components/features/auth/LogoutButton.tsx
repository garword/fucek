
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function LogoutButton() {
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleLogout() {
        setIsLoading(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.refresh();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed', error);
            setIsLoading(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="text-gray-600 hover:text-red-600 p-2 transition-colors rounded-lg hover:bg-red-50"
                title="Logout"
            >
                <LogOut className="h-6 w-6" />
            </button>

            {/* Confirmation Modal via Portal */}
            {mounted && showConfirm && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative transform scale-100 animate-in zoom-in-95 slide-in-from-bottom-5 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-red-50 dark:ring-red-900/10">
                                <LogOut size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Yakin ingin keluar?
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                                Keamanan akun tetap terjaga. Anda perlu login kembali untuk mengakses data pribadi.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    disabled={isLoading}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200/50 dark:shadow-none transition-all flex items-center justify-center gap-2"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Ya, Keluar'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
