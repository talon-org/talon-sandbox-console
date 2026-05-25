/* src/api/dashboard.ts — pure HTTP functions, no React */
import { apiGet } from './client';
import type { DashboardResponse } from './types';

export async function getDashboard(
  tenantId?: string,
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  const params = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
  return apiGet<DashboardResponse>(`/v1/metrics/dashboard${params}`, signal);
}
