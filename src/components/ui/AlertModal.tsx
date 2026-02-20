import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
}

export default function AlertModal({ isOpen, onClose, title, message, type = 'info' }: AlertModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-12 h-12 text-green-500" />;
            case 'error': return <XCircle className="w-12 h-12 text-red-500" />;
            default: return <AlertCircle className="w-12 h-12 text-blue-500" />;
        }
    };

    const getColorClass = () => {
        switch (type) {
            case 'success': return 'bg-green-50 text-green-700';
            case 'error': return 'bg-red-50 text-red-700';
            default: return 'bg-blue-50 text-blue-700';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center space-y-4">
                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${getColorClass()} mb-2`}>
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                        {title}
                    </h3>

                    <p className="text-gray-500 font-medium">
                        {message}
                    </p>
                </div>

                <div className="p-6 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl"
                    >
                        OK, Mengerti
                    </button>
                </div>
            </div>
        </div>
    );
}
