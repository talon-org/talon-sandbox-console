/* src/hooks/useSystemConfig.ts — 平台配置中心(Spec 52)react-query hooks(超管专用) */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSystemConfig, updateSystemConfig } from '../api/systemConfig';
import type { PlatformSettingsResponse, UpdatePlatformSettingsRequest } from '../api/types';

export const SYSCONF_KEY = ['system-config'] as const;

/** 读取平台配置(脱敏快照) */
export function useSystemConfig() {
  return useQuery<PlatformSettingsResponse>({
    queryKey: SYSCONF_KEY,
    queryFn: ({ signal }) => getSystemConfig(signal),
  });
}

/** 批量写入配置变更(只写覆盖) */
export function useUpdateSystemConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdatePlatformSettingsRequest) => updateSystemConfig(req),
    // 后端写完回包最新脱敏快照,直接灌入缓存,避免再请求一次。
    onSuccess: (data) => qc.setQueryData(SYSCONF_KEY, data),
  });
}
