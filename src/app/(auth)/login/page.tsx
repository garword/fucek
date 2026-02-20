'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Turnstile from '@/components/ui/Turnstile';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [captchaValue, setCaptchaValue] = useState<string | null>(null);
    const [siteKey, setSiteKey] = useState<string>('');

    useEffect(() => {
        // Fetch Site Key
        fetch('/api/auth/config')
            .then(res => res.json())
            .then(data => {
                if (data.turnstileSiteKey) {
                    setSiteKey(data.turnstileSiteKey);
                }
            })
            .catch(console.error);
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!captchaValue) {
            setError('Please complete the security check.');
            setLoading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            router.push(next);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="hidden lg:block absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="hidden lg:block absolute bottom-0 right-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-[30px] shadow-2xl overflow-hidden relative z-10 p-5 sm:p-10 border border-gray-100 dark:border-white/10"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Masuk ke Akun</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                        Mulai perjalanan belanja digital Anda
                    </p>
                </div>

                {/* Google Button (Top) */}
                <button
                    type="button"
                    onClick={() => window.location.href = '/api/auth/google'}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
                        <span className="px-4 bg-white dark:bg-slate-900 text-gray-400 font-bold">Atau masuk dengan Email</span>
                    </div>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-900 dark:text-gray-200 ml-1">Email</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-500 transition-colors">
                                <Mail className="h-4 w-4" />
                            </div>
                            <input
                                name="email"
                                type="email"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                placeholder="namamu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-900 dark:text-gray-200 ml-1">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-500 transition-colors">
                                <Lock className="h-4 w-4" />
                            </div>
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                className="block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-xs font-bold text-green-600 hover:text-green-500 transition-colors">
                            Lupa Password?
                        </Link>
                    </div>

                    {/* Turnstile */}
                    <div className="pb-2 w-full overflow-hidden rounded-xl bg-transparent">
                        <Turnstile
                            siteKey={siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAAkFi7_gK7_gK7_g'}
                            onVerify={setCaptchaValue}
                        />
                    </div>

                    {error && (
                        <AnimatePresence>
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-center"
                            >
                                <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Masuk'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Belum punya akun?{' '}
                        <Link href="/register" className="font-bold text-green-600 hover:text-green-500 transition-colors">
                            Daftar di sini
                        </Link>
                    </p>
                </div>
            </motion.div>

            <div className="absolute bottom-6 w-full text-center space-x-6 z-10">
                <Link href="#" className="text-[10px] text-gray-400 hover:text-white/60 font-medium transition-colors">Privacy Policy</Link>
                <Link href="#" className="text-[10px] text-gray-400 hover:text-white/60 font-medium transition-colors">Terms of Service</Link>
                <Link href="#" className="text-[10px] text-gray-400 hover:text-white/60 font-medium transition-colors">Contact</Link>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen bg-[#00A950]"><Loader2 className="animate-spin h-8 w-8 text-white" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
