/* src/hooks/useDashboard.ts */
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard';
import type { DashboardResponse } from '../api/types';

export const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboard(tenantId?: string) {
  return useQuery<DashboardResponse>({
    queryKey: [...DASHBOARD_KEY, tenantId],
    queryFn: ({ signal }) => getDashboard(tenantId, signal),
    refetchInterval: 30_000,
  });
}
