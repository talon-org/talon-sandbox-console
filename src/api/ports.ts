/* src/api/ports.ts — 沙箱端口暴露 API (Spec 50) */
import { apiGet, apiPost, apiDelete } from './client';
import type {
  ExposedPortListResponse,
  ExposeRequest,
  ExposeResponse,
} from './types';

/** GET /v1/sandboxes/{id}/expose — 列出已暴露端口 */
export async function listExposedPorts(
  sandboxId: string,
  signal?: AbortSignal,
): Promise<ExposedPortListResponse> {
  return apiGet<ExposedPortListResponse>(`/v1/sandboxes/${sandboxId}/expose`, signal);
}

/** POST /v1/sandboxes/{id}/expose — 暴露新端口 */
export async function exposePort(
  sandboxId: string,
  req: ExposeRequest,
  signal?: AbortSignal,
): Promise<ExposeResponse> {
  return apiPost<ExposeResponse>(`/v1/sandboxes/${sandboxId}/expose`, req, signal);
}

/** DELETE /v1/sandboxes/{id}/expose/{port} — 取消暴露端口 */
export async function unexposePort(
  sandboxId: string,
  port: number,
  signal?: AbortSignal,
): Promise<void> {
  return apiDelete(`/v1/sandboxes/${sandboxId}/expose/${port}`, signal);
}
