/* src/pages/_tenants/TenantDrawer.tsx
 * Read-only detail drawer for a workspace (tenant).
 *
 * 超管视角：以任意租户身份查看其详情（GET /v1/admin/tenants/{id}）。
 * detail 已内嵌 members 数组，这里只读展示即可。
 *
 * 成员区:超管可在此直接「添加成员」(建用户 + active membership,无需邀请确认)。
 * 解决「超管新建工作区后是空壳、无人可登录」的尴尬——超管先放一个 owner/admin 进去,
 * 该用户即可凭邮箱验证码登录接管。成员的改角色 / 移除等精细管理仍由租户自助页
 * PageMembers(/v1/tenants/{tid}/members)负责,此抽屉只提供「补第一个成员」入口。
 *
 * Quota editing / plan switching 后端仍无更新端点 —— 历史上这里曾渲染可编辑
 * 控件但 "Save" 只弹 toast，属产品 bug 已移除；后端长出这些端点时再加回。
 */
import { useState } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
  Button, ProgressBar, Badge, KV, toast, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useTenantDetail, useSuspendTenant, useAdminAddTenantMember } from '../../hooks/useTenants';
import { ConfirmDialog } from '../../components';
import type { TenantDTO, TenantDetailDTO } from '../../api/types';

function relTime(sec: number): string {
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  const d = Math.floor(sec / 86400);
  return `${d}d`;
}

interface Props {
  tenant: TenantDTO | null;
  onClose: () => void;
}

export function TenantDrawer({ tenant, onClose }: Props) {
  const t = useT();
  const suspendMutation = useSuspendTenant();
  const addMember = useAdminAddTenantMember(tenant?.id ?? '');

  const [confirmSuspend, setConfirmSuspend] = useState(false);
  // 添加成员内联表单。
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('owner');

  const { data: detail } = useTenantDetail(tenant?.id ?? '');

  const handleAddMember = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    addMember.mutate(
      { email, role: newRole },
      {
        onSuccess: () => {
          toast.success(t('tenants.drawer.memberAdded'));
          setNewEmail('');
          setNewRole('owner');
        },
        onError: (e) => toast.error((e as Error)?.message || t('common.loadFailed')),
      },
    );
  };

  if (!tenant) return null;

  const d: TenantDetailDTO | undefined = detail;
  const ageSec = Math.round((Date.now() / 1000) - tenant.created_at);
  const plan   = d?.plan ?? 'free';
  const quota  = d?.quota ?? { vcpu: 0, mem_gb: 0, disk_gb: 0 };
  const usage  = d?.usage ?? { vcpu: 0, mem_gb: 0, disk_gb: 0 };
  const members = d?.members ?? [];
  const security = d?.security;

  const kvItems: Array<{ k: string; v: string }> = [
    { k: t('tenants.drawer.kmsKey'), v: security?.kms_key_arn ?? `arn:kms:eu-fra-1:tenant_${tenant.id}:key/main` },
    { k: t('tenants.drawer.rotation'), v: t('tenants.drawer.rotationValue') },
    { k: t('tenants.drawer.network'), v: security?.network_policy ?? t('tenants.drawer.networkValue') },
    {
      k: t('tenants.drawer.twoFactor'),
      v: (security?.two_factor ?? plan === 'enterprise')
        ? t('tenants.drawer.twoFactorReq')
        : t('tenants.drawer.twoFactorOpt'),
    },
  ];

  const handleSuspendConfirm = () => {
    setConfirmSuspend(false);
    suspendMutation.mutate(tenant.id, {
      onSuccess: () => {
        toast.success(tenant.name + ' — ' + t('tenants.drawer.suspend'));
        onClose();
      },
      onError: () => toast.error(t('common.loadFailed')),
    });
  };

  const drawerTitle = (
    <>
      <TlnIcon name="users" size={16} style={{ color: 'var(--acc)' }} />
      {t('tenants.drawer.titlePrefix')} {tenant.name}
    </>
  );

  return (
    <>
      <Drawer open={!!tenant} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DrawerContent style={{ width: 620 }}>
          <DrawerHeader>
            <DrawerTitle>{drawerTitle}</DrawerTitle>
          </DrawerHeader>
        <div className="tln-drawer-body tenant-drawer-body">
          {/* Identity bar — name avatar + plan badge (read-only; switching
           * plan isn't a server-supported operation). */}
          <div className="tenant-bar">
            <div className="dav">{tenant.name[0]}</div>
            <div className="dinfo">
              <div className="dn">{tenant.name}</div>
              <div className="dm">
                {members.length} {t('tenants.drawer.members')} · {tenant.active_sandboxes} {t('tenants.drawer.running')}
              </div>
            </div>
            {/* 套餐名:用列表带来的 plan_name(plans 表显示名),回退 code。
                Badge 配色仅内置三档有专属色,自定义套餐(如 starter)落 muted。 */}
            <Badge variant={plan === 'enterprise' ? 'magenta' : plan === 'team' ? 'info' : 'muted'}>
              {tenant.plan_name ?? plan}
            </Badge>
          </div>

          {/* Quota — usage bars only. Limits are set at creation time; the
           * backend doesn't expose a quota-update endpoint, so the number
           * is shown as text, not an editable input. */}
          <div className="ten-section">
            <div className="ten-section-title">
              <TlnIcon name="cpu" size={12} className="ic" />
              {t('tenants.drawer.quota')}
            </div>
            <div className="quota-row">
              <span className="qlbl">{t('tenants.quota.vcpu')}</span>
              <ProgressBar value={usage.vcpu} max={quota.vcpu || 1} />
              <span className="qused">
                <span className="v">{usage.vcpu.toFixed(1)}</span> / {quota.vcpu}
              </span>
            </div>
            <div className="quota-row">
              <span className="qlbl">{t('tenants.quota.memory')}</span>
              <ProgressBar
                value={usage.mem_gb}
                max={quota.mem_gb || 1}
                style={{ '--tln-progress-color': 'var(--info)' } as React.CSSProperties}
              />
              <span className="qused">
                <span className="v">{usage.mem_gb}</span> / {quota.mem_gb} GiB
              </span>
            </div>
            <div className="quota-row">
              <span className="qlbl">{t('tenants.quota.disk')}</span>
              <ProgressBar
                value={usage.disk_gb}
                max={quota.disk_gb || 1}
                style={{ '--tln-progress-color': 'var(--teal, #56cbb8)' } as React.CSSProperties}
              />
              <span className="qused">
                <span className="v">{usage.disk_gb}</span> / {quota.disk_gb} GiB
              </span>
            </div>
          </div>

          {/* Members — 列表 + 超管「添加成员」内联表单。新建工作区后用它放第一个
           * owner,否则工作区无人可登录。改角色/移除等精细管理仍走租户自助 PageMembers。 */}
          <div className="ten-section">
            <div className="ten-section-title">
              <TlnIcon name="users" size={12} className="ic" />
              <span>{t('tenants.drawer.members')} · {members.length}</span>
            </div>
            <div>
              {members.map(m => {
                const joinedAgo = Math.round((Date.now() / 1000) - m.joined_at);
                return (
                  <div key={m.id} className="member-row">
                    <div className="mav">{(m.name ?? m.email)[0].toUpperCase()}</div>
                    <span className="memail">{m.email}</span>
                    <span className={'mrole ' + m.role}>{t('members.role.' + m.role)}</span>
                    <span className="mjoined">{relTime(joinedAgo)}</span>
                  </div>
                );
              })}
              {members.length === 0 && (
                <div style={{
                  fontSize: 12, color: 'var(--fg-3)', padding: '12px 16px',
                  textAlign: 'center', fontFamily: 'var(--font-mono)',
                }}>
                  {t('tenants.drawer.noMembersHint')}
                </div>
              )}
            </div>

            {/* 添加成员表单 */}
            <div className="ten-add-member">
              <Input
                type="email"
                value={newEmail}
                placeholder={t('tenants.drawer.addMemberEmail')}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember(); }}
              />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('members.role.owner')}</SelectItem>
                  <SelectItem value="admin">{t('members.role.admin')}</SelectItem>
                  <SelectItem value="developer">{t('members.role.developer')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="primary"
                disabled={!newEmail.trim() || addMember.isPending}
                onClick={handleAddMember}
              >
                <TlnIcon name="plus" size={13} />
                {t('tenants.drawer.addMember')}
              </Button>
            </div>
          </div>

          <div className="ten-section">
            <div className="ten-section-title">
              <TlnIcon name="shield" size={12} className="ic" />
              {t('tenants.drawer.security')}
            </div>
            <KV rows={kvItems} />
          </div>
        </div>
        <DrawerFooter>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginRight: 'auto' }}>
            tenant_{tenant.id} · {t('tenants.drawer.createdLabel')} {relTime(ageSec)}
          </span>
          <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
          <Button
            variant="danger"
            onClick={() => setConfirmSuspend(true)}
            disabled={suspendMutation.isPending}
          >
            <TlnIcon name="trash" size={13} />
            {t('tenants.drawer.suspend')}
          </Button>
        </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={handleSuspendConfirm}
        title={t('tenants.drawer.suspendTitle')}
        description={t('tenants.drawer.suspendBody')}
        confirmLabel={t('tenants.drawer.suspendConfirm')}
        danger
      />
    </>
  );
}
