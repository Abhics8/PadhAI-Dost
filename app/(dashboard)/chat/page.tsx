import DocumentUploader from '@/components/dashboard/document-uploader';
import ChatInterface from '@/components/dashboard/chat-interface';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Chat - PadhAI Dost',
};

export default function ChatPage() {
    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1 text-ink">Study Session</h1>
                <p className="text-ink-dim text-sm">Upload a document to start chatting with your AI tutor.</p>
            </div>

            <DocumentUploader />

            <div className="flex-1 min-h-0">
                <ChatInterface />
            </div>
        </div>
    );
}
