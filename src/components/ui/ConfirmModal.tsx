import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    loading = false,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    type = 'info'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const getColorClass = () => {
        switch (type) {
            case 'danger': return 'bg-red-50 text-red-600';
            case 'warning': return 'bg-yellow-50 text-yellow-600';
            default: return 'bg-blue-50 text-blue-600';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center space-y-4">
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${getColorClass()} mb-2`}>
                        <AlertTriangle className="w-8 h-8" />
                    </div>

                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                        {title}
                    </h3>

                    <p className="text-gray-500 font-medium text-sm">
                        {message}
                    </p>
                </div>

                <div className="p-6 pt-0 grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`w-full text-white py-3 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg
                            ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30' : 'bg-gray-900 hover:bg-gray-800 hover:shadow-gray-500/30'}`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Memproses...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
