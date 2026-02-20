'use client';

import FaviconUploader from '@/components/admin/FaviconUploader';
import LogoEditor from '@/components/admin/LogoEditor';

export default function IdentityPage() {
    return (
        <div className="space-y-8 relative">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>

            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">Brand Identity</h1>
                <p className="text-slate-400 mt-2">Update logo dan identitas visual website.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LogoEditor />
                <FaviconUploader />

                {/* Future: OpenGraph Image, etc. */}
                <div className="glass-card bg-slate-900/50 border border-dashed border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center col-span-1 lg:col-span-2 group hover:border-emerald-500/30 transition-colors">
                    <p className="text-slate-500 font-medium group-hover:text-emerald-400 transition-colors">Coming Soon: Open Graph Cards</p>
                    <p className="text-xs text-slate-600 mt-1">Pengaturan gambar thumbnail saat share link di sosmed</p>
                </div>
            </div>
        </div>
    );
}
