import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { backendUpload, sessionIdFor } from '@/lib/backend';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const sessionId = sessionIdFor(session); // server-derived, not client-supplied

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ message: 'No file provided' }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ message: 'File too large. Max 10MB.' }, { status: 400 });
        }

        const allowedTypes = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { message: 'Unsupported file type. Upload PDF, TXT, PNG, or JPEG.' },
                { status: 400 },
            );
        }

        const res = await backendUpload(sessionId, file);
        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error('Backend Upload Error:', errText);
            return NextResponse.json({ message: 'Upload processing failed' }, { status: 502 });
        }
        const data = await res.json().catch(() => ({}));

        await prisma.document.create({
            data: {
                userId,
                filename: file.name,
                fileType: file.type,
                fileSize: file.size,
            },
        });

        return NextResponse.json({
            status: 'success',
            message: data.message ?? 'Document processed and ready for chat.',
            cached: data.cached ?? false,
        });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ message: 'Upload failed. Please try again.' }, { status: 500 });
    }
}
