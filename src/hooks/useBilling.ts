/* src/hooks/useBilling.ts — 租户侧计费 react-query hooks */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsage, getSubscription, listAvailablePlans, upgradePlan,
} from '../api/billing';
import type {
  UsageResponse, SubscriptionDTO, PublicPlanListResponse, UpgradePlanRequest,
} from '../api/types';

export const USAGE_KEY = ['usage'] as const;
export const SUBSCRIPTION_KEY = ['subscription'] as const;
export const AVAILABLE_PLANS_KEY = ['availablePlans'] as const;

/** 当前租户用量（viewer 可读） */
export function useUsage() {
  return useQuery<UsageResponse>({
    queryKey: USAGE_KEY,
    queryFn: ({ signal }) => getUsage(signal),
  });
}

/** 当前租户订阅状态（viewer 可读） */
export function useSubscription() {
  return useQuery<SubscriptionDTO>({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: ({ signal }) => getSubscription(signal),
  });
}

/** 可选套餐列表（viewer 可读） */
export function useAvailablePlans() {
  return useQuery<PublicPlanListResponse>({
    queryKey: AVAILABLE_PLANS_KEY,
    queryFn: ({ signal }) => listAvailablePlans(signal),
  });
}

/** 升/降级套餐（owner）。成功后刷新订阅；免费档立即生效，付费档由调用方处理 checkout_url。 */
export function useUpgradePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpgradePlanRequest) => upgradePlan(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
      qc.invalidateQueries({ queryKey: USAGE_KEY });
    },
  });
}
