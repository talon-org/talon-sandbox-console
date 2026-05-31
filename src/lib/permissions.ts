/* src/lib/permissions.ts — RBAC 权限判定收口
 *
 * 现状：role 判定散落在各 page（如 PageApiKeys 直接 `role === 'viewer'`）。
 * 这里把「角色 → 能做什么」的语义收成单一来源，page 层只调语义化 helper，
 * 不再裸比较字符串。后端是权威，前端判定只用于禁用/隐藏按钮提升体验，
 * 真正的拦截由后端 403 兜底。
 *
 * 角色取值（与后端契约一致）：owner | developer | viewer
 *   - owner     ：空间所有者，可管理成员/邀请/改角色/移除
 *   - developer ：可创建/吊销 API Key、凭据等写操作，但不能管理成员
 *   - viewer    ：只读
 *   - __admin   ：超管租户用户（tenant_id === '__admin'），role 字段可能是上述之一，
 *                 成员管理仍按 role 判定（超管跨租户管理走 admin 端点，不在本页范围）。
 */
import { useApp } from '../store';

export type Role = 'owner' | 'developer' | 'viewer';

/** 读取当前登录用户的角色（zustand 响应式）。未登录/未知时回退 viewer（最小权限）。 */
export function useRole(): Role {
  return useApp((s) => normalizeRole(s.me?.role));
}

/** 把后端可能返回的任意字符串规整为已知角色，未知一律降级 viewer。 */
export function normalizeRole(role: string | undefined | null): Role {
  if (role === 'owner' || role === 'developer' || role === 'viewer') return role;
  return 'viewer';
}

/** viewer：只读，禁用所有写操作按钮（API Key 创建/吊销、凭据写等）。 */
export function isViewer(role: Role): boolean {
  return role === 'viewer';
}

/** developer 及以上：可执行 API Key / 凭据等写操作（owner、developer 为 true）。 */
export function canWrite(role: Role): boolean {
  return role === 'owner' || role === 'developer';
}

/** 仅 owner 可管理成员（改角色、移除成员）。 */
export function canManageMembers(role: Role): boolean {
  return role === 'owner';
}

/** 仅 owner 可邀请新成员 / 撤销邀请。 */
export function canInviteMembers(role: Role): boolean {
  return role === 'owner';
}

/** 仅 owner 可管理计费（升/降级套餐、发起结账）。后端 upgrade-plan 走 chainOwner。 */
export function canManageBilling(role: Role): boolean {
  return role === 'owner';
}
