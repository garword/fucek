'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Settings, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface Product {
    id: string;
    name: string;
    category: string;
    variants: {
        id: string;
        name: string;
        sku: string | null;
        price: number;
        stock: number;
        isActive: boolean;
        bestProvider: string | null;
    }[];
}

export default function TopupGameProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/admin/products?type=GAME');
            const data = await res.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.variants.some(v => v.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Topup Game</h1>
                        <p className="text-gray-500 mt-1">Kelola katalog produk anda dengan mudah.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/admin/topup/providers"
                            className="px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                            <Settings className="w-5 h-5" />
                            Pengaturan Provider
                        </Link>
                        <Link
                            href="/admin/topup/products/add"
                            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Tambah Produk
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Cari produk..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-green-50 focus:border-green-500 transition-all outline-none"
                    />
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Produk
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Kategori
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Statistik (Fake)
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Varian
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Belum ada produk. Klik &quot;Tambah Produk&quot; untuk mulai.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{product.name}</div>
                                            {product.variants[0]?.sku && (
                                                <div className="text-xs text-gray-500 font-mono mt-1">
                                                    SKU: {product.variants[0].sku}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            -
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {product.variants.length} varian
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Rp {product.variants[0]?.price.toLocaleString()} - Rp {product.variants[product.variants.length - 1]?.price.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.variants.some(v => v.isActive) ? (
                                                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                                    <Eye className="w-4 h-4" />
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                                                    <EyeOff className="w-4 h-4" />
                                                    Nonaktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
