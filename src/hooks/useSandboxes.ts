/* src/hooks/useSandboxes.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSandboxes, createSandbox, deleteSandbox } from '../api/sandboxes';
import type { CreateSandboxRequest, SandboxListResponse } from '../api/types';

export const SANDBOXES_KEY = ['sandboxes'] as const;

export function useSandboxes() {
  return useQuery<SandboxListResponse>({
    queryKey: SANDBOXES_KEY,
    queryFn: ({ signal }) => listSandboxes(signal),
    refetchInterval: 10_000,
  });
}

export function useCreateSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSandboxRequest) => createSandbox(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SANDBOXES_KEY }),
  });
}

export function useDeleteSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSandbox(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SANDBOXES_KEY }),
  });
}
