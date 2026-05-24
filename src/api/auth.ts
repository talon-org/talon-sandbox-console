import { apiGet, apiPost } from './client';
import type { Me } from '../store';

export interface LoginPayload {
  email: string;
  password: string;
}
export interface LoginApiKeyPayload {
  api_key: string;
}

export interface LoginResponse {
  token: string;
  me: Me;
}

/** Email + password login. Server sets HttpOnly JWT cookie AND returns token in body. */
export async function loginEmail(p: LoginPayload, signal?: AbortSignal): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/v1/auth/login', p, signal);
}

/** API-key login (long-lived service tokens). */
export async function loginApiKey(p: LoginApiKeyPayload, signal?: AbortSignal): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/v1/auth/login', p, signal);
}

export async function logout(signal?: AbortSignal): Promise<void> {
  await apiPost('/v1/auth/logout', null, signal);
}

export async function getMe(signal?: AbortSignal): Promise<Me> {
  return apiGet<Me>('/v1/auth/me', signal);
}
