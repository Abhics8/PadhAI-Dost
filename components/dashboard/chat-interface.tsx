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
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
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
        <div className="mt-2 border-t border-gray-200 pt-2">
            <button
                onClick={() => setOpen((o) => !o)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
                <FileText size={12} />
                {open ? 'Hide' : 'Show'} {sources.length} source{sources.length > 1 ? 's' : ''}
            </button>
            {open && (
                <div className="mt-2 space-y-2">
                    {sources.map((s, i) => (
                        <div key={i} className="text-xs bg-white border border-gray-200 rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-700">
                                    [{i + 1}] Page {s.page}
                                </span>
                                <span className="text-gray-400">
                                    {s.retrievers.join('+')} · {Math.round(s.score * 100)}%
                                </span>
                            </div>
                            <p className="text-gray-600 leading-snug">{s.text}</p>
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
        <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-4xl mx-auto bg-white rounded-lg shadow-sm border">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Bot className="w-12 h-12 mb-2" />
                        <p>Start chatting with your document!</p>
                    </div>
                )}
                {messages.map((m, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div
                            className={`p-2 rounded-full ${
                                m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {m.role === 'user' ? <UserIcon size={20} /> : <Bot size={20} />}
                        </div>
                        <div
                            className={`p-3 rounded-lg max-w-[80%] text-sm ${
                                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
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
                        <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                            <Bot size={20} />
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 text-gray-500 text-sm">Thinking...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-gray-50/50">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        disabled={isLoading}
                        className="flex-1 bg-white"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
