/* src/api/users.ts — 按 user id 解析公开档案,纯 HTTP,无 React。
 *
 * 给「把 sandbox.created_by 等 user id 显示成用户名/邮箱」用。后端跨租户隔离已收口:
 * 普通成员只能查本租户,超管可跨租户(查看他租户 sandbox 的创建者)。查不到/无权 → 404。
 */
import { apiGet } from './client';
import type { UserProfile } from './types';

/** GET /v1/users/{id} —— 解析单个用户的公开档案(id/email/name/tenant)。 */
export async function getUser(id: string, signal?: AbortSignal): Promise<UserProfile> {
  return apiGet<UserProfile>(`/v1/users/${id}`, signal);
}
