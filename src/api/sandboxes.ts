/* src/api/sandboxes.ts — pure HTTP functions, no React */
import { apiGet, apiPost, apiDelete, apiGetBlob, triggerBrowserDownload, API_BASE } from './client';
import { useApp } from '../store';
import type {
  SandboxDTO, SandboxListResponse, CreateSandboxRequest, SandboxOrigin,
  BatchAction, BatchSandboxResponse,
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
  // 来源追踪（后端 omitempty；admin 列表端点接入后透传，未接入时缺失）
  created_by?: string;
  created_by_type?: 'jwt' | 'api_key';
  api_key_id?: string;
  created_from?: SandboxOrigin;
  remote_ip?: string;
  user_agent?: string;
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
    // 来源追踪字段透传（admin 端点 omitempty，缺失时 undefined，由渲染层兜底）
    created_by: item.created_by,
    created_by_type: item.created_by_type,
    api_key_id: item.api_key_id,
    created_from: item.created_from,
    remote_ip: item.remote_ip,
    user_agent: item.user_agent,
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

/**
 * exportWorkspace — 拉取整个 workspace 的 tar.gz 并触发浏览器下载(Spec 53)。
 *
 * 主要给「销毁前导出」用:销毁会永久删 workspace 数据,导出让用户先把代码/产物
 * 拿回来。后端是流式端点,这里整体读成 blob 再下载(浏览器无法边收边写盘)。
 * 文件名优先用后端 Content-Disposition 给的,缺失时本地兜底成 `<id>-workspace.tar.gz`。
 */
export async function exportWorkspace(id: string, signal?: AbortSignal): Promise<void> {
  const { blob, filename } = await apiGetBlob(`/v1/sandboxes/${id}/workspace/export`, signal);
  triggerBrowserDownload(blob, filename || `${id}-workspace.tar.gz`);
}

/** POST /v1/sandboxes/{id}/start — 启动已停止的 sandbox。 */
export async function startSandbox(id: string, signal?: AbortSignal): Promise<SandboxDTO> {
  return apiPost<SandboxDTO>(`/v1/sandboxes/${id}/start`, {}, signal);
}

/** POST /v1/sandboxes/{id}/stop — 停止运行中的 sandbox。 */
export async function stopSandbox(id: string, signal?: AbortSignal): Promise<SandboxDTO> {
  return apiPost<SandboxDTO>(`/v1/sandboxes/${id}/stop`, {}, signal);
}

/** POST /v1/sandboxes/{id}/pause — 暂停运行中的 sandbox。 */
export async function pauseSandbox(id: string, signal?: AbortSignal): Promise<SandboxDTO> {
  return apiPost<SandboxDTO>(`/v1/sandboxes/${id}/pause`, {}, signal);
}

/**
 * 批量生命周期操作 —— POST /v1/sandboxes/batch/{action}，body { ids }。
 *
 * 后端是部分成功语义：HTTP 恒 200，每条结局在 results 里（ok/skipped/failed）。
 * destroy 后端走 chainOwner（owner 专属），developer 调用会 403——调用方应先按角色
 * 隐藏入口（canBatchDestroySandboxes），这里不重复判，403 由 apiPost 的 check 抛出。
 */
export async function batchSandboxAction(
  action: BatchAction,
  ids: string[],
  signal?: AbortSignal,
): Promise<BatchSandboxResponse> {
  return apiPost<BatchSandboxResponse>(`/v1/sandboxes/batch/${action}`, { ids }, signal);
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
