'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';
import { formatDateTimeWIB } from '@/lib/date-utils';
import QRCode from 'qrcode';
import {
    User, Zap, Info, Loader2, CheckCircle, XCircle, Copy, Clock,
    FileText, ShieldCheck, ShoppingCart, Home, LinkIcon, Eye, EyeOff
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faInstagram, faTiktok, faYoutube, faFacebook, faTwitter,
    faSpotify, faTwitch, faDiscord, faTelegram, faLinkedin
} from '@fortawesome/free-brands-svg-icons';
interface InvoiceClientProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderConfig: any;
    canViewSensitiveData: boolean;
    walletIconUrl?: string | null;
}

export default function InvoiceClient({ orderConfig, canViewSensitiveData, walletIconUrl }: InvoiceClientProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [order, setOrder] = useState(orderConfig);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [status, setStatus] = useState(orderConfig.status);
    const [copied, setCopied] = useState('');
    const [imageError, setImageError] = useState<Record<string, boolean>>({});


    const isWalletTopup = order.orderItems[0]?.variant?.product?.category?.type === 'WALLET';
    // Robust Digital Check
    const isDigital = order.orderItems.some((item: any) => {
        const prod = item.variant?.product;
        // Strictly check category which implies "Digital"
        return prod?.category?.type === 'VOUCHER' || prod?.category?.type === 'DIGITAL';
    });
    const totalQuantity = order.orderItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const showBulkDownload = isDigital && totalQuantity > 3;

    // Helper to parse SN string
    const parseAccountLine = (line: string) => {
        if (!line.includes('|') && !line.includes(':')) {
            return [{ value: line }];
        }
        return line.split('|').map(part => {
            const trimmed = part.trim();
            if (trimmed.includes(':')) {
                const splitIndex = trimmed.indexOf(':');
                const key = trimmed.substring(0, splitIndex).trim();
                const val = trimmed.substring(splitIndex + 1).trim();
                return { label: key, value: val };
            }
            return { value: trimmed };
        }).filter(item => item.value); // Filter empty
    };

    const handleDownloadTxt = () => {
        let content = `========================================================================\n`;
        content += `                      TERIMA KASIH TELAH BERBELANJA           \n`;
        content += `                       INVOICE: ${order.invoiceCode}\n`;
        content += `                Tanggal: ${formatDateTimeWIB(new Date(order.createdAt))}\n`;
        content += `========================================================================\n\n\n`;

        order.orderItems.forEach((item: any, index: number) => {
            const snList = item.sn ? item.sn.split('\n').filter((l: string) => l.trim().length > 0) : [];
            const durationDays = item.variant?.durationDays || 30;
            const createdDate = new Date(order.createdAt);
            const expiryDate = new Date(createdDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
            const expiryString = expiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            content += `[ ITEM KE-${index + 1} ]\n`;
            content += `${item.productName.toUpperCase()}\n`;
            content += `${item.variantName.toUpperCase()}\n`;
            content += `------------------------------------------------------------------------\n`;
            content += `Masa Aktif Sampai : ${expiryString}\n`;
            content += `Jenis Garansi     : Sesuai Deskripsi\n`;
            content += `------------------------------------------------------------------------\n\n`;

            content += `DETAIL AKUN (${snList.length} Pcs):\n\n`;

            snList.forEach((line: string, lineIdx: number) => {
                const parsedFields = parseAccountLine(line);

                content += `   DATA AKUN KE-${lineIdx + 1}\n`;
                content += `   +---------------------------------------------------+\n`;

                parsedFields.forEach(field => {
                    if (field.label) {
                        const labelStr = field.label.padEnd(10); // Min width for label
                        content += `   | ${labelStr} : ${field.value.padEnd(35)} |\n`;
                    } else {
                        content += `   | ${field.value.padEnd(48)} |\n`;
                    }
                });

                content += `   +---------------------------------------------------+\n\n`;
            });
            content += `\n`;
        });

        content += `========================================================================\n\n`;
        content += `                        PENTING & DISCLAIMER\n`;
        content += `========================================================================\n`;
        content += `1. Simpan file ini di tempat aman.\n`;
        content += `2. Jangan bagikan ke orang lain jika akun bersifat PRIVATE.\n`;
        content += `3. Jika ada kendala login, screenshot bukti dan hubungi admin.\n`;
        content += `4. Garansi berlaku sesuai masa aktif yang tertera.\n`;
        content += `========================================================================\n`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `INVOICE-${order.invoiceCode}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Helpers ---
    const copyToClipboard = (text: string, id: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(id);
        showToast('Berhasil disalin!', 'success');
        setTimeout(() => setCopied(''), 2000);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // --- Effects ---
    useEffect(() => {
        if (order.qrisString) {
            QRCode.toDataURL(order.qrisString, {
                color: {
                    dark: '#db2777', // Pink-600
                    light: '#ffffff'
                },
                margin: 2
            }).then(setQrDataUrl);
        }
        if (order.expiredAt) {
            const expiry = new Date(order.expiredAt).getTime();
            const now = Date.now();
            setTimeLeft(Math.max(0, Math.floor((expiry - now) / 1000)));
        }
    }, [order]);

    useEffect(() => {
        if (timeLeft <= 0 || status !== 'PENDING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, status]);

    useEffect(() => {
        if (status !== 'PENDING' && status !== 'PROCESSING') return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/orders/${order.invoiceCode}/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status && data.status !== status) {
                        setStatus(data.status);
                        if (data.status === 'DELIVERED') {
                            showToast(isWalletTopup ? 'Topup Sukses!' : 'Transaksi Berhasil!', 'success');
                            router.refresh(); // Refresh to get SN
                        } else if (data.status === 'FAILED') {
                            router.refresh();
                        }
                    }
                }
            } catch (e) {
                // Ignore silent errors
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [status, order.invoiceCode, router, showToast, isWalletTopup]);


    // --- Status Banner Component ---
    const StatusBanner = () => {
        if (status === 'PENDING') return (
            <div className="bg-yellow-50 border-b border-yellow-100 p-6 flex flex-col items-center gap-3 text-center">
                <div className="p-3 bg-white rounded-full shadow-sm animate-pulse">
                    <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-yellow-900">Menunggu Pembayaran</h2>
                    <p className="text-yellow-700 text-sm mt-1">Selesaikan pembayaran sebelum waktu habis</p>
                </div>
            </div>
        );
        if (status === 'PROCESSING') return (
            <div className="bg-orange-50 border-b border-orange-100 p-6 flex flex-col items-center gap-3 text-center">
                <div className="p-3 bg-white rounded-full shadow-sm">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-orange-900">Sedang Diproses</h2>
                    <p className="text-orange-700 text-sm mt-1">Sistem sedang memproses pesanan Anda secara otomatis...</p>
                </div>
            </div>
        );
        if (status === 'DELIVERED') return (
            <div className="bg-green-50 border-b border-green-100 p-6 flex flex-col items-center gap-3 text-center">
                <div className="p-3 bg-white rounded-full shadow-sm">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-green-900">Transaksi Berhasil!</h2>
                    <p className="text-green-700 text-sm mt-1">Terima kasih telah berbelanja.</p>
                </div>
            </div>
        );
        if (status === 'CANCELED' || status === 'FAILED') {
            const isQris = order.paymentMethod?.toLowerCase() === 'qris';
            return (
                <div className="bg-red-50 border-b border-red-100 p-6 flex flex-col items-center gap-3 text-center">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-red-900">Transaksi {status === 'CANCELED' ? 'Dibatalkan' : 'Gagal'}</h2>
                        {!isQris && (
                            <p className="text-red-700 text-sm mt-1">Dana akan direfund otomatis ke saldo akun.</p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);

    // ... (existing effects)

    const handleCancelOrder = async () => {
        setIsCanceling(true);
        try {
            const res = await fetch(`/api/orders/${order.invoiceCode}/cancel`, {
                method: 'POST',
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('CANCELED');
                showToast('Pesanan berhasil dibatalkan', 'success');
                setShowCancelModal(false);
                router.refresh();
            } else {
                showToast(data.error || 'Gagal membatalkan pesanan', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan sistem', 'error');
        } finally {
            setIsCanceling(false);
        }
    };

    // ... (rendering logic)

    return (
        <div className="min-h-screen bg-gray-50/50 py-6 px-4 md:py-10 md:px-0 font-sans relative">

            {/* Custom Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Batalkan Pesanan?</h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    Apakah Anda yakin ingin membatalkan pesanan ini? Aksi ini tidak dapat dibatalkan.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={isCanceling}
                                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Kembali
                                </button>
                                <button
                                    onClick={handleCancelOrder}
                                    disabled={isCanceling}
                                    className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Batalkan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[480px] mx-auto space-y-5">
                {/* ... existing main card JSX ... */}

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">

                    {/* Compact Header */}
                    <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-0.5">Invoice</p>
                            <div
                                onClick={() => copyToClipboard(order.invoiceCode, 'invoice')}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <span className="font-mono font-bold text-gray-800 text-sm md:text-base group-hover:text-pink-600 transition-colors">
                                    #{order.invoiceCode}
                                </span>
                                <Copy className="w-3 h-3 text-gray-300 group-hover:text-pink-500 transition-colors" />
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-0.5">Tanggal</p>
                            <p className="text-xs font-semibold text-gray-700">{formatDateTimeWIB(new Date(order.createdAt)).split(' pukul')[0]}</p>
                        </div>
                    </div>

                    <StatusBanner />

                    <div className="p-6 md:p-8 space-y-8">

                        {/* PRODUCT SECTION */}
                        <div className="space-y-4">
                            {order.orderItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-4 items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    {/* Product Image */}
                                    {/* Product Image */}
                                    <div className="w-14 h-14 bg-gray-50 rounded-xl relative overflow-hidden shrink-0 border border-gray-100 shadow-sm flex items-center justify-center">
                                        {item.variant?.product?.category?.type === 'SOSMED' && !item.variant.product.imageUrl ? (
                                            (() => {
                                                const lower = item.variant.product.name.toLowerCase();
                                                if (lower.includes('instagram')) return <FontAwesomeIcon icon={faInstagram} className="text-[#E4405F] text-2xl" />;
                                                if (lower.includes('tiktok')) return <FontAwesomeIcon icon={faTiktok} className="text-black text-2xl" />;
                                                if (lower.includes('youtube')) return <FontAwesomeIcon icon={faYoutube} className="text-[#FF0000] text-2xl" />;
                                                if (lower.includes('facebook')) return <FontAwesomeIcon icon={faFacebook} className="text-[#1877F2] text-2xl" />;
                                                if (lower.includes('twitter') || lower.includes('x ')) return <FontAwesomeIcon icon={faTwitter} className="text-black text-2xl" />;
                                                if (lower.includes('spotify')) return <FontAwesomeIcon icon={faSpotify} className="text-[#1DB954] text-2xl" />;
                                                if (lower.includes('twitch')) return <FontAwesomeIcon icon={faTwitch} className="text-[#9146FF] text-2xl" />;
                                                if (lower.includes('discord')) return <FontAwesomeIcon icon={faDiscord} className="text-[#5865F2] text-2xl" />;
                                                if (lower.includes('telegram')) return <FontAwesomeIcon icon={faTelegram} className="text-[#0088cc] text-2xl" />;
                                                if (lower.includes('linkedin')) return <FontAwesomeIcon icon={faLinkedin} className="text-[#0077b5] text-2xl" />;
                                                return <User className="w-6 h-6 text-green-600" />;
                                            })()
                                        ) : (
                                            item.variant?.product?.imageUrl && !imageError[item.id] ? (
                                                <Image
                                                    src={item.variant.product.imageUrl || '/icons/default-product.png'}
                                                    alt={item.productName}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                    onError={(e) => {
                                                        setImageError(prev => ({ ...prev, [item.id]: true }));
                                                    }}
                                                    sizes="64px"
                                                />
                                            ) : (
                                                isWalletTopup && walletIconUrl ? (
                                                    <img src={walletIconUrl} alt="Wallet" className="w-full h-full object-contain" />
                                                ) : (
                                                    <Zap className="w-6 h-6 text-gray-300" />
                                                )
                                            )
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.productName}</h3>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-gray-500 text-xs">{item.variantName}</span>
                                            {item.target && (
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 border border-gray-200">
                                                    {item.target}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* QRIS SECTION (Redesigned) */}
                        {status === 'PENDING' && order.paymentMethod?.toLowerCase() === 'qris' && (
                            <div className="flex flex-col items-center justify-center space-y-5">
                                <div className="bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-lg shadow-pink-100/50 relative">
                                    {/* QR Container */}
                                    <div className="bg-gradient-to-br from-pink-50 to-white p-6 rounded-[1.7rem] border border-dashed border-pink-200">
                                        {qrDataUrl ? (
                                            <img
                                                src={qrDataUrl}
                                                className="w-48 h-48 sm:w-56 sm:h-56 object-contain mix-blend-multiply opacity-90 hover:opacity-100 transition-opacity"
                                                alt="QRIS"
                                            />
                                        ) : (
                                            <div className="w-48 h-48 flex items-center justify-center">
                                                <Loader2 className="animate-spin text-pink-300 w-8 h-8" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Logo Overlay (Optional decoration) */}
                                    <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-xl shadow-md border border-gray-50 hidden sm:block">
                                        <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                                            <Zap className="w-4 h-4 text-pink-600 fill-pink-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center space-y-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Pembayaran</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                                        Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                                    </p>

                                    <div className="inline-flex items-center gap-2 text-pink-600 bg-pink-50 py-1.5 px-4 rounded-full border border-pink-100 text-xs font-bold mt-2">
                                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                                        <span>Bayar dalam {formatTime(timeLeft)}</span>
                                    </div>
                                </div>

                                <div className="w-full text-center">
                                    <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                                        Scan QRIS di atas menggunakan E-Wallet atau Mobile Banking Anda
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold py-2 px-4 rounded-full hover:bg-red-50 transition-colors"
                                >
                                    Batalkan Pesanan
                                </button>
                            </div>
                        )}

                        {/* PAYMENT DETAILS (Collapsed/Minimal) */}
                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Rincian</h3>
                            </div>

                            <div className="space-y-2 text-xs sm:text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>Subtotal</span>
                                    <span>Rp {Number(order.subtotalAmount).toLocaleString('id-ID')}</span>
                                </div>
                                {Number(order.paymentGatewayFee) > 0 && (
                                    <div className="flex justify-between text-gray-500">
                                        <span>Biaya Admin</span>
                                        <span>+ Rp {Number(order.paymentGatewayFee).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {Number(order.discountAmount) > 0 && (
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>Hemat</span>
                                        <span>- Rp {Number(order.discountAmount).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 mt-2 border-t border-dashed border-gray-200 text-sm sm:text-base font-bold text-gray-900">
                                    <span>Total Bayar</span>
                                    <span>Rp {Number(order.totalAmount).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* --- SN / ACCOUNT DATA SECTION --- */}
                        {showBulkDownload && status === 'DELIVERED' ? (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-2xl p-6 text-center">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1">Pesanan Bulk</h3>
                                    <p className="text-gray-500 text-xs mb-4">Data akun tersedia dalam format file TXT.</p>
                                    <button
                                        onClick={handleDownloadTxt}
                                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-200 text-sm"
                                    >
                                        <FileText className="w-4 h-4" /> Download .txt
                                    </button>
                                </div>
                            </div>
                        ) : (
                            order.orderItems.map((item: any) => {
                                const isSuccess = (status === 'DELIVERED' || item.providerStatus === 'SUCCESS');
                                const isFailed = (status === 'FAILED' || item.providerStatus === 'FAILED');
                                const isProcessing = (!isSuccess && !isFailed);
                                const shouldShow = isSuccess || isFailed;

                                if (!shouldShow) return null;

                                let expiryTag = null;
                                if (item.variant?.durationDays && isSuccess) {
                                    expiryTag = (
                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-wide">
                                            {item.variant.durationDays} HARI
                                        </span>
                                    );
                                }

                                let noteColorClass = 'bg-blue-50/50 text-blue-800 border-blue-100';
                                if (isFailed) noteColorClass = 'bg-red-50 text-red-700 border-red-100';
                                else if (isSuccess) noteColorClass = 'bg-green-50 text-green-700 border-green-100';
                                else if (isProcessing) noteColorClass = 'bg-orange-50 text-orange-700 border-orange-100';

                                return (
                                    <div key={item.id} className="mt-8 pt-6 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className={`text-sm font-bold flex items-center gap-2 ${isFailed ? 'text-red-600' : (isProcessing ? 'text-orange-600' : 'text-gray-900')}`}>
                                                {isFailed ? <XCircle className="w-4 h-4 fill-red-100" /> : isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-green-500 fill-green-100" />}
                                                {isFailed ? 'Gagal / Error' : 'Data Pesanan'}
                                            </h3>
                                            {expiryTag}
                                        </div>

                                        {!isFailed && item.sn ? (
                                            <div className="space-y-3">
                                                {item.sn.split('\n').map((line: string, lineIdx: number) => {
                                                    const parsedFields = parseAccountLine(line);
                                                    return (
                                                        <div key={lineIdx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group overflow-hidden hover:border-green-300 transition-colors">
                                                            <div className="grid gap-3 pr-8">
                                                                {parsedFields.map((field, fIdx) => (
                                                                    <AccountFieldRow
                                                                        key={fIdx}
                                                                        field={field}
                                                                        isDescription={field.label?.toLowerCase().includes('deskripsi') || field.label?.toLowerCase().includes('note')}
                                                                        isUrl={field.value.startsWith('http')}
                                                                        isSensitive={['pass', 'pin', 'token'].some(k => field.label?.toLowerCase().includes(k))}
                                                                        FieldIcon={Info}
                                                                        fieldId={`${item.id}-${lineIdx}-${fIdx}`}
                                                                        onCopy={() => copyToClipboard(field.value, `${item.id}-${lineIdx}-${fIdx}`)}
                                                                        copied={copied === `${item.id}-${lineIdx}-${fIdx}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <button
                                                                onClick={() => copyToClipboard(line, `${item.id}-${lineIdx}`)}
                                                                className={`absolute top-4 right-3 p-2 rounded-lg transition-all ${copied === `${item.id}-${lineIdx}` ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                                    }`}
                                                            >
                                                                {copied === `${item.id}-${lineIdx}` ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : !isFailed ? (
                                            isWalletTopup ? (
                                                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
                                                        <Zap className="w-4 h-4 text-yellow-500 fill-yellow-100" />
                                                        Detail Transaksi
                                                    </h3>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-500 font-medium">Order ID</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-gray-900">{order.invoiceCode}</span>
                                                                <button onClick={() => copyToClipboard(order.invoiceCode, 'oid')} className="text-gray-400 hover:text-gray-600 transition-colors">
                                                                    {copied === 'oid' ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-500 font-medium">Status</span>
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-100' : status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                                {status === 'DELIVERED' ? 'Berhasil' : status === 'FAILED' ? 'Gagal' : 'Sedang Diproses'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-500 font-medium">Waktu Selesai</span>
                                                            <span className="font-medium text-gray-900">
                                                                {status === 'DELIVERED' && order.deliveredAt ? formatDateTimeWIB(new Date(order.deliveredAt)) : '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Updated SMM Logic here
                                                item.variant?.product?.category?.type === 'SOSMED' ? (
                                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-xs sm:text-sm flex gap-3 items-start">
                                                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <span className="font-medium leading-relaxed">
                                                            Silakan cek di menu profil lalu klik layanan sosmed untuk memantau pesanan.
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-800 text-xs flex gap-2 items-center">
                                                        <Loader2 className="w-3 h-3 animate-spin shrink-0" /> Note: Data Sedang disiapkan...
                                                    </div>
                                                )
                                            )
                                        ) : null}

                                        {item.note && !item.note.includes('Auto-sent') && (
                                            <div className={`mt-3 p-3 text-xs rounded-xl border flex items-start gap-2 ${noteColorClass}`}>
                                                {isFailed ? <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />}
                                                <span className="leading-relaxed">{item.note}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        {/* BUTTONS */}
                        <div className="pt-6 grid gap-3">
                            {!isWalletTopup && (
                                <button
                                    onClick={() => {
                                        if (order.orderItems && order.orderItems.length > 0) {
                                            const firstItem = order.orderItems[0];
                                            if (firstItem.variant?.product?.slug) {
                                                router.push(`/p/${firstItem.variant.product.slug}`);
                                            } else if (firstItem.variant?.product?.id) {
                                                router.push(`/p/${firstItem.variant.product.id}`);
                                            } else {
                                                router.push('/');
                                            }
                                        } else {
                                            router.push('/');
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-200 active:scale-[0.98] group"
                                >
                                    <ShoppingCart className="w-5 h-5 fill-current text-green-200 group-hover:text-white transition-colors" />
                                    <span className="tracking-wide text-base">Beli Lagi</span>
                                </button>
                            )}

                            <div className="text-center">
                                <button
                                    onClick={() => router.push('/')}
                                    className="text-gray-400 hover:text-gray-600 text-xs font-semibold py-2.5 px-6 rounded-full hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
                                >
                                    <Home className="w-3.5 h-3.5" /> Kembali ke Beranda
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <span>Invoice #{order.invoiceCode}</span>
                        <span>{formatDateTimeWIB(new Date(order.createdAt))}</span>
                    </div>
                </div>

                {/* Footer Brand */}
                <div className="text-center flex items-center justify-center gap-2 text-gray-400">
                    <ShieldCheck className="w-3 h-3" />
                    <p className="text-[10px] font-medium uppercase tracking-widest">Secured Payment</p>
                </div>
            </div>
        </div >
    );
}

// Sub-component for individual field row to manage reveal state
function AccountFieldRow({ field, isDescription, isUrl, isSensitive, FieldIcon, fieldId, onCopy, copied }: any) {
    const [revealed, setRevealed] = useState(!isSensitive);

    return (
        <div className={`flex flex-col ${!isDescription ? 'sm:flex-row sm:items-center' : ''} gap-1.5 sm:gap-4`}>
            {field.label && (
                <div className={`flex items-center gap-2 text-gray-400 ${!isDescription ? 'w-28 shrink-0' : 'mb-1'}`}>
                    <FieldIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{field.label}</span>
                </div>
            )}

            <div
                onClick={() => {
                    if (isSensitive && !revealed) {
                        setRevealed(true);
                    } else if (!isUrl) {
                        onCopy();
                    }
                }}
                className={`
                font-mono text-sm font-bold text-gray-900 break-all
                bg-gray-50 border border-gray-100 rounded-lg px-3 py-2
                ${field.label && !isDescription ? 'w-full sm:w-auto min-w-[200px]' : 'w-full'}
                ${isDescription ? 'text-gray-600 font-sans font-normal leading-relaxed' : ''}
                ${!isDescription && !isUrl ? 'cursor-pointer hover:bg-green-50 hover:border-green-200 hover:text-green-700 active:scale-[0.98] transition-all relative group/field' : ''}
            `}>
                {isUrl ? (
                    <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        {field.value}
                        <LinkIcon className="w-3 h-3" />
                    </a>
                ) : (
                    <div className="flex items-center justify-between gap-2">
                        <span className={!revealed ? 'blur-sm select-none' : ''}>
                            {revealed ? field.value : '••••••••••••'}
                        </span>

                        {!isDescription && (
                            <div className="flex items-center gap-2">
                                {isSensitive && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}
                                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200"
                                    >
                                        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                                <span className={`opacity-0 group-hover/field:opacity-100 transition-opacity ${isSensitive && !revealed ? 'invisible' : ''}`}>
                                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

