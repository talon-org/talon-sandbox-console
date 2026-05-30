/* src/hooks/usePlans.ts — 套餐管理的 react-query hooks（超管专用） */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPlans, upsertPlan, setDefaultPlan } from '../api/plans';
import type { PlanListResponse, UpsertPlanRequest } from '../api/types';

export const PLANS_KEY = ['plans'] as const;

/** 列出所有套餐 */
export function usePlans() {
  return useQuery<PlanListResponse>({
    queryKey: PLANS_KEY,
    queryFn: ({ signal }) => listPlans(signal),
  });
}

/** 新建或编辑套餐 */
export function useUpsertPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpsertPlanRequest) => upsertPlan(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** 设为默认套餐 */
export function useSetDefaultPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => setDefaultPlan(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}
