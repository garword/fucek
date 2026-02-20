import SystemEndpoints from '@/components/admin/SystemEndpoints';

export const metadata = {
    title: 'System Endpoints | Admin Dashboard',
};

export default function SystemPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System & API Endpoints</h1>
                    <p className="text-gray-500">Daftar URL penting untuk integrasi pihak ketiga & monitoring.</p>
                </div>
            </div>

            <SystemEndpoints />
        </div>
    );
}
