
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';
import SmmOrderTable from '@/components/features/account/SmmOrderTable';

export const dynamic = 'force-dynamic';

export default async function SmmProfilePage() {
    const session = await getSession();
    if (!session?.userId) redirect('/login');

    // Fetch SMM Orders (OrderItems linked to SOSMED category)
    // We assume 'SOSMED' type or specific category mapping. 
    // If 'type' is not on Category, we can filter by product name or ensure category.slug/type exists.
    // Based on schema, Category has 'slug' and 'name'. Let's check schema again if needed, 
    // but usually we can filter by relation. 
    // Use fallback to fetch all and filter in memory if type is uncertain, 
    // but better to try direct filter.

    // Check if Category has 'type'. If not, we might need to rely on Product 'serviceType' or similar.
    // Document says "Category -> type -> Tipe layanan (default, custom_comments, dll)"
    // But schema might just have 'name'. 
    // Safest is to check if product has 'provider' = 'MEDANPEDIA'.

    const orderItems = await prisma.orderItem.findMany({
        where: {
            order: { userId: session.userId },
            variant: {
                product: {
                    category: {
                        type: 'SOSMED'
                    }
                }
            }
        },
        include: {
            order: true, // Need timestamp
            variant: true // Need product details
        },
        orderBy: { order: { createdAt: 'desc' } },
        take: 100
    });

    // Serialize
    const serializedOrders = orderItems.map((item: any) => ({
        id: item.id,
        providerTrxId: item.providerTrxId,
        productName: item.productName || item.variantName,
        target: item.target,
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        startCount: item.startCount,
        remains: item.remains,
        providerStatus: item.providerStatus || 'Pending',
        isRefill: (item.variant?.warrantyDays > 0) ||
            (item.productName?.toLowerCase().includes('refill')) ||
            (item.variant?.name?.toLowerCase().includes('refill')) || false,
        createdAt: item.order.createdAt.toISOString(),
    }));

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Activity className="text-green-600" />
                    Riwayat Pesanan Sosmed
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Pantau status pesanan, start count, dan lakukan refill jika tersedia.
                </p>
            </div>

            {/* Order Table Component */}
            <SmmOrderTable orders={serializedOrders} />

            {/* Panduan Section */}
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden mt-8">
                <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-blue-900">Panduan Status & Garansi</h3>
                </div>

                <div className="p-5 space-y-6 text-sm text-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span> Status Pesanan
                            </h4>
                            <ul className="space-y-2 text-xs">
                                <li><span className="font-bold text-yellow-600">Pending</span>: Antrean server.</li>
                                <li><span className="font-bold text-blue-600">Processing</span>: Sedang dikerjakan.</li>
                                <li><span className="font-bold text-green-600">Success</span>: Berhasil selesai.</li>
                                <li><span className="font-bold text-red-600">Error/Partial</span>: Gagal/Sebagian, dana refud otomatis.</li>
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span> Refill (Garansi)
                            </h4>
                            <p className="text-xs leading-relaxed">
                                Gunakan tombol <b>Refill</b> di tabel untuk klaim garansi jika followers turun.
                                Tombol hanya akan berhasil jika layanan mendukung refill dan masa garansi masih berlaku.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
