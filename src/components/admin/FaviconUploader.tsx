'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function FaviconUploader() {
    const { showToast } = useToast();
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    const processImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context not available'));

                // Set fixed size for favicon
                const size = 256;
                canvas.width = size;
                canvas.height = size;

                // Smart Crop Logic: Center Square
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;

                // Draw centered crop and resize
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob failed'));
                }, 'image/png'); // Can save as PNG, browser handles it fine usually even if renamed .ico
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setOriginalFile(file);
        // Preview processed immediately
        try {
            const processedBlob = await processImage(file);
            const processedUrl = URL.createObjectURL(processedBlob);
            setPreview(processedUrl);
        } catch (err) {
            console.error(err);
            showToast('Failed to process image', 'error');
        }
    };

    const handleSave = async () => {
        if (!originalFile) return;
        setLoading(true);

        try {
            const processedBlob = await processImage(originalFile);

            // Create form data
            const formData = new FormData();
            // Append as favicon.ico
            // Note: We send PNG blob but name it .ico. Modern browsers are okay with PNG buffer in .ico file.
            // Or ideally use a library to encodeto ICO, but for "smart logic" simply cropping and resizing to 256 PNG is huge improvement.
            // Let's stick to PNG buffer named .ico for simplicity, or just .ico if backend renames. The backend writes to `src/app/favicon.ico`.
            // NextJS app router serves favicon.ico from root.
            const file = new File([processedBlob], 'favicon.ico', { type: 'image/png' });
            formData.append('file', file);

            const res = await fetch('/api/admin/design/favicon', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                showToast('Favicon updated! Logic is smart.', 'success');
                // Force reload favicon in browser (hacky but might help)
                const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                if (link) {
                    link.href = '/favicon.ico?v=' + new Date().getTime();
                } else {
                    // Create if not exists ? usually layout has it.
                }
                // Refresh page to see effect?
                window.location.reload();
            } else {
                showToast('Failed to update favicon', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error uploading favicon', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <ImageIcon className="w-5 h-5" />
                </div>
                Website Identity (Favicon)
            </h3>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="relative group shrink-0">
                    <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
                        {/* Show current if no preview */}
                        <img
                            src={preview || "/favicon.ico"}
                            alt="Favicon Preview"
                            className="w-16 h-16 object-contain"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                    </div>
                    <div className="absolute -bottom-2 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        256px
                    </div>
                </div>

                <div className="flex-1 space-y-4 w-full">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Upload Logo</p>
                        <p className="text-xs text-gray-500 mb-3">
                            Format: PNG, JPG. Sistem akan otomatis <b>Crop Tengah</b> & <b>Resize</b> ke 256x256px (High Quality).
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-xl file:border-0
                                file:text-xs file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700
                                hover:file:bg-indigo-100
                                cursor-pointer
                                border border-gray-200 rounded-xl
                            "
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={!preview || loading}
                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-gray-200"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {loading ? 'Processing...' : 'Update Identity'}
                        </button>
                    </div>
                </div>
            </div>

            {preview && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs flex items-center gap-2 border border-blue-100">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Pratinjau di atas sudah hasil <b>Smart Crop</b>. Klik Update untuk menerapkan.</span>
                </div>
            )}
        </div>
    );
}
