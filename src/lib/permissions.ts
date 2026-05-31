/* src/lib/permissions.ts — RBAC 权限判定收口
 *
 * 把「角色 → 能做什么」的语义收成单一来源，page 层只调语义化 helper，不再裸比较
 * 字符串。后端是权威，前端判定只用于禁用/隐藏按钮提升体验，真正的拦截由后端 403 兜底。
 *
 * 角色取值（Spec 49，与后端契约一致）：owner | admin | developer
 *   - owner     ：工作区拥有者。全部权限 + 账单 + 解散工作区 + 转移所有权。
 *   - admin     ：管理员。管团队（邀请/移除/改角色）和资源，但不碰钱（账单/工作区设置
 *                 仍是 owner 独占）。授予/撤销 owner 角色也限 owner。
 *   - developer ：开发者，平台主力。跑 sandbox、连 PTY、用 API Key、读写凭据等全部写
 *                 操作；不能管团队。这是最低档——sandbox 平台没有「纯只读」这一档真实
 *                 角色（来这儿的人都要动手跑东西）。
 *   - __admin   ：超管租户用户（tenant_id === '__admin'），role 字段可能是上述之一，
 *                 成员管理仍按 role 判定（超管跨租户管理走 admin 端点，不在本页范围）。
 */
import { useApp } from '../store';

export type Role = 'owner' | 'admin' | 'developer';

// 角色等级（owner > admin > developer），用于「X 及以上」判定。
const RANK: Record<Role, number> = { developer: 0, admin: 1, owner: 2 };

/** 读取当前登录用户的角色（zustand 响应式）。未登录/未知时回退 developer（最低档）。 */
export function useRole(): Role {
  return useApp((s) => normalizeRole(s.me?.role));
}

/** 把后端可能返回的任意字符串规整为已知角色，未知一律降级 developer（最低档）。 */
export function normalizeRole(role: string | undefined | null): Role {
  if (role === 'owner' || role === 'admin' || role === 'developer') return role;
  return 'developer';
}

/**
 * 写操作（API Key 创建/吊销、凭据读写等，后端走 chainDev = developer+）。
 * Spec 49 起最低档 developer 就能写——没有纯只读角色，故对所有已知角色恒为 true。
 * 保留此 helper 是为了语义可读 + 未来若引入更受限角色时有挂点。
 */
export function canWrite(_role: Role): boolean {
  return true;
}

/** admin 及以上：管理成员（邀请/移除/改角色）。后端成员路由走 chainManage(admin+)。 */
export function canManageMembers(role: Role): boolean {
  return RANK[role] >= RANK.admin;
}

/** admin 及以上：邀请新成员 / 撤销 / 重发邀请。 */
export function canInviteMembers(role: Role): boolean {
  return RANK[role] >= RANK.admin;
}

/** 仅 owner 可授予/撤销 owner 角色（admin 不能制造或降级 owner，与后端二级守卫一致）。 */
export function canGrantOwner(role: Role): boolean {
  return role === 'owner';
}

/** 仅 owner 可管理计费（升/降级套餐、发起结账）。后端 upgrade-plan 走 chainOwner。 */
export function canManageBilling(role: Role): boolean {
  return role === 'owner';
}

/** 仅 owner 可改工作区设置（工作区名等）。后端 PATCH /v1/tenant 走 chainOwner。 */
export function canManageWorkspace(role: Role): boolean {
  return role === 'owner';
}
