'use client';

import { useState, useEffect } from 'react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

type ChartData = { labels: string[], data: number[] };

export default function DashboardCharts() {
    const { showToast } = useToast();
    const [period, setPeriod] = useState<string>('24h');
    const [stats, setStats] = useState<{ labels: string[], values: number[] }>({ labels: [], values: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, [period]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/stats?period=${period}`);
            if (res.ok) {
                const json: ChartData = await res.json();
                setStats({ labels: json.labels, values: json.data });
            }
        } catch (error) {
            console.error(error);
            showToast('Gagal memuat data grafik', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Calculate max value for normalization (avoid division by zero)
    const maxValue = Math.max(...stats.values, 1);

    // Determine which labels to show based on period/density
    const shouldShowLabel = (index: number, total: number) => {
        if (period === '24h') return index % 4 === 0; // Show every 4th hour
        if (period === '7d') return true; // Show all days
        if (period === '30d') return index % 5 === 0; // Show every 5th day
        if (period === '1y') return index % 2 === 0; // Show every 2nd month
        return false;
    };

    return (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-gray-900">Performance Over Time</h2>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-gray-50 border-none text-sm font-medium text-gray-600 rounded-lg px-3 py-1 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="1y">Last Year</option>
                </select>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
            ) : stats.values.length > 0 ? (
                <div className="relative">
                    {/* Bars Container */}
                    <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 px-2">
                        {stats.values.map((value, i) => {
                            const heightPercentage = Math.max((value / maxValue) * 100, 2); // Min 2% height for visibility
                            return (
                                <div
                                    key={i}
                                    className="w-full bg-emerald-50 hover:bg-emerald-100 rounded-t-lg transition-all relative group cursor-pointer"
                                    style={{ height: `${heightPercentage}%` }}
                                >
                                    {/* Tooltip */}
                                    <div className="hidden group-hover:block absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] sm:text-xs px-2 py-1.5 rounded shadow-xl z-10 whitespace-nowrap">
                                        <p className="font-bold opacity-75 mb-0.5">{stats.labels[i]}</p>
                                        <p className="font-bold text-emerald-400">{formatRupiah(value)}</p>
                                        {/* Little triangle pointer (optional, CSS borders) */}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between mt-4 px-2">
                        {stats.labels.map((label, i) => (
                            <div key={i} className={`flex-1 text-center ${shouldShowLabel(i, stats.labels.length) ? 'block' : 'hidden md:block opacity-0'}`}>
                                <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">
                                    {shouldShowLabel(i, stats.labels.length) ? label : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                    No transactions found in this period
                </div>
            )}
        </div>
    );
}
