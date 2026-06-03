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
        const documents = await prisma.document.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ documents });

    } catch (error) {
        console.error('Documents Fetch Error:', error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
