/* src/hooks/useSandboxPorts.ts — 已暴露端口列表 + 暴露/取消暴露操作 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listExposedPorts, exposePort, unexposePort } from '../api/ports';
import type { ExposedPortListResponse, ExposeRequest } from '../api/types';

/** 端口列表 query key 工厂 */
const portsKey = (sandboxId: string) => ['sandbox-ports', sandboxId] as const;

/** 查询已暴露端口（不轮询；用户操作后手动 invalidate） */
export function useSandboxPorts(sandboxId: string) {
  return useQuery<ExposedPortListResponse>({
    queryKey: portsKey(sandboxId),
    queryFn: ({ signal }) => listExposedPorts(sandboxId, signal),
    enabled: sandboxId.length > 0,
  });
}

/** 暴露新端口 */
export function useExposePort(sandboxId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ExposeRequest) => exposePort(sandboxId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: portsKey(sandboxId) }),
  });
}

/** 取消暴露端口 */
export function useUnexposePort(sandboxId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (port: number) => unexposePort(sandboxId, port),
    onSuccess: () => qc.invalidateQueries({ queryKey: portsKey(sandboxId) }),
  });
}
