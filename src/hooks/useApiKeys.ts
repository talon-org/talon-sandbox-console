/* src/hooks/useApiKeys.ts — API Key 管理的 react-query hooks */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listApiKeys, createApiKey, deleteApiKey, revealApiKey } from '../api/apiKeys';
import type { ApiKeyListResponse, CreateApiKeyRequest } from '../api/types';

export const API_KEYS_KEY = ['apiKeys'] as const;

/** 列表查询（viewer 可用） */
export function useApiKeys() {
  return useQuery<ApiKeyListResponse>({
    queryKey: API_KEYS_KEY,
    queryFn: ({ signal }) => listApiKeys(signal),
  });
}

/** 创建 Key（developer+） */
export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateApiKeyRequest) => createApiKey(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}

/** 吊销 Key（developer+） */
export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}

/** reveal 是即时操作，不需要 query cache；用 useMutation 包装方便 loading 状态 */
export function useRevealApiKey() {
  return useMutation({
    mutationFn: (id: string) => revealApiKey(id),
  });
}
