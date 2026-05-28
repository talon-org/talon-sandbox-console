/* src/api/images.ts — baseimage 目录(列出可用 image 给 create sandbox dropdown)
 * API path: /v1/images (普通认证用户可调,非 admin)
 */
import { apiGet } from './client';
import type { ImageListResponse } from './types';

export async function listImages(signal?: AbortSignal): Promise<ImageListResponse> {
  return apiGet<ImageListResponse>('/v1/images', signal);
}
