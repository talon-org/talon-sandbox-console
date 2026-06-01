/* src/api/systemConfig.ts — 平台配置中心(Spec 52)纯 HTTP 函数,无 React。
 * API path: /v1/admin/settings(超管租户专属)
 * UI label: "系统配置"
 */
import { apiGet, apiPut } from './client';
import type {
  PlatformSettingsResponse, UpdatePlatformSettingsRequest,
} from './types';

export async function getSystemConfig(
  signal?: AbortSignal,
): Promise<PlatformSettingsResponse> {
  return apiGet<PlatformSettingsResponse>('/v1/admin/settings', signal);
}

export async function updateSystemConfig(
  req: UpdatePlatformSettingsRequest,
  signal?: AbortSignal,
): Promise<PlatformSettingsResponse> {
  return apiPut<PlatformSettingsResponse>('/v1/admin/settings', req, signal);
}
