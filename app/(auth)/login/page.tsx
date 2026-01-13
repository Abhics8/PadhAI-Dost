import { LoginForm } from '@/components/ui/auth-forms';
import Link from 'next/link';
import { Metadata } from 'next';
import { BookOpen, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Login - PadhAI Dost',
};

export default function LoginPage() {
    return (
        <div className="flex min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent"></div>

                <div className="relative z-10 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                        PD
                    </div>
                    <span className="text-xl font-semibold tracking-tight">PadhAI Dost</span>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-3xl font-bold mb-4">Your Intelligence, Augmented.</h2>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice."
                    </p>
                    <div className="mt-8 flex gap-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <Sparkles className="h-4 w-4 text-blue-400" />
                            AI-Powered
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <BookOpen className="h-4 w-4 text-blue-400" />
                            Instant Flashcards
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-zinc-500">
                    &copy; 2026 PadhAI Dost Inc.
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-950">
                <div className="w-full max-w-[350px] space-y-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Enter your email to sign in to your account
                        </p>
                    </div>

                    <LoginForm />

                    <div className="px-8 text-center text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        By clicking continue, you agree to our{' '}
                        <Link href="/terms" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-50">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-50">
                            Privacy Policy
                        </Link>.
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-zinc-500">New here? </span>
                        <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-500 underline underline-offset-2">
                            Create an account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

