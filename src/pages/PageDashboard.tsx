/* PageDashboard — metrics overview wired to useDashboard() hook. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ProgressBar, PageHeader } from '@talon-sandbox/react';
import type { SandboxState as DSState } from '@talon-sandbox/react';

// DEFAULT_STATE_COLORS was removed in v0.3; inline the palette used by the dashboard bar
const DEFAULT_STATE_COLORS: Partial<Record<DSState, string>> = {
  running:         'var(--ok)',
  provisioning:    'var(--acc)',
  'pulling-image': 'var(--info)',
  idle:            'var(--warn)',
  paused:          'var(--warn)',
  terminating:     'var(--fg-3)',
  evicted:         'var(--bg-3)',
  failed:          'var(--err)',
};
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { Sparkline } from '../components/Sparkline';
import { EmptyState } from '../components/EmptyState';
import { useDashboard } from '../hooks';
import type { DashboardActivity } from '../api/types';

import './PageDashboard.css';

// ── count-up animation ────────────────────────────────────────────────────────
function useCount(target: number, duration = 700): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      setV(target * ease);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function fmtNum(n: number): string {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1);
}

function relTime(secAgo: number): string {
  if (secAgo < 60) return `${secAgo}s`;
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m`;
  return `${Math.floor(secAgo / 3600)}h`;
}

// 计算 sandbox 已运行时长，格式如 "5m"、"2h"；缺少 created_at 时返回 —
function fmtAge(createdAt?: string): string {
  if (!createdAt) return '—';
  const ageSec = (Date.now() - new Date(createdAt).getTime()) / 1000;
  if (ageSec < 60)    return Math.floor(ageSec) + 's';
  if (ageSec < 3600)  return Math.floor(ageSec / 60) + 'm';
  return Math.floor(ageSec / 3600) + 'h';
}

// ── Metric card ───────────────────────────────────────────────────────────────
interface MetricProps {
  micro: string;
  value: number;
  unit?: string;
  of?: number | string;
  delta?: string;
  deltaKind?: 'neut' | 'bad' | 'ok';
  series?: number[];
  color?: string;
}

function Metric({ micro, value, unit, of: ofVal, delta, deltaKind = 'neut', series, color }: MetricProps) {
  const animated = useCount(value);
  return (
    <Card style={{ padding: 'var(--pad-card, 16px)' }}>
      <div className="dash-metric">
        <div className="top">
          <span className="micro">{micro}</span>
          {delta && <span className={'delta ' + deltaKind}>{delta}</span>}
        </div>
        <div className="num">
          <span>{fmtNum(animated)}</span>
          {unit && <span className="unit">{unit}</span>}
          {ofVal != null && <span className="of">/ {ofVal}</span>}
        </div>
        {series && (
          <Sparkline data={series} height={36} color={color ?? 'var(--acc-strong)'} className="spark" />
        )}
      </div>
    </Card>
  );
}

const DS_STATE_ORDER: DSState[] = [
  'running', 'pulling-image', 'provisioning', 'idle', 'paused', 'terminating', 'failed', 'evicted',
];

// 1:1 port of the prototype's StatesOverview: stacked bar + 4-col legend grid.
// Legend labels go through i18n via t(`state.<key>`) so they render in zh/en.
function StatesOverview({
  order,
  counts,
  t,
}: {
  order: DSState[];
  counts: Partial<Record<string, number>>;
  t: (k: string) => string;
}) {
  const total = order.reduce((s, k) => s + (counts[k] ?? 0), 0) || 1;
  return (
    <div>
      <div className="states-bar" role="img" aria-label="sandbox states distribution">
        {order.map((k) => {
          const c = counts[k] ?? 0;
          if (!c) return null;
          return (
            <div
              key={k}
              style={{ flex: c, background: DEFAULT_STATE_COLORS[k] }}
              title={`${t(`state.${k}`)}: ${c} (${Math.round((c / total) * 100)}%)`}
            />
          );
        })}
      </div>
      <div className="states-legend">
        {order.map((k) => {
          const c = counts[k] ?? 0;
          return (
            <div key={k} className="item">
              <span className="swatch" style={{ background: DEFAULT_STATE_COLORS[k] }} />
              <span className="label">{t(`state.${k}`)}</span>
              <span className={'count' + (c === 0 ? ' zero' : '')}>{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageDashboard() {
  const t   = useT();
  const nav = useNavigate();
  const me  = useApp((s) => s.me);

  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) return <EmptyState variant="loading" />;
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <EmptyState
        variant="error"
        title={t('dash.loadFailed')}
        message={msg}
        action={<Button onClick={() => refetch()}>{t('common.retry')}</Button>}
      />
    );
  }

  const summary  = data?.summary;
  const quota    = data?.quota_24h;
  const activity = data?.recent_activity ?? [];
  const running  = data?.running_sandboxes ?? [];
  const stateMap = data?.states_by_count ?? {};

  const stateCounts: Partial<Record<DSState, number>> = {};
  for (const key of DS_STATE_ORDER) {
    if (stateMap[key] != null) stateCounts[key] = stateMap[key];
  }

  const activeSeries = summary?.active_sandboxes.series.map(p => p.value) ?? [];
  const cpuSeries    = summary?.vcpu.series.map(p => p.value) ?? [];
  const memSeries    = summary?.memory_gib.series.map(p => p.value) ?? [];
  const egressSeries = summary?.egress_mbps.series.map(p => p.value) ?? [];
  const deltaEgress  = summary?.egress_mbps.delta_24h_pct;

  return (
    <>
      <PageHeader
        title={
          <>
            {t('dash.welcome')}{' '}
            <span style={{ color: 'var(--acc-strong)' }}>
              {me?.name?.split(' · ')[0] ?? me?.email ?? 'there'}
            </span>
          </>
        }
        desc={t('dash.desc')}
        actions={
          <>
            <Button variant="ghost" onClick={() => refetch()}>
              <TlnIcon name="refresh" size={14} />
              {t('common.refresh')}
            </Button>
            <Button variant="primary" onClick={() => nav('/sandboxes?new=1')}>
              <TlnIcon name="plus" size={14} />
              {t('dash.newSandbox')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        <div className="dash-grid">
          <Metric
            micro={t('dash.metric.active')}
            value={summary?.active_sandboxes.current ?? 0}
            delta={summary?.active_sandboxes.delta_24h != null ? `24h +${summary.active_sandboxes.delta_24h}` : undefined}
            deltaKind="neut"
            series={activeSeries}
          />
          <Metric
            micro={t('dash.metric.cpu')}
            value={summary?.vcpu.current ?? 0}
            unit="vCPU"
            of={summary?.vcpu.limit}
            delta={summary?.vcpu.delta_24h != null ? `+${summary.vcpu.delta_24h.toFixed(1)} vCPU` : undefined}
            deltaKind="neut"
            series={cpuSeries}
          />
          <Metric
            micro={t('dash.metric.mem')}
            value={summary?.memory_gib.current ?? 0}
            unit="GiB"
            of={summary?.memory_gib.limit}
            delta={summary?.memory_gib.delta_24h != null ? `+${summary.memory_gib.delta_24h.toFixed(1)} GiB` : undefined}
            deltaKind="neut"
            series={memSeries}
            color="var(--info)"
          />
          <Metric
            micro={t('dash.metric.egress')}
            value={summary?.egress_mbps.current ?? 0}
            unit="MB/s"
            delta={deltaEgress != null ? `24h ${deltaEgress > 0 ? '+' : ''}${deltaEgress.toFixed(0)}%` : undefined}
            deltaKind={deltaEgress != null && deltaEgress < 0 ? 'bad' : 'neut'}
            series={egressSeries}
            color="var(--info)"
          />
        </div>

        <div className="dash-2col">
          <Card
            title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="box" size={14} style={{ color: 'var(--fg-2)' }} />{t('dash.sandboxStates')}</span>}
            footer={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>{t('dash.lastRefresh')}</span>}
          >
            <StatesOverview order={DS_STATE_ORDER} counts={stateMap} t={t} />
          </Card>

          <Card
            title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="clock" size={14} style={{ color: 'var(--fg-2)' }} />{t('dash.quota24h')}</span>}
          >
            <div className="dash-quota-row">
              {quota && (
                <>
                  <div className="dash-quota-item">
                    <div className="qi-header">
                      <span className="qi-label">vCPU</span>
                      <span className="qi-value">{quota.vcpu.used.toFixed(1)} / {quota.vcpu.limit}</span>
                    </div>
                    <ProgressBar value={quota.vcpu.used} max={quota.vcpu.limit || 1} />
                  </div>
                  <div className="dash-quota-item">
                    <div className="qi-header">
                      <span className="qi-label">{t('dash.metric.mem')}</span>
                      <span className="qi-value">{quota.memory_gib.used} / {quota.memory_gib.limit} GiB</span>
                    </div>
                    <ProgressBar value={quota.memory_gib.used} max={quota.memory_gib.limit || 1} />
                  </div>
                  <div className="dash-quota-item">
                    <div className="qi-header">
                      <span className="qi-label">{t('dash.secretsAccessed')}</span>
                      <span className="qi-value">{quota.secrets_reads.used.toLocaleString()}</span>
                    </div>
                    {/* 原型：color="var(--magenta)"；用 --pb-color 局部覆盖 .fill 颜色 */}
                    <ProgressBar value={quota.secrets_reads.used} max={quota.secrets_reads.limit || 100} style={{ '--pb-color': 'var(--magenta)' } as React.CSSProperties} />
                  </div>
                  <div className="dash-quota-item">
                    <div className="qi-header">
                      <span className="qi-label">{t('dash.failures24h')}</span>
                      <span className="qi-value danger">{quota.failures.used}</span>
                    </div>
                    {/* 原型：color="var(--err)"；用 --pb-color 局部覆盖 .fill 颜色 */}
                    <ProgressBar value={quota.failures.used} max={quota.failures.limit || 100} style={{ '--pb-color': 'var(--err)' } as React.CSSProperties} />
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="dash-2col">
          <Card
            title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="zap" size={14} style={{ color: 'var(--fg-2)' }} />{t('dash.recentActivity')}</span>}
            footer={<Button variant="ghost" size="sm" onClick={() => nav('/audit')}>{t('dash.viewAllAudit')}<TlnIcon name="arrowRight" size={12} /></Button>}
          >
            <div className="activity-list">
              {activity.map((r: DashboardActivity, i: number) => {
                const secAgo = Math.round((Date.now() - new Date(r.ts).getTime()) / 1000);
                return (
                  <div key={i} className={'activity-item ' + r.kind}>
                    <div className="dotw"><span className="d" /></div>
                    <div className="time">{relTime(secAgo)}</div>
                    <div className="text">
                      {r.summary.split(/(sb_[a-z0-9]+|[A-Z_]{3,}|\d+%|\d+\.\d+)/).map((part, j) =>
                        /(sb_[a-z0-9]+|[A-Z_]{3,}|\d+%|\d+\.\d+)/.test(part)
                          ? <span key={j} style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-0)' }}>{part}</span>
                          : part
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TlnIcon name="dot" size={14} style={{ color: 'var(--ok)', animation: 'tln-pulse 1.6s ease-in-out infinite' }} />
                {t('dash.runningNow')}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>{running.length}</span>
              </span>
            }
            footer={<Button variant="ghost" size="sm" onClick={() => nav('/sandboxes')}>{t('dash.viewAllSandboxes')}<TlnIcon name="arrowRight" size={12} /></Button>}
          >
            <div className="run-list">
              {running.map(s => {
                const isPulling = s.status === 'pulling-image';
                const dotColor  = isPulling ? 'var(--warn)' : 'var(--ok)';
                const dotShadow = isPulling ? '0 0 0 3px var(--warn-soft)' : '0 0 0 3px var(--ok-soft)';
                return (
                  <div key={s.id} className="run-row" onClick={() => nav('/sandboxes/' + s.id)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && nav('/sandboxes/' + s.id)}>
                    <span className="run-dot" style={{ background: dotColor, boxShadow: dotShadow }} />
                    <div className="who">
                      <span className="id">{s.id}</span>
                      <span className="task">{s.name || s.image}</span>
                    </div>
                    {/* age 列显示已运行时长，而非状态标签（与原型语义对齐） */}
                    <span className="age">{fmtAge(s.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
