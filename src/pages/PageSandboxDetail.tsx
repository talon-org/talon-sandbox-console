/* PageSandboxDetail — 6-tab detail view, wired to useSandbox() + useAuditEvents(). */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Tabs, Badge } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSandbox, useDeleteSandbox, useAuditEvents } from '../hooks';
import type { SandboxState } from '../api/types';
import { TabOverview, TabProcesses, TabPorts, TabFiles, TabNetwork, TabAudit } from './_sandboxes/DetailTabs';

import './PageSandboxDetail.css';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtStarted(ts?: number): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
}

function fmtCpu(millis?: number): string {
  return millis ? (millis / 1000).toFixed(1) + ' vCPU' : '—';
}

function fmtMem(bytes?: number): string {
  return bytes ? (bytes / (1024 ** 3)).toFixed(1) + ' GiB' : '—';
}

function stateVariant(s: SandboxState): 'success' | 'warning' | 'danger' | 'neutral' {
  if (s === 'running') return 'success';
  if (['pulling-image', 'provisioning', 'terminating', 'paused', 'idle'].includes(s)) return 'warning';
  if (s === 'failed') return 'danger';
  return 'neutral';
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageSandboxDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const t           = useT();
  const nav         = useNavigate();

  const [tab,         setTab]         = useState('overview');
  const [confirmKill, setConfirmKill] = useState(false);

  const { data: s, isLoading, error, refetch } = useSandbox(id);
  const del = useDeleteSandbox();

  const { data: auditData } = useAuditEvents({ target: id, limit: 50 });
  const auditEvents = auditData?.events ?? [];

  if (isLoading) return <EmptyState variant="loading" />;
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <EmptyState
        variant="error"
        title={t('detail.loadFailed')}
        message={msg}
        action={<Button onClick={() => refetch()}>{t('common.retry')}</Button>}
      />
    );
  }
  if (!s) {
    return (
      <EmptyState
        variant="empty"
        title={t('detail.notFound')}
        message={t('detail.notFoundDesc')}
        action={<Button onClick={() => nav('/sandboxes')}>{t('common.back')}</Button>}
      />
    );
  }

  const tabItems = [
    { value: 'overview',  label: t('detail.tab.overview') },
    { value: 'processes', label: t('detail.tab.processes') },
    { value: 'ports',     label: t('detail.tab.ports') },
    { value: 'files',     label: t('detail.tab.files') },
    { value: 'network',   label: t('detail.tab.network') },
    {
      value: 'audit',
      label: (
        <>
          {t('detail.tab.audit')}
          {auditEvents.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>
              {auditEvents.length}
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      {/* header */}
      <div className="sbx-detail-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="id-row">
            <span className="sbxid">{s.id}</span>
            {/* 租户标签：G2 tenant_id 字段 */}
            {s.tenant_id && (
              <Badge variant="neutral">{s.tenant_id}</Badge>
            )}
            {/* 状态通过 i18n 翻译，不渲染原始 API 字符串 */}
            <Badge variant={stateVariant(s.state)} dot={s.state === 'running'}>{t(`state.${s.state}`, s.state)}</Badge>
          </div>
          <div className="name-row">
            <TlnIcon name="box" size={14} style={{ color: 'var(--fg-3)' }} />
            {/* G2 name 字段：有值则显示用户命名，否则回退 profile */}
            <span>{s.name || s.profile}</span>
            {s.image_id && (
              <>
                <span style={{ color: 'var(--fg-4, var(--fg-3))' }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>{s.image_id}</span>
              </>
            )}
          </div>
        </div>
        <div className="det-actions">
          <Button variant="ghost" onClick={() => nav('/sandboxes/' + s.id + '/terminal')}>
            <TlnIcon name="terminal" size={14} />
            {t('detail.openShell')}
          </Button>
          <Button variant="ghost" iconOnly aria-label={t('common.recordings')}>
            <TlnIcon name="film" size={14} />
          </Button>
          <Button variant="ghost" iconOnly aria-label={t('common.restart')}>
            <TlnIcon name="refresh" size={14} />
          </Button>
          <Button variant="ghost" iconOnly aria-label={t('common.pause')}>
            <TlnIcon name="pause" size={14} />
          </Button>
          <Button variant="danger" onClick={() => setConfirmKill(true)}>
            <TlnIcon name="stop" size={14} />
            {t('common.kill')}
          </Button>
        </div>
      </div>

      {/* 信息行：与原型对齐，补充 node/region/disk 字段 */}
      <div className="sbx-info-row">
        <div className="item"><span className="k">{t('detail.started')}</span><span className="v">{fmtStarted(s.created_at)}</span></div>
        <div className="item"><span className="k">{t('detail.resources')}</span><span className="v">{fmtCpu(s.cpu_millis)} · {fmtMem(s.memory_bytes)}</span></div>
        {/* node 使用 worker_id 字段（API 有则显示，无则 — ） */}
        {/* worker_id：G2 新增字段 */}
        <div className="item"><span className="k">{t('detail.node')}</span><span className="v">{s.worker_id ?? '—'}</span></div>
        {/* region 字段（API 有则显示，无则 — ） */}
        <div className="item"><span className="k">{t('detail.region')}</span><span className="v">{(s as { region?: string }).region ?? '—'}</span></div>
        {/* disk 使用 disk_gib 字段（API 有则显示，无则 — ） */}
        <div className="item"><span className="k">{t('detail.disk')}</span><span className="v">{(s as { disk_gib?: number }).disk_gib != null ? (s as { disk_gib?: number }).disk_gib + ' GiB' : '—'}</span></div>
        <div className="item"><span className="k">{t('detail.profile')}</span><span className="v">{s.profile}</span></div>
        <div className="item"><span className="k">ttl</span><span className="v">{s.ttl_seconds != null ? s.ttl_seconds + 's' : '—'}</span></div>
      </div>

      {/* tabs */}
      <div className="sbx-tabs-wrap">
        <Tabs value={tab} onChange={setTab} items={tabItems} />
      </div>

      <div className="sbx-tab-body">
        {tab === 'overview'  && <TabOverview  s={s} />}
        {tab === 'processes' && <TabProcesses s={s} />}
        {tab === 'ports'     && <TabPorts     s={s} />}
        {tab === 'files'     && <TabFiles     s={s} />}
        {tab === 'network'   && <TabNetwork   s={s} />}
        {tab === 'audit'     && <TabAudit events={auditEvents} />}
      </div>

      {/* kill confirm */}
      <ConfirmDialog
        open={confirmKill}
        onClose={() => setConfirmKill(false)}
        title={
          <>{t('sbx.kill.title')}&nbsp;
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--err)' }}>{s.id}</span>
          </>
        }
        description={t('sbx.kill.body')}
        confirmLabel={t('sbx.kill.confirm')}
        cancelLabel={t('common.cancel')}
        loading={del.isPending}
        onConfirm={() => {
          del.mutate(s.id, {
            onSuccess: () => { setConfirmKill(false); nav('/sandboxes'); },
          });
        }}
      />
    </>
  );
}
