/* Thin fetch wrapper around talon-sandbox platform API.
 *
 * Base URL strategy:
 *   - dev: VITE_API_BASE -> http://localhost:18080 (set in .env.development)
 *   - prod: same-origin /api (proxied by Caddy to 127.0.0.1:18080)
 *
 * Auth: JWT cookie set by /v1/auth/login. We still read a token from store as
 * a fallback / for API-key flows. Server is source of truth.
 */
import { useApp } from '../store';

export const API_BASE: string =
  (import.meta.env['VITE_API_BASE'] as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API ${status}: ${body || '(empty)'}`);
    this.name = 'ApiError';
  }
}

function authHeaders(): Record<string, string> {
  const token = useApp.getState().authToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function check(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  if (res.status === 401) {
    useApp.getState().logout();
  }
  throw new ApiError(res.status, body);
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: authHeaders(),
    signal,
  });
  await check(res);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body == null ? undefined : JSON.stringify(body),
    signal,
  });
  await check(res);
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

export async function apiDelete(path: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
    signal,
  });
  await check(res);
}
