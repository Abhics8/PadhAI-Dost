import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // Find the most recent chat for the user
        const chat = await prisma.chat.findFirst({
            where: { userId: userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50, // Get last 50 messages
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (!chat) {
            return NextResponse.json({ messages: [] });
        }

        return NextResponse.json({ messages: chat.messages });

    } catch (error) {
        console.error('History Fetch Error:', error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
