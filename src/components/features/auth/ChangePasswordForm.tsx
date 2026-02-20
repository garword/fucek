'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { Lock, Save } from 'lucide-react';

export default function ChangePasswordForm() {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            showToast('Konfirmasi password tidak cocok', 'error');
            return;
        }

        if (formData.newPassword.length < 6) {
            showToast('Password minimal 6 karakter', 'error');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/user/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            });

            const data = await res.json();

            if (res.ok) {
                showToast('Password berhasil diubah!', 'success');
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                showToast(data.error || 'Gagal mengubah password', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan sistem', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
                <Lock className="text-gray-500 mr-2 w-5 h-5" />
                <h2 className="font-semibold text-gray-900">Ganti Password</h2>
            </div>

            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
                        <input
                            type="password"
                            required
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors w-full sm:w-auto"
                    >
                        {isLoading ? 'Menyimpan...' : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Simpan Password
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
