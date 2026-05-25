/* src/api/workers.ts — pure HTTP functions, no React */
import { apiGet } from './client';
import type { WorkerListResponse } from './types';

export async function listWorkers(signal?: AbortSignal): Promise<WorkerListResponse> {
  return apiGet<WorkerListResponse>('/v1/admin/workers', signal);
}
