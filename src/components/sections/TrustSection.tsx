import { ShieldCheck, Zap, Headset } from 'lucide-react';

const TrustSection = () => {
    return (
        <section className="py-12 px-4 md:px-0 relative z-10 mt-12 mb-12">
            <div className="container mx-auto max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Feature 1: Proses Instan */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300">
                        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                            <Zap className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Proses Instan</h3>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                            Pesanan diproses otomatis oleh sistem dalam hitungan detik setelah pembayaran.
                        </p>
                    </div>

                    {/* Feature 2: Aman & Terpercaya */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300">
                        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                            <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Aman & Terpercaya</h3>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                            Transaksi dijamin aman dengan enkripsi data dan garansi uang kembali.
                        </p>
                    </div>

                    {/* Feature 3: Layanan 24/7 */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300">
                        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                            <Headset className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Layanan 24/7</h3>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                            Layanan pelanggan siap membantu kendala transaksi Anda kapan saja.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TrustSection;
