'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/auth-components';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DocumentUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setStatus('idle');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            setStatus('success');
            router.refresh();
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4 bg-surface rounded-2xl border border-edge mb-6">
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.txt"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <Button type="button" variant="outline" className="pointer-events-none relative">
                        <Upload size={16} className="mr-2" />
                        Select Document
                    </Button>
                </div>

                {file && (
                    <div className="flex items-center gap-2 text-sm text-ink-dim flex-1">
                        <FileText size={16} className="text-indigo-400" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                )}

                {file && (
                    <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className={status === 'success' ? '!from-emerald-600 !to-emerald-500' : ''}
                    >
                        {isUploading ? 'Uploading...' : status === 'success' ? 'Uploaded' : 'Start Processing'}
                    </Button>
                )}
            </div>

            {status === 'success' && (
                <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={13} /> Document processed and ready for chat!
                </div>
            )}
            {status === 'error' && (
                <div className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Upload failed. Ensure the backend is running.
                </div>
            )}
        </div>
    );
}
