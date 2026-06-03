import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

    const sessionId = session.user.email;

    try {
        const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${pythonBackendUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                message: message,
            }),
        });

        if (!res.ok) {
            console.error("Backend Error:", await res.text());
            return NextResponse.json({ message: 'Backend error' }, { status: 500 });
        }

        const data = await res.json();

        let chat = await prisma.chat.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });

        if (!chat) {
            chat = await prisma.chat.create({
                data: {
                    userId,
                    title: message.slice(0, 50),
                },
            });
        }

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

        return NextResponse.json({ answer: data.answer });

    } catch (error) {
        console.error('Chat Error:', error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
