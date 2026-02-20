import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export default async function WebhookLogsPage() {
    let logs = [];
    let error = null;

    try {
        const logPath = join(process.cwd(), 'webhook-logs.json');
        const data = await readFile(logPath, 'utf-8');
        logs = JSON.parse(data);
    } catch (err: any) {
        error = err.message;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        📡 Webhook Logs (Pakasir)
                    </h1>

                    {error && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                            <p className="text-yellow-800 font-medium">⚠️ Error: {error}</p>
                            <p className="text-yellow-600 text-sm mt-1">
                                Belum ada webhook yang masuk. Pastikan URL webhook di Pakasir sudah benar.
                            </p>
                        </div>
                    )}

                    {logs.length === 0 && !error && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-blue-800 font-medium">
                                📭 Belum ada webhook yang diterima
                            </p>
                            <p className="text-blue-600 text-sm mt-1">
                                Silakan lakukan simulasi pembayaran di Pakasir Dashboard.
                            </p>
                        </div>
                    )}

                    {logs.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-gray-600 text-sm font-medium">
                                Total: {logs.length} webhook(s) diterima
                            </p>

                            {logs.map((log: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="bg-gray-50 border border-gray-300 rounded-xl p-4"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                                            {new Date(log.timestamp).toLocaleString('id-ID')}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${log.data.status === 'completed'
                                                ? 'bg-green-100 text-green-700'
                                                : log.data.status === 'canceled'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {log.data.status?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                    </div>

                                    <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto font-mono">
                                        {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-2">🔧 Instruksi Setup Webhook</h2>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Buka Dashboard Pakasir → Proyek Anda → Edit</li>
                        <li>Isi <strong>Webhook URL</strong> dengan:</li>
                    </ol>
                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mt-2 font-mono text-sm">
                        https://untrounced-suitably-krystin.ngrok-free.dev/api/webhooks/pakasir
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        ⚠️ Pastikan URL di atas sesuai dengan URL Ngrok Anda yang aktif.
                    </p>
                </div>
            </div>
        </div>
    );
}
