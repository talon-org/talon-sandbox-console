import { apiGet, apiPost, apiPatch, ApiError } from './client';
import type { Me } from '../store';
import type { UpdateMeRequest } from './types';

export interface LoginApiKeyPayload {
  api_key: string;
}

// Server returns the token in the body; cookie is also set HttpOnly.
// `tenant_id` echoes the bound tenant; SPA may key admin UI off `__admin`.
export interface LoginResponse {
  token: string;
  expires_at: number;
  tenant_id: string;
  /** 新注册用户为 true；邮箱验证码路径专用，passwordless 注册=登录同一接口 */
  is_new_user?: boolean;
}

/** Request a 6-digit code be emailed. Server always returns {ok:true} (privacy). */
export async function requestCode(email: string, signal?: AbortSignal): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>('/v1/auth/request-code', { email }, signal);
}

/** Verify the code; on success sets cookie + returns token. */
export async function verifyCode(email: string, code: string, signal?: AbortSignal): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/v1/auth/verify-code', { email, code }, signal);
}

/** API-key login: GET /v1/auth/me with Bearer; no password roundtrip. */
export async function loginApiKey(p: LoginApiKeyPayload, signal?: AbortSignal): Promise<{ token: string; me: Me }> {
  const me = await apiGetWithToken<Me>('/v1/auth/me', p.api_key, signal);
  return { token: p.api_key, me };
}

export async function logout(signal?: AbortSignal): Promise<void> {
  await apiPost('/v1/auth/logout', null, signal);
}

export async function getMe(signal?: AbortSignal): Promise<Me> {
  return apiGet<Me>('/v1/auth/me', signal);
}

/** 账户设置:改自己的显示名/偏好(部分更新)。成功返回 {status:"ok"}。 */
export async function updateMe(body: UpdateMeRequest, signal?: AbortSignal): Promise<{ status: string }> {
  return apiPatch<{ status: string }>('/v1/auth/me', body, signal);
}

// helper: one-shot Authorization override (used by API-key login before the
// store has the token). Cookie is not in play yet either.
async function apiGetWithToken<T>(path: string, token: string, signal?: AbortSignal): Promise<T> {
  const base = (import.meta.env['VITE_API_BASE'] as string | undefined) ?? '/api';
  const res = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}
