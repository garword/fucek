'use client';

import { useState, useEffect } from 'react';
import {
    Clock,
    Trash2,
    RefreshCcw,
    ShieldAlert,
    PlusCircle,
    Edit,
    LogIn,
    XCircle,
    Search,
    User
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type AuditLog = {
    id: string;
    action: string;
    details: string;
    createdAt: string;
    user: { email: string; username: string };
};

export default function LogsPage() {
    const { showToast } = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log?')) return;
        setDeletingId(id);

        try {
            const res = await fetch('/api/admin/logs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                setLogs(prev => prev.filter(log => log.id !== id));
                showToast('Log deleted successfully', 'success');
            } else {
                showToast('Failed to delete log', 'error');
            }
        } catch (error) {
            showToast('Error connecting to server', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('WARNING: This will delete ALL logs. This action cannot be undone. Continue?')) return;
        setLoading(true);

        try {
            const res = await fetch('/api/admin/logs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearAll: true })
            });

            if (res.ok) {
                setLogs([]);
                showToast('All logs cleared', 'success');
            } else {
                showToast('Failed to clear logs', 'error');
            }
        } catch (error) {
            showToast('Error connecting to server', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <PlusCircle size={18} className="text-green-600" />;
            case 'UPDATE': return <Edit size={18} className="text-blue-600" />;
            case 'DELETE': return <Trash2 size={18} className="text-red-600" />;
            case 'LOGIN': return <LogIn size={18} className="text-indigo-600" />;
            default: return <ShieldAlert size={18} className="text-gray-600" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-50 border-green-100 text-green-700';
            case 'UPDATE': return 'bg-blue-50 border-blue-100 text-blue-700';
            case 'DELETE': return 'bg-red-50 border-red-100 text-red-700';
            case 'LOGIN': return 'bg-indigo-50 border-indigo-100 text-indigo-700';
            default: return 'bg-gray-50 border-gray-100 text-gray-700';
        }
    };

    const filteredLogs = logs.filter(log =>
        log.user?.email.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">Track system activities and security events.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-all font-medium text-sm shadow-sm"
                    >
                        <RefreshCcw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-100 transition-all font-medium text-sm shadow-sm"
                    >
                        <Trash2 size={16} />
                        Clear All
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search logs by user, action, or details..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm shadow-sm"
                />
                <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
            </div>

            {/* Logs Timeline/Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="bg-white p-4 rounded-full inline-block mb-3 shadow-sm">
                        <Clock className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-gray-900 font-bold">No logs found</h3>
                    <p className="text-sm text-gray-500">System activities will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLogs.map((log) => (
                        <div
                            key={log.id}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group relative flex flex-col md:flex-row gap-4 md:items-center"
                        >
                            {/* Icon & User */}
                            <div className="flex items-center gap-4 min-w-[200px]">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getActionColor(log.action).replace('text-', 'bg-opacity-20 ')}`}>
                                    {getActionIcon(log.action)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 text-sm">
                                            {log.user?.username || 'Unknown User'}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-gray-500">{log.user?.email}</p>
                                </div>
                            </div>

                            {/* Action & Details */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                    {log.details}
                                </p>
                            </div>

                            {/* Delete Button */}
                            <button
                                onClick={() => handleDelete(log.id)}
                                disabled={deletingId === log.id}
                                className="absolute top-4 right-4 md:static p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                                title="Delete Log"
                            >
                                {deletingId === log.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                    <Trash2 size={18} />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
