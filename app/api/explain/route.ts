import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { level } = await req.json();
    const sessionId = session.user.email;

    try {
        const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${pythonBackendUrl}/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                level: level || 'Intermediate'
            }),
        });

        if (!res.ok) {
            console.error("Backend Error:", await res.text());
            return NextResponse.json({ message: 'Backend error' }, { status: 500 });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
