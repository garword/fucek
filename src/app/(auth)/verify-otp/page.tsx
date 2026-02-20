'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function VerifyOtpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailParam = searchParams.get('email') || '';

    const [email, setEmail] = useState(emailParam);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // OTP INPUT LOGIC
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value && index < 5 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").trim();
        if (!/^\d{6}$/.test(data)) return;

        const newOtp = data.split("");
        setOtp(newOtp);
        inputRefs.current[5]?.focus();
    };

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        const otpCode = otp.join("");
        if (otpCode.length !== 6) {
            setError("Please enter the full 6-digit code");
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            setMessage('Verification successful! Redirecting...');
            setTimeout(() => {
                router.push('/');
                router.refresh();
            }, 1000);
        } catch (err: any) {
            setError(err.message);
            setOtp(new Array(6).fill(""));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        setResending(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Resend failed');
            }

            setMessage(data.message || 'New code sent to your email.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResending(false);
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#00A950] relative overflow-hidden p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 sm:p-10 border border-white/20"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl mb-6">
                        <Mail className="text-green-600 dark:text-green-400 w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Check Email</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Code sent to <span className="font-bold text-gray-900 dark:text-white">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-8">
                    <div className="flex justify-between gap-2">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el }}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all caret-green-500 shadow-sm"
                            />
                        ))}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 font-bold"
                        >
                            {error}
                        </motion.div>
                    )}
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-green-600 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30 font-bold"
                        >
                            {message}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || otp.join("").length !== 6}
                        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-green-500/30 h-12"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirm Code'}
                    </button>

                    <div className="text-center text-sm text-gray-500">
                        <div className="flex flex-col gap-4">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resending}
                                className="font-bold text-green-600 hover:text-green-500 disabled:opacity-50"
                            >
                                {resending ? 'Sending...' : 'Resend Code'}
                            </button>
                            <Link href="/login" className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
                            </Link>
                        </div>
                    </div>
                </form>
            </motion.div>
            <div className="absolute bottom-6 text-center w-full z-10 text-white/40 text-xs">
                &copy; {new Date().getFullYear()} Store. All rights reserved.
            </div>
        </div>
    );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen bg-[#00A950]"><Loader2 className="animate-spin h-8 w-8 text-white" /></div>}>
            <VerifyOtpForm />
        </Suspense>
    );
}
