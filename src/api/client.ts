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

// 鉴权模式:有 Bearer token (API Key 或 JWT 显存) → 不带 cookie,纯 token 流
// 无 token → 走 cookie 流 (login 后由后端 Set-Cookie 写入 sandbox_auth)
// 这样 API Key 用户即便残留旧 cookie 也不会触发 CSRF 校验 (后端只在有 cookie 时启 CSRF)
function credsMode(): RequestCredentials {
  return useApp.getState().authToken ? 'omit' : 'include';
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
    credentials: credsMode(),
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
    credentials: credsMode(),
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
    credentials: credsMode(),
    headers: authHeaders(),
    signal,
  });
  await check(res);
}
