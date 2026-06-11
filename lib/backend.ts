/**
 * Server-side client for the Python RAG backend.
 *
 * Security model: the browser never talks to the Python backend directly.
 * Next.js route handlers authenticate the user via NextAuth, then call the
 * backend with two server-only secrets:
 *   - the session id is derived from the authenticated user's id (never
 *     accepted from the client), closing the "guess someone else's
 *     session_id" hole.
 *   - X-Internal-API-Key proves the request came from our Next.js layer.
 */
import { Session } from 'next-auth';

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

/** Stable, server-derived session id for a logged-in user. */
export function sessionIdFor(session: Session): string {
    // user.id is the immutable NextAuth/Prisma cuid — not user-controllable.
    return `user_${session.user!.id}`;
}

function headers(json = true): Record<string, string> {
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    if (INTERNAL_API_KEY) h['X-Internal-API-Key'] = INTERNAL_API_KEY;
    return h;
}

/** POST JSON to a backend endpoint. Throws on non-2xx. */
export async function backendPost<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Backend ${path} failed: ${res.status} ${detail.slice(0, 300)}`);
    }
    return res.json() as Promise<T>;
}

/** Upload a multipart file to the backend for the given session. */
export async function backendUpload(sessionId: string, file: File): Promise<Response> {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BACKEND_URL}/upload?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: headers(false),
        body: form,
    });
}
