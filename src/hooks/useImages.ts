/* src/hooks/useImages.ts — 镜像列表(创建 sandbox 下拉) + 超管管理 mutation + 进度轮询 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listImages,
  createImage,
  deleteImage,
  setDefaultImage,
  prewarmImage,
  getImageStatus,
} from '../api/images';
import type {
  ImageListResponse,
  ImageStatusDTO,
  CreateImageRequest,
} from '../api/types';

export const IMAGES_KEY = ['images'] as const;
export const imageStatusKey = (id: string) => ['images', id, 'status'] as const;

/** 列出可用镜像。超管页与创建 sandbox 下拉共用同一端点/缓存。 */
export function useImages() {
  return useQuery<ImageListResponse>({
    queryKey: IMAGES_KEY,
    queryFn: ({ signal }) => listImages(signal),
    // 镜像列表变更频率低,5 分钟 stale time 足够
    staleTime: 5 * 60_000,
  });
}

/** 超管:注册镜像。成功后失效列表缓存。 */
export function useCreateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateImageRequest) => createImage(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMAGES_KEY }),
  });
}

/** 超管:删除镜像。 */
export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMAGES_KEY }),
  });
}

/** 超管:设为默认镜像。 */
export function useSetDefaultImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setDefaultImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMAGES_KEY }),
  });
}

/** 超管:触发预热。后端异步,不在此等待完成——成功只代表已受理(202),
 * 进度由 useImageStatus 轮询。失效该镜像的 status 缓存以立刻重启轮询。 */
export function usePrewarmImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prewarmImage(id),
    onSuccess: (_void, id) => qc.invalidateQueries({ queryKey: imageStatusKey(id) }),
  });
}

/** 轮询单个镜像的准备进度。enabled=false 时完全不发请求(避免每行常驻轮询)。
 * 到达终态(ready/failed)后停止轮询。 */
export function useImageStatus(id: string, enabled: boolean) {
  return useQuery<ImageStatusDTO>({
    queryKey: imageStatusKey(id),
    queryFn: ({ signal }) => getImageStatus(id, signal),
    enabled: enabled && id.length > 0,
    // 进行中每 2.5s 拉一次;到终态 refetchInterval 返回 false 停止
    refetchInterval: (q) => {
      const stage = q.state.data?.stage;
      return stage === 'ready' || stage === 'failed' ? false : 2_500;
    },
  });
}
