/* Thin fetch wrapper around the Talon Sandbox API.
 *
 * Base URL strategy:
 *   - dev: VITE_API_BASE points the dev server at a local API (see .env.development)
 *   - prod: same-origin `/api` (served alongside the SPA)
 *
 * Auth: JWT cookie set on sign-in. We also read a token from store as a
 * fallback / for API-key flows. The server is the source of truth.
 */
import { useApp } from '../store';

export const API_BASE: string =
  (import.meta.env['VITE_API_BASE'] as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API ${status}: ${body || '(empty)'}`);
    this.name = 'ApiError';
  }
}

// 来源标记:浏览器不能改 User-Agent,所以 console 自己发的请求统一带一个固定
// 客户端头。后端凭此把 console 创建的 sandbox 归类成 created_from = web-console。
// 收口在统一请求出口(每个动词方法都 spread 这个头),所有 console 请求一致携带。
const CLIENT_HEADER = { 'X-Talon-Client': 'web-console' } as const;

function authHeaders(): Record<string, string> {
  const token = useApp.getState().authToken;
  return token
    ? { ...CLIENT_HEADER, Authorization: `Bearer ${token}` }
    : { ...CLIENT_HEADER };
}

// 鉴权模式:有 Bearer token (API Key 或 JWT 显存) → 不带 cookie,纯 token 流
// 无 token → 走 cookie 流 (login 后由后端 Set-Cookie 写入 sandbox_auth)
// 这样 API Key 用户即便残留旧 cookie 也不会触发 CSRF 校验 (后端只在有 cookie 时启 CSRF)
function credsMode(): RequestCredentials {
  return useApp.getState().authToken ? 'omit' : 'include';
}

async function check(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  if (res.status === 401) {
    useApp.getState().logout();
  }
  throw new ApiError(res.status, body);
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: credsMode(),
    headers: authHeaders(),
    signal,
  });
  await check(res);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: credsMode(),
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body == null ? undefined : JSON.stringify(body),
    signal,
  });
  await check(res);
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: credsMode(),
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body == null ? undefined : JSON.stringify(body),
    signal,
  });
  await check(res);
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    credentials: credsMode(),
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body == null ? undefined : JSON.stringify(body),
    signal,
  });
  await check(res);
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

export async function apiDelete(path: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: credsMode(),
    headers: authHeaders(),
    signal,
  });
  await check(res);
}

/** 下载结果:二进制内容 + 后端通过 Content-Disposition 建议的文件名(可能为空)。 */
export interface DownloadResult {
  blob: Blob;
  /** 从 Content-Disposition `filename=` 解析;后端没给时为 undefined,调用方自定。 */
  filename?: string;
}

/**
 * apiGetBlob — 带鉴权地拉一个二进制响应(导出/下载类端点用)。
 *
 * 与 apiGet 区别:不 res.json(),整体读成 Blob,并解析 Content-Disposition 拿
 * 后端建议的文件名。鉴权/凭据/错误处理与其它动词方法一致(复用 authHeaders /
 * credsMode / check),所以 401 同样触发登出、4xx/5xx 抛 ApiError。
 *
 * 设计成通用下载器而非 workspace 专用:任何返回附件的端点(录制导出、审计 CSV
 * 服务端化等)都能复用,避免每个调用方各自拼 fetch + blob + a.click 模板。
 */
export async function apiGetBlob(path: string, signal?: AbortSignal): Promise<DownloadResult> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: credsMode(),
    headers: authHeaders(),
    signal,
  });
  await check(res);
  const blob = await res.blob();
  return { blob, filename: parseContentDispositionFilename(res.headers.get('Content-Disposition')) };
}

/** 从 Content-Disposition 头解析 filename(支持 filename="x" 与 filename*=UTF-8''x)。 */
function parseContentDispositionFilename(header: string | null): string | undefined {
  if (!header) return undefined;
  // RFC 5987 filename*=UTF-8''... 优先(可含非 ASCII)
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star?.[1]) {
    try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')); } catch { /* fallthrough */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim();
}

/**
 * triggerBrowserDownload — 把一个 Blob 触发为浏览器下载。
 * 标准 createObjectURL + 隐藏 <a> click 模板,统一收口在此供各下载场景复用
 * (PageRecordings / PageAudit 的 CSV 导出也是同模板,后续可迁移到这里)。
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
