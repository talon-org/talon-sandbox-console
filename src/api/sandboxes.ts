/* src/api/sandboxes.ts — pure HTTP functions, no React */
import { apiGet, apiPost, apiDelete, API_BASE } from './client';
import { useApp } from '../store';
import type {
  SandboxDTO, SandboxListResponse, CreateSandboxRequest,
} from './types';

export async function listSandboxes(signal?: AbortSignal): Promise<SandboxListResponse> {
  return apiGet<SandboxListResponse>('/v1/sandboxes', signal);
}

/** GET /v1/admin/sandboxes 响应体 — 与后端 adminSandboxDTO 字段一一对应 */
interface AdminSandboxDTO {
  id: string;
  tenant_id: string;
  worker_id: string;
  state: string;
  profile: string;
  created_at: number;   // Unix 秒
  updated_at: number;   // Unix 秒
}

interface AdminSandboxListResponse {
  sandboxes: AdminSandboxDTO[];
}

/**
 * 超管专用：拉取全租户 sandbox 列表。
 * 返回值映射成 SandboxListResponse，与普通列表页渲染路径完全复用。
 * adminSandboxDTO 缺少 cpu_millis / memory_bytes / image_id 等运行时字段
 * ——这些字段在 SandboxDTO 中均为 optional，渲染层用 ?? '—' 兜底，不会崩。
 */
export async function listAdminSandboxes(signal?: AbortSignal): Promise<SandboxListResponse> {
  const raw = await apiGet<AdminSandboxListResponse>('/v1/admin/sandboxes', signal);
  const sandboxes: SandboxDTO[] = raw.sandboxes.map((item) => ({
    id: item.id,
    // adminSandboxDTO.state 与普通 SandboxDTO.state 枚举值相同，直接转型
    state: item.state as SandboxDTO['state'],
    profile: item.profile,
    created_at: item.created_at,
    // admin 端点无 updated_at 对应字段，last_active_at 用 updated_at 近似
    last_active_at: item.updated_at,
    tenant_id: item.tenant_id,
    worker_id: item.worker_id,
    // 运行时字段（cpu/mem/image_id 等）admin 端点不暴露，留 undefined 由渲染层兜底
  }));
  return { sandboxes };
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
