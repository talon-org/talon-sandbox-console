/* src/api/apiKeys.ts — 自助 API Key 管理，纯 HTTP，无 React
 * 风格对齐 src/api/secrets.ts：apiGet / apiPost / apiDelete + 手动 fetch for reveal
 */
import { apiGet, apiPost, apiDelete, API_BASE } from './client';
import { useApp } from '../store';
import { ApiError } from './client';
import type {
  ApiKeyListResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  RevealApiKeyResponse,
} from './types';

/** GET /v1/api-keys — 列出当前租户 API Keys（viewer 可读） */
export async function listApiKeys(signal?: AbortSignal): Promise<ApiKeyListResponse> {
  return apiGet<ApiKeyListResponse>('/v1/api-keys', signal);
}

/** POST /v1/api-keys — 创建 Key，响应含明文 api_key（developer+ 权限） */
export async function createApiKey(
  req: CreateApiKeyRequest,
  signal?: AbortSignal,
): Promise<CreateApiKeyResponse> {
  return apiPost<CreateApiKeyResponse>('/v1/api-keys', req, signal);
}

/** GET /v1/api-keys/{id}/reveal — 取完整明文，用于复制（developer+ 权限） */
export async function revealApiKey(
  id: string,
  signal?: AbortSignal,
): Promise<RevealApiKeyResponse> {
  // 复用与 secrets.ts rotateSecret 相同的手动 fetch 模式，
  // 因为 reveal 端点是 GET 但语义上不同于幂等列表查询
  const token = useApp.getState().authToken;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/v1/api-keys/${id}/reveal`, {
    credentials: token ? 'omit' : 'include',
    headers,
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401) useApp.getState().logout();
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<RevealApiKeyResponse>;
}

/** DELETE /v1/api-keys/{id} — 吊销 Key，返回 204（developer+ 权限） */
export async function deleteApiKey(id: string, signal?: AbortSignal): Promise<void> {
  return apiDelete(`/v1/api-keys/${id}`, signal);
}
