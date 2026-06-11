import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { backendPost, sessionIdFor } from '@/lib/backend';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { num_questions, difficulty, type } = await req.json();

    try {
        const data = await backendPost('/pucho', {
            session_id: sessionIdFor(session),
            num_questions: num_questions || 5,
            difficulty: difficulty || 5,
            type: type || 'Subjective',
        });
        return NextResponse.json(data);
    } catch (error) {
        console.error('Pucho Error:', error);
        return NextResponse.json(
            { message: 'Could not generate questions right now. Please try again.' },
            { status: 502 },
        );
    }
}
