'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, User, Mail, Lock, AtSign, ArrowRight, ShieldCheck, Eye, EyeOff, CheckCircle2, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Turnstile from '@/components/ui/Turnstile';

export default function RegisterPage() {
    const router = useRouter();

    // Form State
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Fields
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: ''
    });

    // OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const [timer, setTimer] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [captchaValue, setCaptchaValue] = useState<string | null>(null);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- LOGIC: Request OTP ---
    async function requestOtp() {
        if (!formData.email) {
            setError('Masukkan alamat email terlebih dahulu.');
            return;
        }
        if (!captchaValue) {
            setError('Harap selesaikan verifikasi keamanan (Captcha) di bawah.');
            return;
        }

        setOtpLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    turnstileToken: captchaValue
                }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Gagal mengirim OTP');

            setOtpSent(true);
            setTimer(60);
            setTimeout(() => inputRefs.current[0]?.focus(), 500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setOtpLoading(false);
        }
    }

    // --- LOGIC: Final Registration ---
    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();

        if (!otpSent) {
            setError("Silakan klik 'Kirim Kode OTP' di sebelah email Anda.");
            return;
        }
        const otpCode = otp.join("");
        if (otpCode.length !== 6) {
            setError("Masukkan 6 digit kode OTP sepenuhnya.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/complete-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    otp: otpCode
                }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Registrasi gagal');

            router.push('/');
            router.refresh();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Turnstile Key State
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

    // OTP Inputs logic
    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    };
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").trim();
        if (/^\d{6}$/.test(data)) {
            setOtp(data.split(""));
            inputRefs.current[5]?.focus();
        }
    };


    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">

            <div className="relative z-10 w-full max-w-[500px]">
                <div className="bg-white dark:bg-slate-900 rounded-[30px] shadow-2xl p-5 sm:p-10 border border-gray-100 dark:border-white/10">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Buat Akun Baru</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                            Mulai perjalanan belanja digital Anda
                        </p>
                    </div>

                    {/* Google Button */}
                    <button
                        type="button"
                        onClick={() => window.location.href = '/api/auth/google'}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm mb-6"
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
                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
                            <span className="px-4 bg-white dark:bg-slate-900 text-gray-400 font-bold">Atau daftar dengan Email</span>
                        </div>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">

                        {/* Name & Username */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-900 dark:text-gray-200 ml-1">Nama Lengkap</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-500 transition-colors">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <input
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                        placeholder="Jhon Doe"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-900 dark:text-gray-200 ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-500 transition-colors">
                                        <AtSign className="h-4 w-4" />
                                    </div>
                                    <input
                                        name="username"
                                        required
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                        placeholder="jhondoe"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email & OTP Button */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-900 dark:text-gray-200 ml-1">Email</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1 group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-500 transition-colors">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        disabled={otpSent}
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-70"
                                        placeholder="namamu@email.com"
                                    />
                                </div>

                                {!otpSent ? (
                                    <button
                                        type="button"
                                        onClick={requestOtp}
                                        disabled={otpLoading || !formData.email}
                                        className="w-full sm:w-auto px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold whitespace-nowrap hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {otpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Kirim Kode OTP &gt;</span>}
                                    </button>
                                ) : (
                                    <div className="w-full sm:w-auto flex items-center px-4 py-3 sm:py-0 bg-green-50 text-green-600 rounded-xl border border-green-100 text-xs font-bold gap-1 min-w-[120px] justify-center">
                                        <CheckCircle2 className="w-4 h-4" /> Terkirim
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Password */}
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
                                    value={formData.password}
                                    onChange={handleInputChange}
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

                        {/* OTP SECTION (Animated) */}
                        <AnimatePresence>
                            {otpSent && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 pt-4"
                                >
                                    <div className="text-center space-y-2">
                                        <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">KODE VERIFIKASI EMAIL</h4>
                                        <div className="flex justify-between gap-2 max-w-[320px] mx-auto">
                                            {otp.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={(el) => { inputRefs.current[index] = el }}
                                                    type="text"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                    onPaste={handleOtpPaste}
                                                    className="w-10 h-12 text-center text-xl font-bold border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-0 transition-all caret-green-500"
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400">Kode 6 digit telah dikirim ke email Anda</p>
                                    </div>

                                    <div className="flex justify-center">
                                        {timer > 0 ? (
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                                Tidak menerima kode? Kirim ulang dalam <span className="font-bold text-gray-600 dark:text-gray-300">00:{timer.toString().padStart(2, '0')}</span>
                                            </p>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={requestOtp}
                                                className="text-xs font-bold text-green-600 hover:text-green-500 underline decoration-dashed underline-offset-4"
                                            >
                                                Kirim ulang kode sekarang
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Turnstile / Security Widget */}
                        <div className="py-2 w-full max-w-full overflow-hidden rounded-xl bg-transparent flex justify-center sm:justify-start">
                            <Turnstile
                                siteKey={siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAAkFi7_gK7_gK7_g'}
                                onVerify={setCaptchaValue}
                            />
                        </div>

                        {/* Error Display */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-center"
                                >
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !otpSent}
                            className="w-full py-4 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    Verifikasi & Daftar <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sudah punya akun?{' '}
                            <Link href="/login" className="font-bold text-green-600 hover:text-green-500 transition-colors">
                                Masuk disini
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer Links (Outside Card) */}
                <div className="mt-8 flex justify-center gap-6 text-[10px] text-gray-400 font-medium">
                    <Link href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
                    <Link href="#" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
                    <Link href="#" className="hover:text-gray-600 transition-colors">Contact</Link>
                </div>
            </div>

            {/* Chat Widget (Bottom Right) */}
            {/* <div className="fixed bottom-6 right-6 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
             </div> */}
        </div>
    );
}
