/* src/pages/_tenants/TenantDrawer.tsx
 * Read-only detail drawer for a workspace (tenant).
 *
 * Backend tenant API exposes only: list / get / create / suspend.
 * Quota editing, plan switching, member invitation are NOT supported
 * server-side — historically this drawer rendered editable controls
 * for those, but the "Save" button only fired a toast. Editable UI for
 * unsavable fields is a product bug, not a "todo": removed. When the
 * backend grows those endpoints, re-add the controls then.
 */
import { useState } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
  Button, ProgressBar, Badge, KV, toast,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useTenantDetail, useSuspendTenant } from '../../hooks/useTenants';
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

  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const { data: detail } = useTenantDetail(tenant?.id ?? '');

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
            <Badge variant={plan === 'enterprise' ? 'magenta' : plan === 'team' ? 'info' : 'muted'}>
              {plan === 'enterprise' ? t('tenants.drawer.planEnt')
               : plan === 'team' ? t('tenants.drawer.planTeam')
               : t('tenants.drawer.planFree')}
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

          {/* Members — read-only list. Inviting members isn't wired up
           * server-side yet; the trigger is omitted rather than shown as
           * a disabled placeholder. */}
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
                    <span className={'mrole ' + m.role}>{m.role}</span>
                    <span className="mjoined">{relTime(joinedAgo)}</span>
                  </div>
                );
              })}
              {members.length === 0 && (
                <div style={{
                  fontSize: 12, color: 'var(--fg-3)', padding: 16,
                  textAlign: 'center', fontFamily: 'var(--font-mono)',
                }}>
                  {t('tenants.drawer.noMembers')}
                </div>
              )}
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
