/* PageTenants — admin: workspace list + TenantDrawer.
 * 1:1 port of page-tenants.jsx prototype.
 */
import { useState, useEffect } from 'react';
import { PageHeader, Button, Drawer, Segmented, ProgressBar, KV } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_TENANTS, relTime } from '../mock/data';
import type { MockTenant } from '../mock/data';
// TODO: replace mock with apiGet('/v1/admin/tenants')

import './PageTenants.css';

// ── TenantDrawer ──────────────────────────────────────────────────────────────
interface TenantDrawerProps {
  tenant: MockTenant | null;
  onClose: () => void;
}

function TenantDrawer({ tenant, onClose }: TenantDrawerProps) {
  const t = useT();
  const [edits, setEdits] = useState<Partial<MockTenant['quota']>>({});

  useEffect(() => { setEdits({}); }, [tenant?.id]);

  if (!tenant) return null;

  const q = { ...tenant.quota, ...edits };
  const updateQuota = (k: keyof MockTenant['quota'], v: string) =>
    setEdits(prev => ({ ...prev, [k]: +v }));

  const ageSec = Math.round((Date.now() - new Date(tenant.createdAt).getTime()) / 1000);

  const kvRows = [
    { k: 'KMS key', v: 'arn:kms:eu-fra-1:tenant_' + tenant.id + ':key/main', cls: 'acc' },
    { k: 'Rotation', v: 'auto · every 90 days' },
    { k: 'Network', v: 'default deny · per-sandbox allowlist' },
    { k: '2FA', v: tenant.plan === 'Enterprise' ? 'Required' : 'Optional', cls: tenant.plan === 'Enterprise' ? 'acc' : 'dim' },
  ];

  return (
    <Drawer
      open={!!tenant}
      onClose={onClose}
      width={620}
      title={
        <>
          <TlnIcon name="users" size={16} style={{ color: 'var(--acc)' }} />
          {t('nav.tenants')} {tenant.name}
        </>
      }
      footer={
        <>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
            tenant_{tenant.id} · {t('tenants.colCreated').toLowerCase()} {relTime(ageSec)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button variant="danger">
              <TlnIcon name="trash" size={13} />
              {t('tenants.drawer.suspend')}
            </Button>
            <Button variant="primary" onClick={() => { onClose(); }}>
              <TlnIcon name="check" size={13} />
              {t('tenants.drawer.save')}
            </Button>
          </div>
        </>
      }
    >
      <div className="tenant-drawer-body">
        {/* header bar */}
        <div className="tenant-bar">
          <div className="dav">{tenant.name[0]}</div>
          <div className="dinfo">
            <div className="dn">{tenant.name}</div>
            <div className="dm">
              {tenant.plan} · {tenant.members} members · {tenant.sandboxesActive} running sandbox{tenant.sandboxesActive !== 1 ? 'es' : ''}
            </div>
          </div>
          <Segmented
            value={tenant.plan.toLowerCase()}
            onChange={() => {}}
            size="sm"
            options={[
              { value: 'free', label: 'Free' },
              { value: 'team', label: 'Team' },
              { value: 'enterprise', label: 'Ent.' },
            ]}
          />
        </div>

        {/* quota section */}
        <div className="ten-section">
          <div className="ten-section-title">
            <TlnIcon name="cpu" size={12} className="ic" />
            {t('tenants.drawer.quota')}
          </div>
          <div className="quota-row">
            <span className="qlbl">vCPU</span>
            <ProgressBar value={q.vCPUUsed} max={q.vCPU} />
            <span className="qused"><span className="v">{q.vCPUUsed.toFixed(1)}</span> / used</span>
            <input
              type="number"
              className="qinput"
              value={q.vCPU}
              onChange={e => updateQuota('vCPU', e.target.value)}
            />
          </div>
          <div className="quota-row">
            <span className="qlbl">Memory</span>
            <ProgressBar value={q.memGBUsed} max={q.memGB} style={{ '--tln-progress-color': 'var(--info)' } as React.CSSProperties} />
            <span className="qused"><span className="v">{q.memGBUsed} GiB</span> / used</span>
            <input
              type="number"
              className="qinput"
              value={q.memGB}
              onChange={e => updateQuota('memGB', e.target.value)}
            />
          </div>
          <div className="quota-row">
            <span className="qlbl">Disk</span>
            <ProgressBar value={q.diskGBUsed} max={q.diskGB} style={{ '--tln-progress-color': 'var(--teal, #56cbb8)' } as React.CSSProperties} />
            <span className="qused"><span className="v">{q.diskGBUsed} GiB</span> / used</span>
            <input
              type="number"
              className="qinput"
              value={q.diskGB}
              onChange={e => updateQuota('diskGB', e.target.value)}
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
            <span>{t('tenants.drawer.members')} · {tenant.members_list.length}</span>
            <span style={{ marginLeft: 'auto' }}>
              <Button variant="ghost" size="sm">
                <TlnIcon name="plus" size={12} />
                {t('tenants.drawer.invite')}
              </Button>
            </span>
          </div>
          <div>
            {tenant.members_list.map(m => {
              const memberAgeSec = Math.round((Date.now() - new Date(m.joined).getTime()) / 1000);
              return (
                <div key={m.email} className="member-row">
                  <div className="mav">{m.email[0].toUpperCase()}</div>
                  <span className="memail">{m.email}</span>
                  <span className={'mrole ' + m.role}>{m.role}</span>
                  <span className="mjoined">{relTime(memberAgeSec)}</span>
                  <Button variant="ghost" size="sm" iconOnly aria-label="More">
                    <TlnIcon name="more" size={12} />
                  </Button>
                </div>
              );
            })}
            {tenant.members_list.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--fg-3)', padding: 16, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
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
          <KV rows={kvRows} />
        </div>
      </div>
    </Drawer>
  );
}

// ── PageTenants ───────────────────────────────────────────────────────────────
export function PageTenants() {
  const t = useT();
  const tenants = MOCK_TENANTS;
  // TODO: replace with apiGet('/v1/admin/tenants')

  const [detail, setDetail] = useState<MockTenant | null>(null);

  return (
    <>
      <PageHeader
        eyebrow={t('tenants.eyebrow')}
        title={t('tenants.title')}
        num={`${tenants.length}`}
        desc={t('tenants.desc')}
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="download" size={14} />
              {t('tenants.exportCsv')}
            </Button>
            <Button variant="primary">
              <TlnIcon name="plus" size={14} />
              {t('tenants.new')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        <div className="tln-tbl">
          <div className="tln-tbl-head ten-row">
            <div>{t('tenants.colName')}</div>
            <div>{t('tenants.colPlan')}</div>
            <div>{t('tenants.colMembers')}</div>
            <div>{t('tenants.colSandboxes')}</div>
            <div>{t('tenants.colQuota')}</div>
            <div>{t('tenants.colCreated')}</div>
            <div />
          </div>

          {tenants.map(tenant => {
            const q = tenant.quota;
            const ageSec = Math.round((Date.now() - new Date(tenant.createdAt).getTime()) / 1000);
            return (
              <div
                key={tenant.id}
                className="tln-tbl-row ten-row"
                onClick={() => setDetail(tenant)}
                style={{ cursor: 'pointer' }}
              >
                {/* name + id */}
                <div className="name-cell">
                  <div className={'av' + (tenant.suspended ? ' suspended' : '')}>
                    {tenant.name[0]}
                  </div>
                  <div className="tinfo">
                    <span className="tn">
                      {tenant.name}
                      {tenant.suspended && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontFamily: 'var(--font-mono)',
                          padding: '1px 5px', borderRadius: 3,
                          background: 'var(--err-soft)', color: 'var(--err)',
                          verticalAlign: 'middle',
                        }}>
                          {t('tenants.suspended')}
                        </span>
                      )}
                    </span>
                    <span className="tid">tenant_{tenant.id}</span>
                  </div>
                </div>

                {/* plan */}
                <div>
                  <span className={'tplan ' + tenant.plan}>{tenant.plan}</span>
                </div>

                {/* members */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {tenant.members}
                </div>

                {/* sandboxes active / all-time */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {tenant.sandboxesActive}{' '}
                  <span style={{ color: 'var(--fg-3)' }}>/ {tenant.sandboxesAllTime}</span>
                </div>

                {/* quota bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div className="quota-cell">
                    <span className="lbl">CPU</span>
                    <ProgressBar value={q.vCPUUsed} max={q.vCPU} />
                    <span className="v">{q.vCPUUsed.toFixed(1)}/{q.vCPU}</span>
                  </div>
                  <div className="quota-cell">
                    <span className="lbl">MEM</span>
                    <ProgressBar
                      value={q.memGBUsed}
                      max={q.memGB}
                      style={{ '--tln-progress-color': 'var(--info)' } as React.CSSProperties}
                    />
                    <span className="v">{q.memGBUsed}/{q.memGB}G</span>
                  </div>
                </div>

                {/* created */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                  {relTime(ageSec)}
                </div>

                {/* actions */}
                <div className="actions" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" iconOnly aria-label="More">
                    <TlnIcon name="more" size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TenantDrawer tenant={detail} onClose={() => setDetail(null)} />
    </>
  );
}
