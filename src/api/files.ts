/* src/api/files.ts — 沙箱文件系统 API (Spec 35) */
import { apiGet, API_BASE } from './client';
import { useApp } from '../store';
import type { FSListResponse } from './types';

/** GET /v1/sandboxes/{id}/fs-list/{path} — 列目录（path 可为空 = 根目录） */
export async function listFiles(
  sandboxId: string,
  path: string,
  signal?: AbortSignal,
): Promise<FSListResponse> {
  // path 可为空（根目录），尾部斜杠统一去除
  const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const endpoint = cleanPath
    ? `/v1/sandboxes/${sandboxId}/fs-list/${cleanPath}`
    : `/v1/sandboxes/${sandboxId}/fs-list`;
  return apiGet<FSListResponse>(endpoint, signal);
}

/**
 * GET /v1/sandboxes/{id}/fs/{path} — 读取文件内容（文本）。
 * 返回原始 Response，调用方按 Content-Type 处理。
 */
export async function readFile(
  sandboxId: string,
  path: string,
  signal?: AbortSignal,
): Promise<Response> {
  const token = useApp.getState().authToken;
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const cleanPath = path.replace(/^\/+/, '');
  const res = await fetch(
    `${API_BASE}/v1/sandboxes/${sandboxId}/fs/${cleanPath}`,
    { credentials: 'include', headers, signal },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || '(empty)'}`);
  }
  return res;
}
