'use client';

import { useState } from 'react';
import { Save, Loader2, UserCog, Lock, User } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function AccountSettingsPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('windaa'); // Default init, should fetch
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword) {
            showToast('Password saat ini wajib diisi', 'error');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            showToast('Konfirmasi password tidak cocok', 'error');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            showToast('Password baru minimal 6 karakter', 'error');
            return;
        }

        setIsSaving(true);

        try {
            const res = await fetch('/api/admin/settings/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    currentPassword,
                    newPassword: newPassword || undefined
                }),
            });

            const data = await res.json();

            if (res.ok) {
                showToast('Akun berhasil diperbarui', 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                throw new Error(data.error || 'Gagal menyimpan perubahan');
            }
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 rounded-xl">
                    <UserCog className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
                    <p className="text-sm text-gray-500">Ubah username dan password administrator.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Username Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-400" />
                            Informasi Dasar
                        </h3>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                                placeholder="Username Admin"
                                required
                            />
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Password Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-gray-400" />
                            Keamanan
                        </h3>

                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-orange-800 mb-4">
                            Untuk keamanan, Anda wajib memasukkan <b>Password Saat Ini</b> untuk melakukan perubahan apapun.
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Password Saat Ini <span className="text-red-500">*</span></label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                placeholder="Masukkan password saat ini"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Password Baru (Opsional)</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="Kosongkan jika tidak diubah"
                                    minLength={6}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    placeholder="Ulangi password baru"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 active:scale-[0.98]"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>Simpan Perubahan</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
