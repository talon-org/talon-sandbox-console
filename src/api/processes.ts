/* src/api/processes.ts — 沙箱进程列表 API */
import { apiGet } from './client';
import type { ProcessListResponse } from './types';

/** GET /v1/sandboxes/{id}/processes — 获取沙箱内所有进程 */
export async function listProcesses(
  sandboxId: string,
  signal?: AbortSignal,
): Promise<ProcessListResponse> {
  return apiGet<ProcessListResponse>(`/v1/sandboxes/${sandboxId}/processes`, signal);
}
