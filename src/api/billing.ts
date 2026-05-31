/* src/api/billing.ts — 租户侧计费：用量 / 订阅 / 可选套餐 / 升降级。纯 HTTP，无 React。
 * 区别于 api/plans.ts（超管 /v1/admin/plans）：这里全是租户可读/可操作端点。 */
import { apiGet, apiPost } from './client';
import type {
  UsageResponse,
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
