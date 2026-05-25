/* src/hooks/useSandbox.ts */
import { useQuery } from '@tanstack/react-query';
import { getSandbox } from '../api/sandboxes';
import type { SandboxDTO } from '../api/types';

export function useSandbox(id: string) {
  return useQuery<SandboxDTO>({
    queryKey: ['sandboxes', id],
    queryFn: ({ signal }) => getSandbox(id, signal),
    enabled: id.length > 0,
    refetchInterval: 5_000,
  });
}
