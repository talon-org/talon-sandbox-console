/* src/hooks/useMembers.ts — 团队成员 / 邀请管理 react-query hooks
 *
 * tenant_id 从当前用户 me.tenant_id 取（store），各 hook 内部读取，
 * 调用方无需传 tenantId。queryKey 带 tenantId 以便切租户时自动隔离缓存。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../store';
import { canInviteMembers, normalizeRole } from '../lib/permissions';
import {
  listMembers, updateMemberRole, removeMember,
  listInvitations, createInvitation, revokeInvitation, resendInvitation,
} from '../api/members';
import type {
  MemberListResponse, InvitationListResponse,
  UpdateMemberRoleRequest, CreateInvitationRequest,
} from '../api/types';

export const membersKey      = (tid: string) => ['members', tid] as const;
export const invitationsKey  = (tid: string) => ['invitations', tid] as const;

/** 成员列表（developer+ 可读） */
export function useMembers() {
  const tenantId = useApp((s) => s.tenantId) ?? '';
  return useQuery<MemberListResponse>({
    queryKey: membersKey(tenantId),
    queryFn: ({ signal }) => listMembers(tenantId, signal),
    enabled: !!tenantId,
  });
}

/** 待处理邀请列表（admin+ 可读；权限不足不发请求避免吃 403） */
export function useInvitations() {
  const tenantId = useApp((s) => s.tenantId) ?? '';
  const canManage = useApp((s) => canInviteMembers(normalizeRole(s.me?.role)));
  return useQuery<InvitationListResponse>({
    queryKey: invitationsKey(tenantId),
    queryFn: ({ signal }) => listInvitations(tenantId, signal),
    enabled: !!tenantId && canManage,
  });
}

/** 改成员角色（owner） */
export function useUpdateMemberRole() {
  const qc = useQueryClient();
  const tenantId = useApp((s) => s.tenantId) ?? '';
  return useMutation({
    mutationFn: ({ userId, req }: { userId: string; req: UpdateMemberRoleRequest }) =>
      updateMemberRole(tenantId, userId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(tenantId) }),
  });
}

/** 移除成员（owner） */
export function useRemoveMember() {
  const qc = useQueryClient();
  const tenantId = useApp((s) => s.tenantId) ?? '';
  return useMutation({
    mutationFn: (userId: string) => removeMember(tenantId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(tenantId) }),
  });
}

/** 创建邀请（owner）。响应可能带 accept_url，由调用方处理展示。 */
export function useCreateInvitation() {
  const qc = useQueryClient();
  const tenantId = useApp((s) => s.tenantId) ?? '';
  return useMutation({
    mutationFn: (req: CreateInvitationRequest) => createInvitation(tenantId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationsKey(tenantId) }),
  });
}

/** 撤销邀请（admin+） */
export function useRevokeInvitation() {
  const qc = useQueryClient();
  const tenantId = useApp((s) => s.tenantId) ?? '';
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvitation(tenantId, inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationsKey(tenantId) }),
  });
}

/** 重新发送邀请（admin+）。后端撤销旧封 + 新建刷新过期 + 重发邮件。 */
export function useResendInvitation() {
  const qc = useQueryClient();
  const tenantId = useApp((s) => s.tenantId) ?? '';
  return useMutation({
    mutationFn: (inviteId: string) => resendInvitation(tenantId, inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationsKey(tenantId) }),
  });
}
