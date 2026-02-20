
import prisma from '@/lib/prisma';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Users, DollarSign, Package } from 'lucide-react';
import DashboardCharts from '@/components/admin/DashboardCharts';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const [
        totalOrders,
        totalRevenue,
        totalProducts,
        totalUsers,
        recentOrders,
        recentLogs
    ] = await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({
            _sum: { totalAmount: true }
        }),
        prisma.product.count({ where: { isDeleted: false } }),
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        }),
        prisma.auditLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        })
    ]);

    const stats = [
        { label: 'Total Sales', value: formatRupiah(Number(totalRevenue._sum.totalAmount || 0)), icon: DollarSign, color: 'bg-blue-50 text-blue-600', trend: '+12.5%', trendColor: 'bg-green-100 text-green-600' },
        { label: 'New Users', value: totalUsers, icon: Users, color: 'bg-purple-50 text-purple-600', trend: '+5.2%', trendColor: 'bg-green-100 text-green-600' },
        { label: 'Total Orders', value: totalOrders, icon: ShoppingCart, color: 'bg-green-50 text-green-600', trend: '+8%', trendColor: 'bg-green-100 text-green-600' },
        { label: 'Active Products', value: totalProducts, icon: Package, color: 'bg-red-50 text-red-600', trend: '-2%', trendColor: 'bg-red-100 text-red-600' },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, Admin</h1>
                <p className="text-gray-500 mt-1">Monitor your daily business operations and growth metrics.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trendColor}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Chart */}
                <DashboardCharts />

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                        <Link href="/admin/logs" className="text-emerald-600 text-sm font-bold hover:underline">View All</Link>
                    </div>
                    <div className="space-y-6">
                        {recentLogs.length > 0 ? (
                            recentLogs.map((log) => (
                                <div key={log.id} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <ShoppingCart size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{log.action}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(log.createdAt).toLocaleTimeString()} • {log.user?.email || 'System'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                No recent activity found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Detailed Transactions</h2>
                    <button className="px-4 py-2 bg-gray-50 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors">
                        Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-400 font-bold text-[11px] uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-blue-600">#{order.invoiceCode}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                {order.user.email?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900">{order.user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{formatRupiah(Number(order.totalAmount))}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400">
                                        ...
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
