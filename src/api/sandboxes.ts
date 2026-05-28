/* src/api/sandboxes.ts — pure HTTP functions, no React */
import { apiGet, apiPost, apiDelete, API_BASE } from './client';
import { useApp } from '../store';
import type {
  SandboxDTO, SandboxListResponse, CreateSandboxRequest,
} from './types';

export async function listSandboxes(signal?: AbortSignal): Promise<SandboxListResponse> {
  return apiGet<SandboxListResponse>('/v1/sandboxes', signal);
}

export async function getSandbox(id: string, signal?: AbortSignal): Promise<SandboxDTO> {
  return apiGet<SandboxDTO>(`/v1/sandboxes/${id}`, signal);
}

export async function createSandbox(
  req: CreateSandboxRequest,
  signal?: AbortSignal,
): Promise<SandboxDTO> {
  return apiPost<SandboxDTO>('/v1/sandboxes', req, signal);
}

export async function deleteSandbox(id: string, signal?: AbortSignal): Promise<void> {
  return apiDelete(`/v1/sandboxes/${id}`, signal);
}

/** WebSocket URL for PTY connection.
 *
 * Auth handling differs from regular fetch() calls: the browser WebSocket API
 * cannot attach an Authorization header, so Bearer-mode clients must pass the
 * token via the `access_token` query param (matches the server's OAuth2 §2.3
 * fallback in middleware/auth.go). Cookie-mode clients leave it off — the
 * same-origin cookie is sent automatically by the browser during the upgrade.
 */
export function sandboxPtyUrl(id: string): string {
  const token = useApp.getState().authToken;
  // Convert http(s) base to ws(s); if relative path, use current host.
  const wsBase = API_BASE.startsWith('http')
    ? API_BASE.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${API_BASE}`;
  const params = token ? `?access_token=${encodeURIComponent(token)}` : '';
  return `${wsBase}/v1/sandboxes/${id}/pty${params}`;
}
