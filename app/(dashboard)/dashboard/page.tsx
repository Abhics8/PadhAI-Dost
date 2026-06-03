'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    MessageSquare,
    Files,
    Zap,
    ArrowRight,
    Plus,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/auth-components';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [recentDocs, setRecentDocs] = useState<any[]>([]);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, docsRes, sessionRes] = await Promise.all([
                    fetch('/api/progress'),
                    fetch('/api/documents'),
                    fetch('/api/auth/session'),
                ]);
                if (statsRes.ok && docsRes.ok) {
                    const statsData = await statsRes.json();
                    const docsData = await docsRes.json();
                    setStats(statsData.stats);
                    setRecentDocs(docsData.documents.slice(0, 3));
                }
                if (sessionRes.ok) {
                    const sessionData = await sessionRes.json();
                    if (sessionData?.user?.name) {
                        setUserName(sessionData.user.name);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-12">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight text-zinc-900">
                        Welcome back, <span className="text-indigo-600">{userName || 'Student'}</span>.
                    </h1>
                    <p className="text-zinc-500 font-medium tracking-tight">Ready to complete your goals today?</p>
                </div>
                <Link href="/chat">
                    <Button className="h-12 px-6 rounded-2xl gap-3 font-bold shadow-xl shadow-indigo-500/10 active:scale-95 transition-all">
                        <Plus size={20} />
                        New Study Session
                    </Button>
                </Link>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Stats & Progress */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Level Progress */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-zinc-900 uppercase tracking-widest text-xs">Learning Progress</h3>
                            <span className="text-xs font-black px-3 py-1 bg-amber-100 text-amber-700 rounded-lg">Level {stats?.level || 1}</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-3xl font-black text-zinc-900">{stats?.points || 0} <span className="text-sm font-bold text-zinc-400">Total Points</span></span>
                                <span className="text-sm font-bold text-zinc-500">Next Level: 500 XP</span>
                            </div>
                            <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(((stats?.points || 0) % 500) / 5, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/chat" className="group p-6 bg-zinc-900 rounded-3xl text-white hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10">
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Instant Tutor</h4>
                                    <p className="text-zinc-400 text-sm mt-1">Chat with your docs and get clear explanations 24/7.</p>
                                </div>
                                <ArrowRight className="mt-2 text-zinc-500 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                        <Link href="/documents" className="group p-6 bg-white border border-zinc-200 rounded-3xl hover:border-zinc-300 transition-all shadow-sm">
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                    <Files size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Brain Library</h4>
                                    <p className="text-zinc-500 text-sm mt-1">Manage all your textbooks and notes in one place.</p>
                                </div>
                                <ArrowRight className="mt-2 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Right Column - Recent Activity */}
                <div className="space-y-6">
                    <h3 className="font-bold text-zinc-900 uppercase tracking-widest text-xs px-2">Recent Materials</h3>
                    <div className="space-y-3">
                        {recentDocs.length > 0 ? (
                            recentDocs.map((doc, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-200 transition-all cursor-pointer group">
                                    <div className="h-10 w-10 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-colors">
                                        <Zap size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-900 truncate">{doc.filename}</p>
                                        <p className="text-[10px] text-zinc-400 font-medium uppercase mt-0.5 tracking-tighter">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 border-2 border-dashed border-zinc-100 rounded-3xl text-center">
                                <p className="text-xs font-bold text-zinc-400 italic">No materials yet.</p>
                            </div>
                        )}
                        <Link href="/documents" className="block text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                            View All Material
                        </Link>
                    </div>

                    {/* Tip Card */}
                    <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100/50">
                        <div className="flex gap-3">
                            <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-indigo-900 leading-relaxed">
                                <span className="font-bold">Tip:</span> Try the "Samjha Do" button in the chat for faster summaries.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
