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
        const [docCount, chatCount, messageCount] = await Promise.all([
            prisma.document.count({ where: { userId } }),
            prisma.chat.count({ where: { userId } }),
            prisma.message.count({
                where: {
                    chat: { userId }
                }
            }),
        ]);

        return NextResponse.json({
            stats: {
                totalDocuments: docCount,
                totalChats: chatCount,
                totalMessages: messageCount,
                level: Math.floor(messageCount / 20) + 1, // Simple level logic
                points: messageCount * 10
            }
        });

    } catch (error) {
        console.error('Progress Fetch Error:', error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
