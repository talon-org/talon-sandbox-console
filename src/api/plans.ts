/* src/api/plans.ts — 超管套餐管理，纯 HTTP，无 React */
import { apiGet, apiPost, API_BASE } from './client';
import { useApp } from '../store';
import { ApiError } from './client';
import type {
  PlanListResponse,
  UpsertPlanRequest,
  PlanDTO,
  SetDefaultPlanRequest,
} from './types';

/** GET /v1/admin/plans — 获取所有套餐（超管） */
export async function listPlans(signal?: AbortSignal): Promise<PlanListResponse> {
  return apiGet<PlanListResponse>('/v1/admin/plans', signal);
}

/** POST /v1/admin/plans — 新建或编辑套餐（超管） */
export async function upsertPlan(req: UpsertPlanRequest, signal?: AbortSignal): Promise<PlanDTO> {
  return apiPost<PlanDTO>('/v1/admin/plans', req, signal);
}

/** PATCH /v1/admin/plans/{code} — 设为默认套餐（超管） */
export async function setDefaultPlan(code: string, signal?: AbortSignal): Promise<void> {
  const token = useApp.getState().authToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const body: SetDefaultPlanRequest = { set_default: true };
  const res = await fetch(`${API_BASE}/v1/admin/plans/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    credentials: token ? 'omit' : 'include',
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) useApp.getState().logout();
    throw new ApiError(res.status, text);
  }
}
