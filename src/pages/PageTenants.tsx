/* PageTenants — admin: workspace list + TenantDrawer + CreateWorkspaceDialog.
 * UI label: "Workspaces" / "空间". File/route stays `tenants`.
 * Data: useTenants() from src/hooks/useTenants.ts
 */
import { useState } from 'react';
import { Button, ProgressBar, PageHeader } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useTenants } from '../hooks/useTenants';
import { EmptyState } from '../components';
import { TenantDrawer } from './_tenants/TenantDrawer';
import { CreateWorkspaceDialog } from './_tenants/CreateWorkspaceDialog';
import type { TenantDTO } from '../api/types';

import './PageTenants.css';

function relTime(sec: number): string {
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export function PageTenants() {
  const t = useT();
  const { data, isLoading, isError } = useTenants();

  const [detail,       setDetail]       = useState<TenantDTO | null>(null);
  const [createDialog, setCreateDialog] = useState(false);

  const tenants = data?.tenants ?? [];

  return (
    <>
      <PageHeader
        title={t('tenants.title')}
        num={String(tenants.length)}
        desc={t('tenants.desc')}
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="download" size={14} />
              {t('tenants.exportCsv')}
            </Button>
            <Button variant="primary" onClick={() => setCreateDialog(true)}>
              <TlnIcon name="plus" size={14} />
              {t('tenants.new')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError   && <EmptyState variant="error"   title={t('common.loadFailed')} />}

        {!isLoading && !isError && (
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
              const ageSec = Math.round((Date.now() / 1000) - tenant.created_at);
              return (
                <div
                  key={tenant.id}
                  className="tln-tbl-row ten-row"
                  onClick={() => setDetail(tenant)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="name-cell">
                    <div className="av">{tenant.name[0].toUpperCase()}</div>
                    <div className="tinfo">
                      <span className="tn">{tenant.name}</span>
                      <span className="tid">tenant_{tenant.id}</span>
                    </div>
                  </div>

                  {/* plan 读取 API 字段，缺省回退 free */}
                  {(() => {
                    const plan = tenant.plan ?? 'free';
                    // CSS 类名使用首字母大写的格式（Free / Team / Enterprise）
                    const cls  = plan.charAt(0).toUpperCase() + plan.slice(1);
                    const lbl  = plan === 'enterprise' ? t('tenants.drawer.planEnt')
                               : plan === 'team'       ? t('tenants.drawer.planTeam')
                               :                        t('tenants.drawer.planFree');
                    return <div><span className={`tplan ${cls}`}>{lbl}</span></div>;
                  })()}

                  {/* member_count：G4 新增字段；后端未填时显示 — */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {tenant.member_count != null ? tenant.member_count : '—'}
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {tenant.active_sandboxes}
                    {' '}<span style={{ color: 'var(--fg-3)' }}>/ {tenant.quota_max_sandboxes}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div className="quota-cell">
                      <span className="lbl">{t('tenants.colSandboxes')}</span>
                      <ProgressBar value={tenant.active_sandboxes} max={tenant.quota_max_sandboxes || 1} />
                      <span className="v">{tenant.active_sandboxes}/{tenant.quota_max_sandboxes}</span>
                    </div>
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                    {relTime(ageSec)}
                  </div>

                  <div className="actions" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" iconOnly aria-label={t('common.filter')}>
                      <TlnIcon name="more" size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}

            {tenants.length === 0 && (
              <EmptyState variant="empty" title={t('common.empty')} />
            )}
          </div>
        )}
      </div>

      <TenantDrawer tenant={detail} onClose={() => setDetail(null)} />
      <CreateWorkspaceDialog open={createDialog} onClose={() => setCreateDialog(false)} />
    </>
  );
}
