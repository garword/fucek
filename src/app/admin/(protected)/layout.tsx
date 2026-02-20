import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminHeader from '@/components/layout/AdminHeader';
import { Toaster } from 'sonner';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        redirect('/admin/login');
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-gray-900">
            <AdminSidebar user={session} />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen pt-[60px] md:pt-0">
                <AdminHeader />
                <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {children}
                </div>
            </main>

            {/* Toast Notifications */}
            <Toaster position="top-right" richColors />
        </div>
    );
}
