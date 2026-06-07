/* src/hooks/useSandboxes.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSandboxes, listAdminSandboxes, createSandbox, deleteSandbox,
  startSandbox, stopSandbox, pauseSandbox, batchSandboxAction,
} from '../api/sandboxes';
import { useIsAdmin } from '../store';
import type {
  CreateSandboxRequest, SandboxListResponse, BatchAction, BatchSandboxResponse,
} from '../api/types';

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

/**
 * sandbox 生命周期操作（start / stop / pause）统一 mutation。
 * 后端 effectiveTenant 已支持超管跨租户代行，三个端点对普通/超管路径一致，
 * 故无需按 admin 分流。成功后同时刷新列表（两个 key）与单条详情缓存，
 * 让详情页与列表页状态立即同步。
 */
function useSandboxLifecycle(
  fn: (id: string) => Promise<unknown>,
) {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: SANDBOXES_KEY });
      qc.invalidateQueries({ queryKey: ['sandboxes', id] });
      if (isAdmin) qc.invalidateQueries({ queryKey: ADMIN_SANDBOXES_KEY });
    },
  });
}

export const useStartSandbox = () => useSandboxLifecycle(startSandbox);
export const useStopSandbox  = () => useSandboxLifecycle(stopSandbox);
export const usePauseSandbox = () => useSandboxLifecycle(pauseSandbox);

/**
 * 批量生命周期操作 mutation（启动/停止/暂停/销毁）。
 * 与单条 lifecycle 一致：后端 effectiveTenant 已支持超管跨租户代行，故普通/超管路径
 * 共用；成功后刷新列表两个 key，让列表立即反映新状态。
 * 入参 action 决定打哪个 batch 端点，返回逐条结果交由调用方汇总展示。
 */
export function useBatchSandboxAction() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  return useMutation<BatchSandboxResponse, Error, { action: BatchAction; ids: string[] }>({
    mutationFn: ({ action, ids }) => batchSandboxAction(action, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SANDBOXES_KEY });
      if (isAdmin) qc.invalidateQueries({ queryKey: ADMIN_SANDBOXES_KEY });
    },
  });
}

export function useDeleteSandbox() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  return useMutation({
    // 超管删除其他租户的 sandbox 也走 DELETE /v1/sandboxes/{id}：后端的
    // effectiveTenant 已支持超管以资源真实归属租户身份代行（并记 audit），
    // 跨租户删除不再 403/404，无需单独的 admin delete 端点。
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
