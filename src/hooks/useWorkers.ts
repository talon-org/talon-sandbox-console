/* src/hooks/useWorkers.ts */
import { useQuery } from '@tanstack/react-query';
import { listWorkers } from '../api/workers';
import type { WorkerListResponse } from '../api/types';

export const WORKERS_KEY = ['workers'] as const;

export function useWorkers() {
  return useQuery<WorkerListResponse>({
    queryKey: WORKERS_KEY,
    queryFn: ({ signal }) => listWorkers(signal),
    refetchInterval: 15_000,
  });
}
