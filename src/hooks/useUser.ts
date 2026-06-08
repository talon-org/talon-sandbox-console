/* src/hooks/useUser.ts — 按 user id 解析公开档案(name/email),给来源归因等展示用。 */
import { useQuery } from '@tanstack/react-query';
import { getUser } from '../api/users';
import type { UserProfile } from '../api/types';

/**
 * 解析单个 user id → 公开档案。enabled 控制空 id 不发请求。
 * 用户档案基本不变,长 staleTime 避免重复请求;查不到(404/无权)走 react-query
 * error 态,调用方据此回退裸显 id。
 */
export function useUser(id: string | undefined | null) {
  return useQuery<UserProfile>({
    queryKey: ['users', id],
    queryFn: ({ signal }) => getUser(id as string, signal),
    enabled: !!id,
    staleTime: 5 * 60_000,
    retry: false, // 404(查不到/无权)不重试,直接回退裸 id
  });
}
