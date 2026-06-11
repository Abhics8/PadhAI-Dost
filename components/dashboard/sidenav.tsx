'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Files, LogOut, BookOpen } from 'lucide-react';
import { signOut } from 'next-auth/react';

const links = [
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Documents', href: '/documents', icon: Files },
    { name: 'Progress', href: '/dashboard', icon: LayoutDashboard },
];

export default function SideNav() {
    const pathname = usePathname();

    return (
        <div className="flex h-full flex-col px-3 py-4 md:px-3 bg-surface border-r border-edge">
            <Link
                className="mb-4 flex h-20 items-end justify-start rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 p-4 md:h-36 relative overflow-hidden group"
                href="/"
            >
                <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
                <div className="w-32 text-white md:w-44 relative">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <BookOpen className="h-7 w-7" />
                        <span>PadhAI Dost</span>
                    </div>
                    <div className="text-xs text-indigo-200 mt-1">v2.0 · AI Study Companion</div>
                </div>
            </Link>

            <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-1.5">
                {links.map((link) => {
                    const LinkIcon = link.icon;
                    const active = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex h-[46px] grow items-center justify-center gap-3 rounded-lg p-3 text-sm font-medium transition-all md:flex-none md:justify-start md:px-3
                                ${active
                                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-brand/30'
                                    : 'text-ink-dim border border-transparent hover:bg-surface-2 hover:text-ink'
                                }`}
                        >
                            <LinkIcon className={`w-5 ${active ? 'text-indigo-400' : ''}`} />
                            <p className="hidden md:block">{link.name}</p>
                        </Link>
                    );
                })}

                <div className="hidden h-auto w-full grow md:block" />

                <button
                    onClick={() => signOut()}
                    className="flex h-[46px] w-full grow items-center justify-center gap-3 rounded-lg p-3 text-sm font-medium text-ink-dim border border-transparent hover:bg-red-500/10 hover:text-red-400 transition-all md:flex-none md:justify-start md:px-3"
                >
                    <LogOut className="w-5" />
                    <div className="hidden md:block">Sign Out</div>
                </button>
            </div>
        </div>
    );
}
