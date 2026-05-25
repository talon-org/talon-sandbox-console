/* src/hooks/useWorkers.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWorkers, inviteWorker } from '../api/workers';
import type { WorkerListResponse, WorkerInviteResponse } from '../api/types';

export const WORKERS_KEY = ['workers'] as const;

export function useWorkers() {
  return useQuery<WorkerListResponse>({
    queryKey: WORKERS_KEY,
    queryFn: ({ signal }) => listWorkers(signal),
    refetchInterval: 15_000,
  });
}

/** G6: 生成 worker 邀请令牌（admin only）。返回明文 token，请立即展示给管理员。 */
export function useInviteWorker() {
  const qc = useQueryClient();
  return useMutation<WorkerInviteResponse>({
    mutationFn: () => inviteWorker(),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKERS_KEY }),
  });
}
