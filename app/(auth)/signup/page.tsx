import { SignUpForm } from '@/components/ui/auth-forms';
import Link from 'next/link';
import { Metadata } from 'next';
import { BookOpen, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Sign Up - PadhAI Dost',
};

export default function SignupPage() {
    return (
        <div className="flex min-h-screen w-full lg:grid lg:grid-cols-2 bg-canvas">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex flex-col justify-between bg-surface border-r border-edge p-10 text-ink relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent"></div>
                <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[120px]"></div>

                <div className="relative z-10 flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-semibold tracking-tight">PadhAI Dost</span>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-3xl font-bold mb-4">Join the Revolution.</h2>
                    <p className="text-ink-dim text-lg leading-relaxed">
                        Create an account to unlock unlimited AI-powered flashcards, smart document chat, and personalized learning paths.
                    </p>
                    <div className="mt-8 flex gap-4">
                        <div className="flex items-center gap-2 text-sm text-ink-dim">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                            AI-Powered
                        </div>
                        <div className="flex items-center gap-2 text-sm text-ink-dim">
                            <BookOpen className="h-4 w-4 text-indigo-400" />
                            Smart Learning
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-ink-faint">
                    &copy; 2026 PadhAI Dost Inc.
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex flex-col items-center justify-center p-8 bg-canvas">
                <div className="w-full max-w-[350px] space-y-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-ink">
                            Create an Account
                        </h1>
                        <p className="text-sm text-ink-dim">
                            Enter your email below to create your account
                        </p>
                    </div>

                    <SignUpForm />

                    <div className="px-8 text-center text-xs text-ink-faint leading-relaxed">
                        By clicking create account, you agree to our{' '}
                        <Link href="/terms" className="underline underline-offset-4 hover:text-ink">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
                            Privacy Policy
                        </Link>.
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-ink-dim">Already have an account? </span>
                        <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                            Log in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
