/* PageMembers — 团队成员管理（租户内功能，普通租户都能进）。
 *
 * 数据：useMembers() / useInvitations() + useUpdateMemberRole / useRemoveMember /
 *       useCreateInvitation / useRevokeInvitation（src/hooks/useMembers.ts）。
 * 权限：列表 developer+ 可读；改角色/移除/邀请/撤销 仅 owner —— 判定统一走
 *       lib/permissions（canManageMembers / canInviteMembers），非 owner 隐藏/禁用
 *       写操作，后端 403 兜底。
 */
import { useState } from 'react';
import {
  Button, PageHeader, Badge, toast,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@talon-sandbox/react';
import type { BadgeVariant } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useApp } from '../store';
import { useRole, canManageMembers, canInviteMembers } from '../lib/permissions';
import {
  useMembers, useInvitations,
  useUpdateMemberRole, useRemoveMember, useRevokeInvitation,
} from '../hooks/useMembers';
import { EmptyState, ConfirmDialog } from '../components';
import { InviteMemberDialog } from './_members/InviteMemberDialog';
import type { MemberDTO, MemberRole, InvitationDTO } from '../api/types';

import './PageMembers.css';

// 角色 → Badge variant 映射（owner 强调色，developer 信息色，viewer 静默）
const ROLE_VARIANT: Record<MemberRole, BadgeVariant> = {
  owner:     'magenta',
  developer: 'info',
  viewer:    'muted',
};

// Unix 秒 → 相对时间（与其它 page 的本地 relTime 风格一致）
function relTime(sec: number): string {
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export function PageMembers() {
  const t = useT();

  const role     = useRole();
  const canManage = canManageMembers(role);
  const canInvite = canInviteMembers(role);
  const myId     = useApp(s => s.me?.id);

  const { data, isLoading, isError, error } = useMembers();
  const { data: invData } = useInvitations();
  const updateRole   = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const revokeInvite = useRevokeInvitation();

  const [invite,        setInvite]        = useState(false);
  const [removeTarget,  setRemoveTarget]  = useState<MemberDTO | null>(null);
  const [revokeTarget,  setRevokeTarget]  = useState<InvitationDTO | null>(null);

  const memberList = data?.members ?? [];
  const inviteList = invData?.invitations ?? [];

  const roleLabel = (r: MemberRole) => t(`members.role.${r}`);

  /** 行内改角色：owner 调 PATCH */
  const handleRoleChange = (m: MemberDTO, next: MemberRole) => {
    if (next === m.role) return;
    updateRole.mutate(
      { userId: m.id, req: { role: next } },
      {
        onSuccess: () => toast.success((m.name ?? m.email) + ' — ' + t('members.roleUpdated')),
        onError: (err: unknown) => {
          const status = (err as { status?: number } | null)?.status;
          toast.error(status === 403 ? t('members.viewerNote') : t('members.roleChangeFailed'));
        },
      },
    );
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    const label = removeTarget.name ?? removeTarget.email;
    const id = removeTarget.id;
    setRemoveTarget(null);
    removeMember.mutate(id, {
      onSuccess: () => toast.success(label + ' — ' + t('members.removeSuccess')),
      onError: () => toast.error(t('common.loadFailed')),
    });
  };

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    const id = revokeTarget.id;
    setRevokeTarget(null);
    revokeInvite.mutate(id, {
      onSuccess: () => toast.success(t('members.pending.revokeSuccess')),
      onError: () => toast.error(t('common.loadFailed')),
    });
  };

  const handleCopyInviteLink = async (inv: InvitationDTO) => {
    if (!inv.accept_url) return;
    try {
      await navigator.clipboard.writeText(inv.accept_url);
      toast.success(t('members.inviteLinkCopied'));
    } catch {
      toast.error(t('common.loadFailed'));
    }
  };

  return (
    <>
      <PageHeader
        title={t('members.title')}
        num={String(memberList.length)}
        desc={t('members.desc')}
        actions={
          canInvite ? (
            <Button variant="primary" onClick={() => setInvite(true)}>
              <TlnIcon name="plus" size={14} />
              {t('members.invite')}
            </Button>
          ) : undefined
        }
      />

      <div className="page-body">
        {/* 非 owner 提示 banner */}
        {!canManage && (
          <div className="mbr-note">
            <TlnIcon name="info" size={13} />
            {t('members.viewerNote')}
          </div>
        )}

        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError   && <EmptyState variant="error"   error={error} />}

        {!isLoading && !isError && (
          <div className="tln-tbl">
            <div className="tln-tbl-head mbr-row">
              <div>{t('members.colMember')}</div>
              <div>{t('members.colRole')}</div>
              <div>{t('members.colStatus')}</div>
              <div>{t('members.colJoined')}</div>
              <div />
            </div>

            {memberList.map(m => {
              const joinedAgo = relTime(Math.round(Date.now() / 1000 - m.joined_at));
              const isSelf = !!myId && m.id === myId;
              const initial = (m.name ?? m.email).charAt(0).toUpperCase();
              return (
                <div key={m.id} className="tln-tbl-row mbr-row" style={{ cursor: 'default' }}>
                  {/* 头像 + 名称/邮箱 */}
                  <div className="mbr-id">
                    <div className="mbr-av">{initial}</div>
                    <div className="mbr-id-text">
                      {m.name && <span className="mbr-name">{m.name}</span>}
                      <span className="mbr-email" title={m.email}>{m.email}</span>
                    </div>
                  </div>

                  {/* 角色：owner 可改（下拉），否则展示 Badge。
                      不允许改自己的角色，避免 owner 误把自己降级锁死。 */}
                  <div>
                    {canManage && !isSelf ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => handleRoleChange(m, v as MemberRole)}
                      >
                        <SelectTrigger size="sm" style={{ width: 130 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">{roleLabel('owner')}</SelectItem>
                          <SelectItem value="developer">{roleLabel('developer')}</SelectItem>
                          <SelectItem value="viewer">{roleLabel('viewer')}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={ROLE_VARIANT[m.role]}>{roleLabel(m.role)}</Badge>
                    )}
                  </div>

                  {/* 状态 */}
                  <div className="mbr-status">
                    {m.status ?? t('members.statusActive')}
                  </div>

                  {/* 加入时间 */}
                  <div className="mbr-joined">{joinedAgo}</div>

                  {/* 移除：owner 可移除，不可移除自己 */}
                  <div className="actions">
                    {canManage && !isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setRemoveTarget(m)}
                        title={t('members.remove')}
                        aria-label={t('members.remove')}
                      >
                        <TlnIcon name="trash" size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {memberList.length === 0 && (
              <div style={{ padding: 32 }}>
                <EmptyState
                  icon={<TlnIcon name="users" size={24} />}
                  title={t('members.empty.head')}
                  description={t('members.empty.desc')}
                  action={
                    canInvite ? (
                      <Button variant="primary" onClick={() => setInvite(true)}>
                        <TlnIcon name="plus" size={14} />
                        {t('members.invite')}
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* 待处理邀请（仅 owner 可见，useInvitations 已对非 owner 关闭请求） */}
        {canInvite && inviteList.length > 0 && (
          <div className="mbr-pending">
            <div className="mbr-section-title">
              <TlnIcon name="clock" size={13} className="ic" />
              {t('members.pending.title')} · {inviteList.length}
            </div>
            <div className="tln-tbl">
              <div className="tln-tbl-head mbr-inv-row">
                <div>{t('members.pending.colEmail')}</div>
                <div>{t('members.pending.colRole')}</div>
                <div>{t('members.pending.colExpires')}</div>
                <div />
              </div>
              {inviteList.map(inv => {
                const expiresIn = inv.expires_at - Math.round(Date.now() / 1000);
                return (
                  <div key={inv.id} className="tln-tbl-row mbr-inv-row" style={{ cursor: 'default' }}>
                    <div className="mbr-email" title={inv.email}>{inv.email}</div>
                    <div>
                      <Badge variant={ROLE_VARIANT[inv.role]}>{roleLabel(inv.role)}</Badge>
                    </div>
                    <div className="mbr-joined">
                      {expiresIn > 0 ? relTime(expiresIn) : '—'}
                    </div>
                    <div className="actions">
                      {inv.accept_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          onClick={() => handleCopyInviteLink(inv)}
                          title={t('members.pending.copyLink')}
                          aria-label={t('members.pending.copyLink')}
                        >
                          <TlnIcon name="copy" size={13} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setRevokeTarget(inv)}
                        title={t('members.pending.revoke')}
                        aria-label={t('members.pending.revoke')}
                      >
                        <TlnIcon name="trash" size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <InviteMemberDialog open={invite} onClose={() => setInvite(false)} />

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
        title={t('members.removeTitle')}
        description={t('members.removeBody')}
        confirmLabel={t('members.removeConfirm')}
        loading={removeMember.isPending}
        danger
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        title={t('members.pending.revokeTitle')}
        description={t('members.pending.revokeBody')}
        confirmLabel={t('members.pending.revokeConfirm')}
        loading={revokeInvite.isPending}
        danger
      />
    </>
  );
}
