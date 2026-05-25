/* src/api/workers.ts — pure HTTP functions, no React */
import { apiGet, apiPost } from './client';
import type { WorkerListResponse, WorkerInviteResponse } from './types';

export async function listWorkers(signal?: AbortSignal): Promise<WorkerListResponse> {
  return apiGet<WorkerListResponse>('/v1/admin/workers', signal);
}

/** G6: POST /v1/admin/workers/invite — 生成单次 worker 邀请令牌（仅限 admin） */
export async function inviteWorker(): Promise<WorkerInviteResponse> {
  return apiPost<WorkerInviteResponse>('/v1/admin/workers/invite', {});
}
