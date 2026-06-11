'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    MessageSquare,
    Files,
    Zap,
    ArrowRight,
    Plus,
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
                    <h1 className="text-4xl font-black tracking-tight text-ink">
                        Welcome back,{' '}
                        <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            {userName || 'Student'}
                        </span>
                        .
                    </h1>
                    <p className="text-ink-dim font-medium tracking-tight">Ready to complete your goals today?</p>
                </div>
                <Link href="/chat">
                    <Button className="h-12 px-6 rounded-2xl gap-3 font-bold active:scale-95 transition-all">
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
                    <div className="bg-surface border border-edge rounded-3xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink-dim uppercase tracking-widest text-xs">Learning Progress</h3>
                            <span className="text-xs font-black px-3 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-lg">
                                Level {stats?.level || 1}
                            </span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-3xl font-black text-ink">
                                    {stats?.points || 0}{' '}
                                    <span className="text-sm font-bold text-ink-faint">Total Points</span>
                                </span>
                                <span className="text-sm font-bold text-ink-dim">Next Level: 500 XP</span>
                            </div>
                            <div className="h-3 w-full bg-canvas border border-edge rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(((stats?.points || 0) % 500) / 5, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/chat"
                            className="group p-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/20"
                        >
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="h-10 w-10 bg-white/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Instant Tutor</h4>
                                    <p className="text-indigo-200 text-sm mt-1">Chat with your docs and get cited, confidence-scored answers 24/7.</p>
                                </div>
                                <ArrowRight className="mt-2 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                        <Link
                            href="/documents"
                            className="group p-6 bg-surface border border-edge rounded-3xl hover:border-brand/40 hover:bg-surface-2 transition-all"
                        >
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="h-10 w-10 bg-indigo-500/15 border border-indigo-500/25 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Files size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-ink">Brain Library</h4>
                                    <p className="text-ink-dim text-sm mt-1">Manage all your textbooks and notes in one place.</p>
                                </div>
                                <ArrowRight className="mt-2 text-ink-faint group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Right Column - Recent Activity */}
                <div className="space-y-6">
                    <h3 className="font-bold text-ink-dim uppercase tracking-widest text-xs px-2">Recent Materials</h3>
                    <div className="space-y-3">
                        {recentDocs.length > 0 ? (
                            recentDocs.map((doc, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 p-4 bg-surface border border-edge rounded-2xl hover:border-edge-2 hover:bg-surface-2 transition-all cursor-pointer group"
                                >
                                    <div className="h-10 w-10 bg-canvas border border-edge rounded-lg flex items-center justify-center text-ink-faint group-hover:text-indigo-400 transition-colors">
                                        <Zap size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-ink truncate">{doc.filename}</p>
                                        <p className="text-[10px] text-ink-faint font-medium uppercase mt-0.5 tracking-wide">
                                            Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 border-2 border-dashed border-edge rounded-3xl text-center">
                                <p className="text-xs font-bold text-ink-faint italic">No materials yet.</p>
                            </div>
                        )}
                        <Link
                            href="/documents"
                            className="block text-center py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            View All Material
                        </Link>
                    </div>

                    {/* Tip Card */}
                    <div className="p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                        <div className="flex gap-3">
                            <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-ink-dim leading-relaxed">
                                <span className="font-bold text-indigo-300">Tip:</span> Try the &quot;Samjha Do&quot; button in the chat for faster summaries.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
