/* src/hooks/useSandboxProcesses.ts — 沙箱进程列表，每 5s 轮询 */
import { useQuery } from '@tanstack/react-query';
import { listProcesses } from '../api/processes';
import type { ProcessListResponse } from '../api/types';

export function useSandboxProcesses(sandboxId: string) {
  return useQuery<ProcessListResponse>({
    queryKey: ['sandbox-processes', sandboxId],
    queryFn: ({ signal }) => listProcesses(sandboxId, signal),
    enabled: sandboxId.length > 0,
    refetchInterval: 5_000,
  });
}
