/* src/api/secrets.ts — pure HTTP functions, no React */
import { apiGet, apiPost, API_BASE, ApiError } from './client';
import { useApp } from '../store';
import type {
  SecretListResponse, SecretDTO,
  CreateSecretRequest, RotateSecretRequest,
} from './types';

export async function listSecrets(signal?: AbortSignal): Promise<SecretListResponse> {
  return apiGet<SecretListResponse>('/v1/secrets', signal);
}

export async function createSecret(
  req: CreateSecretRequest,
  signal?: AbortSignal,
): Promise<SecretDTO> {
  return apiPost<SecretDTO>('/v1/secrets', req, signal);
}

/** PATCH /v1/secrets/{id} — marks last_rotated_at only (value unchanged) */
export async function rotateSecret(
  id: string,
  req?: RotateSecretRequest,
  signal?: AbortSignal,
): Promise<SecretDTO> {
  const token = useApp.getState().authToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/v1/secrets/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: JSON.stringify(req ?? {}),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401) useApp.getState().logout();
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<SecretDTO>;
}
