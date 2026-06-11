'use client';

import { useActionState, useState } from 'react';
import { Button, Input } from '@/components/ui/auth-components';
import { authenticate } from '@/app/lib/actions';
import { useRouter } from 'next/navigation';

export function LoginForm() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    );

    return (
        <form action={formAction} className="space-y-4 w-full">
            <div>
                <label className="block text-sm font-medium mb-1.5 text-ink-dim" htmlFor="email">Email</label>
                <Input type="email" name="email" id="email" required placeholder="user@example.com" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1.5 text-ink-dim" htmlFor="password">Password</label>
                <Input type="password" name="password" id="password" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Logging in...' : 'Log in'}
            </Button>
            {errorMessage && (
                <div className="text-red-400 text-sm mt-2">
                    {errorMessage}
                </div>
            )}
        </form>
    );
}

export function SignUpForm() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsPending(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = formData.get('email');
        const password = formData.get('password');
        const name = formData.get('name');

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, name }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Something went wrong');
            }

            setSuccess(true);
            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
            <input type="hidden" name="name" value="User" />
            {/* Could add Name input field here */}
            <div>
                <label className="block text-sm font-medium mb-1.5 text-ink-dim" htmlFor="email">Email</label>
                <Input type="email" name="email" id="email" required placeholder="user@example.com" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1.5 text-ink-dim" htmlFor="password">Password</label>
                <Input type="password" name="password" id="password" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Creating Account...' : 'Sign Up'}
            </Button>
            {error && (
                <div className="text-red-400 text-sm mt-2">
                    {error}
                </div>
            )}
            {success && (
                <div className="text-emerald-400 text-sm mt-2">
                    Account created! Redirecting to login...
                </div>
            )}
        </form>
    );
}
