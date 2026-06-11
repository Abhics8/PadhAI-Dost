'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui/auth-components';
import { Send, User as UserIcon, Bot, FileText, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Source {
    page: number;
    text: string;
    score: number;
    retrievers: string[];
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    confidence?: number | null;
    grounded?: boolean | null;
}

function ConfidenceBadge({ confidence, grounded }: { confidence: number; grounded: boolean }) {
    const pct = Math.round(confidence * 100);
    const ok = grounded;
    return (
        <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                ok
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            }`}
            title="Groundedness: how well this answer is supported by your document"
        >
            {ok ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
            {pct}% grounded
        </span>
    );
}

function Citations({ sources }: { sources: Source[] }) {
    const [open, setOpen] = useState(false);
    if (!sources || sources.length === 0) return null;
    return (
        <div className="mt-2 border-t border-edge pt-2">
            <button
                onClick={() => setOpen((o) => !o)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
                <FileText size={12} />
                {open ? 'Hide' : 'Show'} {sources.length} source{sources.length > 1 ? 's' : ''}
            </button>
            {open && (
                <div className="mt-2 space-y-2">
                    {sources.map((s, i) => (
                        <div key={i} className="text-xs bg-canvas border border-edge rounded-lg p-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-ink">
                                    [{i + 1}] Page {s.page}
                                </span>
                                <span className="text-ink-faint">
                                    {s.retrievers.join('+')} · {Math.round(s.score * 100)}%
                                </span>
                            </div>
                            <p className="text-ink-dim leading-snug">{s.text}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources,
                    confidence: data.confidence,
                    grounded: data.grounded,
                },
            ]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, something went wrong. Please check if the backend is running.',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-4xl mx-auto bg-surface rounded-2xl border border-edge overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-ink-faint">
                        <div className="rounded-2xl border border-edge bg-canvas p-4 mb-3">
                            <Bot className="w-10 h-10 text-indigo-400" />
                        </div>
                        <p className="text-ink-dim font-medium">Start chatting with your document!</p>
                        <p className="text-xs mt-1">Answers come with page citations and a confidence score.</p>
                    </div>
                )}
                {messages.map((m, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div
                            className={`p-2 rounded-full border ${
                                m.role === 'user'
                                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                                    : 'bg-surface-2 text-ink-dim border-edge'
                            }`}
                        >
                            {m.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                        </div>
                        <div
                            className={`p-3.5 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                                m.role === 'user'
                                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-tr-sm'
                                    : 'bg-surface-2 text-ink border border-edge rounded-tl-sm'
                            }`}
                        >
                            <div className="whitespace-pre-wrap">{m.content}</div>
                            {m.role === 'assistant' &&
                                typeof m.confidence === 'number' &&
                                m.grounded !== null &&
                                m.grounded !== undefined && (
                                    <div className="mt-2">
                                        <ConfidenceBadge confidence={m.confidence} grounded={m.grounded} />
                                    </div>
                                )}
                            {m.role === 'assistant' && m.sources && <Citations sources={m.sources} />}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-surface-2 text-ink-dim border border-edge">
                            <Bot size={18} />
                        </div>
                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-surface-2 border border-edge text-ink-faint text-sm">
                            <span className="inline-flex gap-1 items-center">
                                Thinking
                                <span className="animate-pulse">●</span>
                                <span className="animate-pulse [animation-delay:150ms]">●</span>
                                <span className="animate-pulse [animation-delay:300ms]">●</span>
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-edge bg-canvas/50">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} className="h-10 w-10 p-0">
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
