/* PageTenants — admin: workspace list + TenantDrawer + CreateWorkspaceDialog.
 * UI label: "Workspaces" / "空间". File/route stays `tenants`.
 * Data: useTenants() from src/hooks/useTenants.ts
 */
import { useState, useCallback } from 'react';
import { Button, ProgressBar, PageHeader } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useTenants } from '../hooks/useTenants';
import { EmptyState } from '../components';
import { TenantDrawer } from './_tenants/TenantDrawer';
import { CreateWorkspaceDialog } from './_tenants/CreateWorkspaceDialog';
import type { TenantDTO, TenantQuotaDTO, TenantUsageDTO } from '../api/types';

import './PageTenants.css';

function relTime(sec: number): string {
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

/**
 * 三维配额使用率条 —— 与详情页 TenantDrawer 的 quota-row 风格一致，
 * 但更紧凑（列表行高有限）。复用 DrawerContent 里的 ProgressBar 颜色变量。
 * quota 为 0 代表「不限」，对应维度不渲染进度条，只显示 ∞。
 */
function QuotaBars({ quota, usage }: { quota: TenantQuotaDTO; usage: TenantUsageDTO }) {
  const t = useT();

  const dims = [
    {
      key:   'vcpu',
      label: t('tenants.quota.vcpu'),
      used:  usage.vcpu,
      max:   quota.vcpu,
      fmt:   (v: number) => v.toFixed(1),
      unit:  'vCPU',
      // vCPU 使用默认紫色（--acc），与 Drawer 一致
      style: undefined as React.CSSProperties | undefined,
    },
    {
      key:   'mem',
      label: t('tenants.quota.memory'),
      used:  usage.mem_gb,
      max:   quota.mem_gb,
      fmt:   (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1),
      unit:  'GB',
      style: { '--tln-progress-color': 'var(--info)' } as React.CSSProperties,
    },
    {
      key:   'disk',
      label: t('tenants.quota.disk'),
      used:  usage.disk_gb,
      max:   quota.disk_gb,
      fmt:   (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1),
      unit:  'GB',
      style: { '--tln-progress-color': 'var(--teal, #56cbb8)' } as React.CSSProperties,
    },
  ] as const;

  return (
    <div className="quota-bars">
      {dims.map(dim => (
        <div key={dim.key} className="qbar-row">
          {/* 维度小标签 */}
          <span className="qbar-lbl">{dim.label}</span>
          {dim.max === 0 ? (
            /* 不限：不显示进度条，只显示已用量 + ∞ */
            <span className="qbar-inf">
              <span className="qbar-used">{dim.fmt(dim.used)}</span>
              {' / ∞'}
            </span>
          ) : (
            <>
              <ProgressBar value={dim.used} max={dim.max} style={dim.style} />
              <span className="qbar-val">
                <span className="qbar-used">{dim.fmt(dim.used)}</span>
                {' / '}{dim.max} {dim.unit}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function PageTenants() {
  const t = useT();
  const { data, isLoading, isError, error } = useTenants();

  const [detail,       setDetail]       = useState<TenantDTO | null>(null);
  const [createDialog, setCreateDialog] = useState(false);

  const tenants = data?.tenants ?? [];

  // 导出 CSV：把当前 tenants 列表导出（纯前端，RFC4180 转义 + BOM）。
  // 同款风格参考 PageRecordings.handleExportCsv。
  const handleExportCsv = useCallback(() => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['id', 'name', 'plan', 'members', 'active_sandboxes', 'quota_max_sandboxes', 'created_at'];
    const rows = tenants.map(ten => [
      ten.id,
      ten.name,
      ten.plan ?? 'free',
      ten.member_count ?? '',
      ten.active_sandboxes,
      ten.quota_max_sandboxes,
      ten.created_at,
    ].map(esc).join(','));
    const csv = '﻿' + [header.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tenants]);

  return (
    <>
      <PageHeader
        title={t('tenants.title')}
        num={String(tenants.length)}
        desc={t('tenants.desc')}
        actions={
          <>
            <Button variant="default" onClick={handleExportCsv} disabled={tenants.length === 0}>
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
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} description={t('tenants.loadingDesc')} />}
        {isError   && <EmptyState variant="error"   error={error} />}

        {!isLoading && !isError && (
          <div className="tln-tbl">
            <div className="tln-tbl-head ten-row">
              <div>{t('tenants.colName')}</div>
              <div>{t('tenants.colPlan')}</div>
              <div>{t('tenants.colMembers')}</div>
              {/* Sandbox 数：活跃数/上限，独立计数维度，不与资源配额混淆 */}
              <div>{t('tenants.colSandboxes')}</div>
              <div>{t('tenants.colQuota')}</div>
              <div>{t('tenants.colCreated')}</div>
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

                  {/* 套餐:优先显示后端 plan_name(plans 表显示名,支持 starter 等自定义套餐),
                      缺失时回退用 plan code。CSS 着色类沿用 code 首字母大写,
                      仅内置三档(Free/Team/Enterprise)有专属配色,其余套餐落默认样式。 */}
                  {(() => {
                    const code = tenant.plan ?? 'free';
                    const cls  = code.charAt(0).toUpperCase() + code.slice(1);
                    const lbl  = tenant.plan_name ?? code;
                    return <div><span className={`tplan ${cls}`}>{lbl}</span></div>;
                  })()}

                  {/* member_count：G4 新增字段；后端未填时显示 — */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {tenant.member_count != null ? tenant.member_count : '—'}
                  </div>

                  {/* Sandbox 数列：活跃数 / 套餐上限，与资源配额独立维度 */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {tenant.active_sandboxes}
                    <span style={{ color: 'var(--fg-3)' }}> / {tenant.quota_max_sandboxes}</span>
                  </div>

                  {/* 配额使用列：vCPU / 内存 / 磁盘三维用量条。
                      quota/usage 字段来自列表端点扩展；旧响应缺失时回退空占位。 */}
                  <div>
                    {tenant.quota && tenant.usage ? (
                      <QuotaBars quota={tenant.quota} usage={tenant.usage} />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>—</span>
                    )}
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                    {relTime(ageSec)}
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
