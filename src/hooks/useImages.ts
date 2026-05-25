/* src/hooks/useImages.ts — 列出可用 baseimage,供创建 sandbox dropdown 使用 */
import { useQuery } from '@tanstack/react-query';
import { listImages } from '../api/images';
import type { ImageListResponse } from '../api/types';

export const IMAGES_KEY = ['images'] as const;

export function useImages() {
  return useQuery<ImageListResponse>({
    queryKey: IMAGES_KEY,
    queryFn: ({ signal }) => listImages(signal),
    // 镜像列表变更频率低,5 分钟 stale time 足够
    staleTime: 5 * 60_000,
  });
}
