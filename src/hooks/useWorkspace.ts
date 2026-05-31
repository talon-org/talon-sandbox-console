/* src/hooks/useWorkspace.ts — owner 视角的组织/空间 react-query hooks */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkspace, updateWorkspace } from '../api/workspace';
import type { WorkspaceDTO, UpdateWorkspaceRequest } from '../api/types';

export const WORKSPACE_KEY = ['workspace'] as const;

/** 当前组织信息(任何成员可读)。 */
export function useWorkspace() {
  return useQuery<WorkspaceDTO>({
    queryKey: WORKSPACE_KEY,
    queryFn: ({ signal }) => getWorkspace(signal),
  });
}

/** 改组织名(owner)。成功后刷新组织信息。 */
export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateWorkspaceRequest) => updateWorkspace(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: WORKSPACE_KEY }); },
  });
}
