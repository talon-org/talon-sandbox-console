/* src/hooks/useSandboxes.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSandboxes, listAdminSandboxes, createSandbox, deleteSandbox } from '../api/sandboxes';
import { useIsAdmin } from '../store';
import type { CreateSandboxRequest, SandboxListResponse } from '../api/types';

// 普通租户 queryKey
export const SANDBOXES_KEY = ['sandboxes'] as const;

// 超管跨租户 queryKey——与普通列表隔离，避免缓存串味
export const ADMIN_SANDBOXES_KEY = ['sandboxes', 'admin'] as const;

export function useSandboxes() {
  const isAdmin = useIsAdmin();
  // admin 走 /v1/admin/sandboxes（全租户），普通用户走 /v1/sandboxes（当前租户）
  // queryKey 分开，两者缓存完全独立
  return useQuery<SandboxListResponse>({
    queryKey: isAdmin ? ADMIN_SANDBOXES_KEY : SANDBOXES_KEY,
    queryFn: ({ signal }) => isAdmin ? listAdminSandboxes(signal) : listSandboxes(signal),
    refetchInterval: 10_000,
  });
}

export function useCreateSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSandboxRequest) => createSandbox(req),
    // 创建只在普通租户上下文使用，invalidate 普通 key 即可
    onSuccess: () => qc.invalidateQueries({ queryKey: SANDBOXES_KEY }),
  });
}

export function useDeleteSandbox() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  return useMutation({
    // TODO(admin-delete): 后端暂无 DELETE /v1/admin/sandboxes/{id} 端点。
    // 超管删除其他租户的 sandbox 时会走普通 DELETE /v1/sandboxes/{id}，
    // 后端按当前登录用户的租户（__admin）做鉴权，跨租户时可能返回 403/404。
    // 待后端实现 admin delete 端点后，在此根据 isAdmin 分流调用。
    mutationFn: (id: string) => deleteSandbox(id),
    // 删除成功后同时刷新两个 key，确保 admin/普通视图均更新
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SANDBOXES_KEY });
      if (isAdmin) {
        qc.invalidateQueries({ queryKey: ADMIN_SANDBOXES_KEY });
      }
    },
  });
}
