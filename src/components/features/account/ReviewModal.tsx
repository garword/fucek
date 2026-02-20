'use client';

import { useState } from 'react';
import { Star, X, Loader2, Send, Sparkles, MessageCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    variantName: string;
    productId: string;
    existingRating?: number;
    existingComment?: string;
    onSuccess?: () => void;
}

export default function ReviewModal({
    isOpen,
    onClose,
    productName,
    variantName,
    productId,
    existingRating = 0,
    existingComment = '',
    onSuccess
}: ReviewModalProps) {
    const { showToast } = useToast();
    const [rating, setRating] = useState(existingRating);
    const [comment, setComment] = useState(existingComment);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            showToast('Pilih rating bintang terlebih dahulu', 'error');
            return;
        }
        if (comment.length < 5) {
            showToast('Komentar minimal 5 karakter', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    rating,
                    comment
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Gagal mengirim ulasan');
            }

            showToast('Ulasan berhasil dikirim!', 'success');
            if (onSuccess) onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            showToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden scale-100 transition-all animate-in zoom-in-95 duration-200">
                {/* Decorative Header */}
                <div className="h-32 bg-gradient-to-br from-green-500 to-emerald-600 relative">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20"></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
                    <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400/30 rounded-full blur-xl"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute bottom-6 left-6 text-white">
                        <div className="flex items-center gap-2 text-green-100 text-xs font-bold uppercase tracking-wider mb-1">
                            <Sparkles size={14} className="text-yellow-300" />
                            Beri Ulasan
                        </div>
                        <h3 className="text-xl font-black leading-tight drop-shadow-md">{productName}</h3>
                        <p className="text-green-100 text-sm font-medium opacity-90">{variantName}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Rating Kepuasan</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                    className="transition-transform hover:scale-110 active:scale-95 p-1"
                                >
                                    <Star
                                        size={36}
                                        className={`transition-colors duration-200 ${star <= (hoverRating || rating)
                                                ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                                                : 'fill-gray-100 text-gray-200'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-sm font-medium text-green-600 h-5">
                            {rating === 5 ? 'Sangat Puas! 😍' :
                                rating === 4 ? 'Puas 😊' :
                                    rating === 3 ? 'Cukup 🙂' :
                                        rating === 2 ? 'Kurang 😕' :
                                            rating === 1 ? 'Kecewa 😞' : ''}
                        </p>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <MessageCircle size={16} className="text-green-500" />
                            Komentar Anda
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Ceritakan pengalamanmu... (Minimal 5 karakter)"
                            className="w-full min-h-[120px] p-4 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:bg-white transition-all text-sm resize-none"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || rating === 0 || comment.length < 5}
                        className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                        {isSubmitting ? 'Mengirim...' : 'Kirim Ulasan'}
                    </button>

                    <p className="text-center text-xs text-gray-400">
                        Ulasan Anda membantu pembeli lain. Terima kasih!
                    </p>
                </form>
            </div>
        </div>
    );
}
