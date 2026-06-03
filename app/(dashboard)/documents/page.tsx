'use client';

import { useState, useEffect } from 'react';
import {
    Files,
    MessageSquare,
    Trophy,
    LineChart,
    Calendar,
    ChevronRight,
    Search,
    Filter,
    MoreVertical,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/auth-components';

interface Stats {
    totalDocuments: number;
    totalChats: number;
    totalMessages: number;
    level: number;
    points: number;
}

interface Document {
    id: string;
    filename: string;
    fileType: string;
    fileSize: number | null;
    createdAt: string;
}

export default function DocumentsPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, docsRes] = await Promise.all([
                    fetch('/api/progress'),
                    fetch('/api/documents')
                ]);

                if (statsRes.ok && docsRes.ok) {
                    const statsData = await statsRes.json();
                    const docsData = await docsRes.json();
                    setStats(statsData.stats);
                    setDocuments(docsData.documents);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Your Progress</h1>
                <p className="text-zinc-500 mt-1">Track your study metrics and manage your materials.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Study Level', value: stats?.level || 0, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Documents', value: stats?.totalDocuments || 0, icon: Files, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Scholar Points', value: stats?.points || 0, icon: LineChart, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: 'AI Messages', value: stats?.totalMessages || 0, icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-2xl font-black text-zinc-900">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Documents Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-zinc-900">Recent Materials</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                className="pl-10 pr-4 h-10 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all w-64"
                            />
                        </div>
                        <Button variant="outline" className="h-10 px-4 rounded-xl gap-2 font-bold text-xs">
                            <Filter size={14} />
                            Filter
                        </Button>
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="p-12 text-center space-y-4">
                            <div className="h-8 w-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm font-medium text-zinc-500 tracking-tight">Syncing your materials...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto border border-zinc-100">
                                <FileText className="h-8 w-8 text-zinc-200" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-zinc-900 tracking-tight">No documents yet</p>
                                <p className="text-sm text-zinc-500 max-w-xs mx-auto">Upload your lecture notes or textbooks to start your AI-powered study session.</p>
                            </div>
                            <Button className="font-bold px-8 rounded-xl h-12 shadow-md">Upload Now</Button>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Filename</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Size</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {documents.map((doc) => (
                                    <tr key={doc.id} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-zinc-100 text-zinc-500 rounded-lg flex items-center justify-center">
                                                    <FileText size={20} />
                                                </div>
                                                <span className="text-sm font-bold text-zinc-900 tracking-tight">{doc.filename}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-zinc-500 font-medium">
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-zinc-500 font-medium">
                                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '--'}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <Button variant="ghost" className="h-9 w-9 p-0 rounded-lg">
                                                <MoreVertical size={16} className="text-zinc-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
