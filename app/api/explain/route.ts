import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { backendPost, sessionIdFor } from '@/lib/backend';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { level } = await req.json();

    try {
        const data = await backendPost('/explain', {
            session_id: sessionIdFor(session),
            level: level || 'Intermediate',
        });
        return NextResponse.json(data);
    } catch (error) {
        console.error('Explain Error:', error);
        return NextResponse.json(
            { message: 'Could not generate an explanation right now. Please try again.' },
            { status: 502 },
        );
    }
}
