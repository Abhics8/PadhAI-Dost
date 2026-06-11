import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { backendPost, sessionIdFor } from '@/lib/backend';

interface Source {
    page: number;
    text: string;
    score: number;
    retrievers: string[];
}

interface ChatResponse {
    answer: string;
    sources: Source[];
    confidence: number;
    grounded: boolean;
}

const HISTORY_WINDOW = 5; // exchanges of context sent to the backend for condensing

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
        return NextResponse.json({ message: 'Message is required' }, { status: 400 });
    }

    // session id is derived from the authenticated user — never from the client.
    const sessionId = sessionIdFor(session);

    try {
        // Reuse the user's most recent chat, or start one.
        let chat = await prisma.chat.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });
        if (!chat) {
            chat = await prisma.chat.create({
                data: { userId, title: message.slice(0, 50) },
            });
        }

        // Load recent history for multi-turn condensing (last N exchanges).
        const prior = await prisma.message.findMany({
            where: { chatId: chat.id },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_WINDOW * 2,
        });
        const history = prior
            .reverse()
            .map((m) => ({ role: m.role, content: m.content }));

        const data = await backendPost<ChatResponse>('/chat', {
            session_id: sessionId,
            message,
            history,
        });

        // Persist the exchange (sources stored on the assistant message as JSON
        // prefix-free: kept in a separate column would need a migration, so we
        // return them to the client live and store just the text).
        await prisma.message.createMany({
            data: [
                { chatId: chat.id, role: 'user', content: message },
                { chatId: chat.id, role: 'assistant', content: data.answer },
            ],
        });
        await prisma.chat.update({
            where: { id: chat.id },
            data: { updatedAt: new Date() },
        });

        return NextResponse.json({
            answer: data.answer,
            sources: data.sources ?? [],
            confidence: data.confidence ?? null,
            grounded: data.grounded ?? null,
        });
    } catch (error) {
        console.error('Chat Error:', error);
        return NextResponse.json(
            { message: 'We could not generate an answer right now. Please try again.' },
            { status: 502 },
        );
    }
}
