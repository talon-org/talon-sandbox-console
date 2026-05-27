/* src/pages/_tenants/TenantDrawer.tsx
 * Detail drawer for a workspace (tenant).
 * Opens when user clicks a row in PageTenants.
 */
import { useState, useEffect } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  Button, ProgressBar, SegmentedGroup, SegmentedItem, KV, toast,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useTenantDetail, useSuspendTenant } from '../../hooks/useTenants';
import { ConfirmDialog } from '../../components';
import type { TenantDTO, TenantDetailDTO, TenantQuotaDTO } from '../../api/types';

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
  const [quotaEdits, setQuotaEdits] = useState<Partial<TenantQuotaDTO>>({});

  const { data: detail } = useTenantDetail(tenant?.id ?? '');

  useEffect(() => { setQuotaEdits({}); }, [tenant?.id]);

  if (!tenant) return null;

  const d: TenantDetailDTO | undefined = detail;
  const ageSec = Math.round((Date.now() / 1000) - tenant.created_at);
  const plan   = d?.plan ?? 'free';
  const quota  = { ...(d?.quota ?? { vcpu: 0, mem_gb: 0, disk_gb: 0 }), ...quotaEdits };
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
        <div className="tenant-drawer-body">
          {/* header bar */}
          <div className="tenant-bar">
            <div className="dav">{tenant.name[0]}</div>
            <div className="dinfo">
              <div className="dn">{tenant.name}</div>
              <div className="dm">
                {plan} · {members.length} {t('tenants.drawer.members')} · {tenant.active_sandboxes} {t('tenants.drawer.running')}
              </div>
            </div>
            <SegmentedGroup value={plan} size="sm">
              <SegmentedItem value="free">{t('tenants.drawer.planFree')}</SegmentedItem>
              <SegmentedItem value="team">{t('tenants.drawer.planTeam')}</SegmentedItem>
              <SegmentedItem value="enterprise">{t('tenants.drawer.planEnt')}</SegmentedItem>
            </SegmentedGroup>
          </div>

          {/* quota section */}
          <div className="ten-section">
            <div className="ten-section-title">
              <TlnIcon name="cpu" size={12} className="ic" />
              {t('tenants.drawer.quota')}
            </div>
            <div className="quota-row">
              <span className="qlbl">{t('tenants.quota.vcpu')}</span>
              <ProgressBar value={usage.vcpu} max={quota.vcpu || 1} />
              <span className="qused">
                <span className="v">{usage.vcpu.toFixed(1)}</span> / {t('tenants.quota.used')}
              </span>
              <input
                type="number"
                className="qinput"
                value={quota.vcpu}
                onChange={e => setQuotaEdits(p => ({ ...p, vcpu: +e.target.value }))}
                aria-label={t('tenants.quota.vcpu')}
              />
            </div>
            <div className="quota-row">
              <span className="qlbl">{t('tenants.quota.memory')}</span>
              <ProgressBar
                value={usage.mem_gb}
                max={quota.mem_gb || 1}
                style={{ '--tln-progress-color': 'var(--info)' } as React.CSSProperties}
              />
              <span className="qused">
                <span className="v">{usage.mem_gb} GiB</span> / {t('tenants.quota.used')}
              </span>
              <input
                type="number"
                className="qinput"
                value={quota.mem_gb}
                onChange={e => setQuotaEdits(p => ({ ...p, mem_gb: +e.target.value }))}
                aria-label={t('tenants.quota.memory')}
              />
            </div>
            <div className="quota-row">
              <span className="qlbl">{t('tenants.quota.disk')}</span>
              <ProgressBar
                value={usage.disk_gb}
                max={quota.disk_gb || 1}
                style={{ '--tln-progress-color': 'var(--teal, #56cbb8)' } as React.CSSProperties}
              />
              <span className="qused">
                <span className="v">{usage.disk_gb} GiB</span> / {t('tenants.quota.used')}
              </span>
              <input
                type="number"
                className="qinput"
                value={quota.disk_gb}
                onChange={e => setQuotaEdits(p => ({ ...p, disk_gb: +e.target.value }))}
                aria-label={t('tenants.quota.disk')}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
              {t('tenants.quota.note')}
            </div>
          </div>

          {/* members section */}
          <div className="ten-section">
            <div className="ten-section-title">
              <TlnIcon name="users" size={12} className="ic" />
              <span>{t('tenants.drawer.members')} · {members.length}</span>
              <span style={{ marginLeft: 'auto' }}>
                <Button variant="ghost" size="sm" disabled>
                  <TlnIcon name="plus" size={12} />
                  {t('tenants.drawer.invite')}
                </Button>
              </span>
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
                    <Button variant="ghost" size="sm" iconOnly aria-label={t('common.filter')}>
                      <TlnIcon name="more" size={12} />
                    </Button>
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

          {/* security section */}
          <div className="ten-section">
            <div className="ten-section-title">
              <TlnIcon name="shield" size={12} className="ic" />
              {t('tenants.drawer.security')}
            </div>
            <KV rows={kvItems} />
          </div>

          {/* footer actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingTop: 16, borderTop: '1px solid var(--line-soft)', marginTop: 8,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
              tenant_{tenant.id} · {t('tenants.drawer.createdLabel')} {relTime(ageSec)}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button
                variant="danger"
                onClick={() => setConfirmSuspend(true)}
                disabled={suspendMutation.isPending}
              >
                <TlnIcon name="trash" size={13} />
                {t('tenants.drawer.suspend')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  toast.success(t('tenants.drawer.saveToast'));
                  onClose();
                }}
              >
                <TlnIcon name="check" size={13} />
                {t('tenants.drawer.save')}
              </Button>
            </div>
          </div>
        </div>
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
