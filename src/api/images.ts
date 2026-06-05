/* src/api/images.ts — baseimage 目录 + 超管镜像管理,纯 HTTP,无 React
 *
 * 普通用户:GET /v1/images(创建 sandbox 选镜像下拉用)
 * 超管:POST /v1/admin/images(注册) / DELETE / set-default / prewarm
 * 进度:GET /v1/images/{id}/status(非 /admin,认证用户可查)
 *
 * set-default / delete / prewarm 走自定义 fetch:这些端点 204/202 无 body,
 * apiPost/apiDelete 也能用,但 set-default 是 POST 无 body、prewarm 要读 202,
 * 与 plans.ts 的 setDefaultPlan 同款手搓风格保持一致,鉴权/401 处理收口在此。
 */
import { apiGet, apiPost, API_BASE, ApiError } from './client';
import { useApp } from '../store';
import type {
  ImageListResponse,
  ImageDTO,
  CreateImageRequest,
  ImageStatusDTO,
} from './types';

/** GET /v1/images — 列出镜像(普通认证用户即可;超管能看到 url/source 全字段) */
export async function listImages(signal?: AbortSignal): Promise<ImageListResponse> {
  return apiGet<ImageListResponse>('/v1/images', signal);
}

/** POST /v1/admin/images — 注册镜像(超管)。重名 409,校验失败 400 */
export async function createImage(
  req: CreateImageRequest,
  signal?: AbortSignal,
): Promise<ImageDTO> {
  return apiPost<ImageDTO>('/v1/admin/images', req, signal);
}

/** GET /v1/images/{id}/status — 查询镜像准备进度(认证用户可查) */
export async function getImageStatus(
  id: string,
  signal?: AbortSignal,
): Promise<ImageStatusDTO> {
  return apiGet<ImageStatusDTO>(`/v1/images/${encodeURIComponent(id)}/status`, signal);
}

// ── 以下三个为 admin 写操作,后端返 204/202 无 body,手搓 fetch ──────────────

function adminHeaders(): { headers: Record<string, string>; creds: RequestCredentials } {
  const token = useApp.getState().authToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return { headers, creds: token ? 'omit' : 'include' };
}

async function expectOk(res: Response): Promise<void> {
  if (res.ok) return;
  const text = await res.text().catch(() => '');
  if (res.status === 401) useApp.getState().logout();
  throw new ApiError(res.status, text);
}

/** DELETE /v1/admin/images/{id} — 删除(超管)。builtin 镜像后端返 403 */
export async function deleteImage(id: string, signal?: AbortSignal): Promise<void> {
  const { headers, creds } = adminHeaders();
  const res = await fetch(`${API_BASE}/v1/admin/images/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: creds,
    headers,
    signal,
  });
  await expectOk(res);
}

/** POST /v1/admin/images/{id}/default — 设为默认(超管)。无 body,后端 204 */
export async function setDefaultImage(id: string, signal?: AbortSignal): Promise<void> {
  const { headers, creds } = adminHeaders();
  const res = await fetch(`${API_BASE}/v1/admin/images/${encodeURIComponent(id)}/default`, {
    method: 'POST',
    credentials: creds,
    headers,
    signal,
  });
  await expectOk(res);
}

/** POST /v1/admin/images/{id}/prewarm — 触发预热(超管)。后端 202,异步执行,前端轮询 status */
export async function prewarmImage(id: string, signal?: AbortSignal): Promise<void> {
  const { headers, creds } = adminHeaders();
  const res = await fetch(`${API_BASE}/v1/admin/images/${encodeURIComponent(id)}/prewarm`, {
    method: 'POST',
    credentials: creds,
    headers,
    signal,
  });
  await expectOk(res);
}

/** 从 release 的 .sha256 sibling 资产尽力抓取 sha256。
 * GitHub release 资产走 CDN(access-control-allow-origin: *),通常可跨域 GET;
 * 失败(CORS/404/网络)静默返回 null,调用方退回手填——绝不阻塞注册流程。 */
export async function fetchSha256(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`${url}.sha256`, { signal, redirect: 'follow' });
    if (!res.ok) return null;
    const text = await res.text();
    // .sha256 文件形如 "<64hex>  filename";取第一个 64 位 hex token
    const m = text.match(/\b[a-f0-9]{64}\b/i);
    return m ? m[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

/** 从 tarball url 文件名解析架构。约定命名 talon-<flavor>-<ver>-<arch>.tar.gz。
 * arch 是 tarball 实际包含二进制决定的事实,不该让人手填——从命名规律派生即可,
 * 解析不出就回落 amd64(后端默认值,且当前所有产物都是 x86_64)。 */
export function archFromUrl(url: string): string {
  const u = url.toLowerCase();
  if (/\b(aarch64|arm64)\b/.test(u)) return 'arm64';
  if (/\b(x86[_-]?64|amd64)\b/.test(u)) return 'amd64';
  return 'amd64';
}
