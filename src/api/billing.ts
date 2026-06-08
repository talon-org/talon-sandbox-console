/* src/api/billing.ts — 租户侧计费：用量 / 订阅 / 可选套餐 / 升降级。纯 HTTP，无 React。
 * 区别于 api/plans.ts（超管 /v1/admin/plans）：这里全是租户可读/可操作端点。 */
import { apiGet, apiPost, apiPut } from './client';
import type {
  UsageResponse,
  UsageByLabelResponse,
  SetMeteringLabelKeyRequest,
  SubscriptionDTO,
  PublicPlanListResponse,
  UpgradePlanRequest,
  UpgradePlanResponse,
} from './types';

/** GET /v1/usage — 当前租户逐日用量 + 合计 */
export async function getUsage(signal?: AbortSignal): Promise<UsageResponse> {
  return apiGet<UsageResponse>('/v1/usage', signal);
}

/** GET /v1/billing/subscription — 当前租户订阅状态 */
export async function getSubscription(signal?: AbortSignal): Promise<SubscriptionDTO> {
  return apiGet<SubscriptionDTO>('/v1/billing/subscription', signal);
}

/** GET /v1/plans — 可选套餐列表（仅 active，含价格） */
export async function listAvailablePlans(signal?: AbortSignal): Promise<PublicPlanListResponse> {
  return apiGet<PublicPlanListResponse>('/v1/plans', signal);
}

/** POST /v1/billing/upgrade-plan — 升/降级套餐（owner）。
 *  免费/降级 applied=true 立即生效；付费返回 checkout_url 需跳转支付。 */
export async function upgradePlan(req: UpgradePlanRequest, signal?: AbortSignal): Promise<UpgradePlanResponse> {
  return apiPost<UpgradePlanResponse>('/v1/billing/upgrade-plan', req, signal);
}

/** GET /v1/usage/by-label — 按终端用户（label）的资源用量分组。
 *  label_key 由租户配置；未配置时 label_key 为空串且 groups 为空数组。 */
export async function getUsageByLabel(
  since: string,
  until: string,
  signal?: AbortSignal,
): Promise<UsageByLabelResponse> {
  return apiGet<UsageByLabelResponse>(
    `/v1/usage/by-label?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
    signal,
  );
}

/** PUT /v1/billing/metering-label-key — 设置拆分维度（owner 专属）。
 *  传空串 key 即关闭拆分。返回 { key }。 */
export async function setMeteringLabelKey(
  req: SetMeteringLabelKeyRequest,
  signal?: AbortSignal,
): Promise<{ key: string }> {
  return apiPut<{ key: string }>('/v1/billing/metering-label-key', req, signal);
}
