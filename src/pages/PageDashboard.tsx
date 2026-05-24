/* PageDashboard — 1:1 port of page-dashboard.jsx prototype.
 * 4 metric cards · sandbox states bar · recent activity · running list
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, ProgressBar, SandboxStateBar, DEFAULT_STATE_COLORS } from '@talon-sandbox/react';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { Sparkline } from '../components/Sparkline';
import { MOCK_METRICS, MOCK_RECENT, MOCK_SANDBOXES, relTime } from '../mock/data';
import type { SandboxState } from '../mock/data';

import './PageDashboard.css';

// ── animated counter ──────────────────────────────────────────────────────────
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
  if (n >= 100) return Math.round(n).toString();
  return n.toFixed(1);
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
          <Sparkline
            data={series}
            height={36}
            color={color ?? 'var(--acc-strong)'}
            className="spark"
          />
        )}
      </div>
    </Card>
  );
}

// ── states label lookup ───────────────────────────────────────────────────────
const STATE_LABELS: Record<SandboxState, string> = {
  'running':       'Running',
  'pulling-image': 'Pulling',
  'provisioning':  'Provisioning',
  'idle':          'Idle',
  'paused':        'Paused',
  'terminating':   'Terminating',
  'failed':        'Failed',
  'evicted':       'Evicted',
};
const STATE_ORDER: SandboxState[] = ['running', 'pulling-image', 'provisioning', 'idle', 'paused', 'terminating', 'failed', 'evicted'];

// ── StatesOverview ────────────────────────────────────────────────────────────
function StatesOverview() {
  const counts = MOCK_METRICS.statesByCount;
  return (
    <div>
      <SandboxStateBar counts={counts} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px 16px', marginTop: 16 }}>
        {STATE_ORDER.map((k) => {
          const c = counts[k] ?? 0;
          const color = DEFAULT_STATE_COLORS[k];
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: '0 0 auto' }} />
              <span style={{ color: 'var(--fg-2)', flex: 1 }}>{STATE_LABELS[k]}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: c === 0 ? 'var(--fg-3)' : 'var(--fg-0)', fontSize: 12, fontWeight: 500 }}>{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RecentActivity ────────────────────────────────────────────────────────────
function RecentActivity() {
  return (
    <div className="activity-list">
      {MOCK_RECENT.map((r, i) => {
        const secAgo = Math.round((Date.now() - new Date(r.at).getTime()) / 1000);
        return (
          <div key={i} className={'activity-item ' + r.kind}>
            <div className="dotw"><span className="d" /></div>
            <div className="time">{relTime(secAgo)}</div>
            <div className="text">
              {r.text.split(/(sb_[a-z0-9]+|[A-Z_]{3,}|\d+%|\d+\.\d+)/).map((part, j) =>
                /(sb_[a-z0-9]+|[A-Z_]{3,}|\d+%|\d+\.\d+)/.test(part)
                  ? <span key={j} style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-0)' }}>{part}</span>
                  : part
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── RunningList ───────────────────────────────────────────────────────────────
function RunningList() {
  const nav = useNavigate();
  const items = MOCK_SANDBOXES.filter(s => s.state === 'running' || s.state === 'pulling-image');
  return (
    <div className="run-list">
      {items.map((s) => {
        const isPulling = s.state === 'pulling-image';
        const dotColor  = isPulling ? 'var(--warn)' : 'var(--ok)';
        const dotShadow = isPulling ? '0 0 0 3px var(--warn-soft)' : '0 0 0 3px var(--ok-soft)';
        const ageStr    = isPulling
          ? (Math.round((s.pullProgress ?? 0) * 100) + '%')
          : (Math.floor(s.ageSec / 60) + 'm');
        return (
          <div
            key={s.id}
            className="run-row"
            onClick={() => nav('/sandboxes/' + s.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && nav('/sandboxes/' + s.id)}
          >
            <span className="run-dot" style={{ background: dotColor, boxShadow: dotShadow }} />
            <div className="who">
              <span className="id">{s.id}</span>
              <span className="task">{s.task ?? s.image}</span>
            </div>
            <span className="age">{ageStr}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageDashboard() {
  const t   = useT();
  const nav = useNavigate();
  const me  = useApp((s) => s.me);
  const m   = MOCK_METRICS;
  // TODO: replace mock data with apiGet('/v1/metrics') etc.

  return (
    <>
      <PageHeader
        eyebrow={t('dash.eyebrow')}
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
            <Button variant="ghost" onClick={() => window.location.reload()}>
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
        {/* 4-col metric grid */}
        <div className="dash-grid">
          <Metric
            micro={t('dash.metric.active')}
            value={m.sandboxesActive}
            delta={'24h ' + m.sandboxesActive_delta_24h}
            deltaKind="neut"
            series={m.cpuSeries.slice(-30).map(v => v * 1.2)}
          />
          <Metric
            micro={t('dash.metric.cpu')}
            value={m.vCPU}
            unit="vCPU"
            of={m.vCPUTotal}
            delta="+2.1 vCPU"
            deltaKind="neut"
            series={m.cpuSeries}
          />
          <Metric
            micro={t('dash.metric.mem')}
            value={m.mem}
            unit="GiB"
            of={m.memTotal}
            delta="+1.4 GiB"
            deltaKind="neut"
            series={m.memSeries}
            color="var(--info)"
          />
          <Metric
            micro={t('dash.metric.egress')}
            value={m.egressMBs}
            unit="MB/s"
            delta={'24h ' + m.egressMBs_delta_24h}
            deltaKind="bad"
            series={m.egressSeries}
            color="var(--info)"
          />
        </div>

        {/* states bar + quota */}
        <div className="dash-2col">
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TlnIcon name="box" size={14} style={{ color: 'var(--fg-2)' }} />
                {t('dash.sandboxStates')}
              </span>
            }
            footer={
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>
                {t('dash.lastRefresh')}
              </span>
            }
          >
            <StatesOverview />
          </Card>

          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TlnIcon name="clock" size={14} style={{ color: 'var(--fg-2)' }} />
                {t('dash.quota24h')}
              </span>
            }
          >
            <div className="quota-row">
              <div className="quota-item">
                <div className="qi-header">
                  <span className="qi-label">vCPU</span>
                  <span className="qi-value">{m.vCPU.toFixed(1)} / {m.vCPUTotal}</span>
                </div>
                <ProgressBar value={m.vCPU} max={m.vCPUTotal} />
              </div>
              <div className="quota-item">
                <div className="qi-header">
                  <span className="qi-label">{t('dash.metric.mem')}</span>
                  <span className="qi-value">{m.mem} / {m.memTotal} GiB</span>
                </div>
                <ProgressBar value={m.mem} max={m.memTotal} />
              </div>
              <div className="quota-item">
                <div className="qi-header">
                  <span className="qi-label">{t('dash.secretsAccessed')}</span>
                  <span className="qi-value">{m.secretsAccessed_24h.toLocaleString()}</span>
                </div>
                <ProgressBar value={42} max={100} style={{ '--tln-progress-color': 'var(--magenta)' } as React.CSSProperties} />
              </div>
              <div className="quota-item">
                <div className="qi-header">
                  <span className="qi-label">{t('dash.failures24h')}</span>
                  <span className="qi-value danger">{m.failures_24h}</span>
                </div>
                <ProgressBar value={4} max={100} style={{ '--tln-progress-color': 'var(--err)' } as React.CSSProperties} />
              </div>
            </div>
          </Card>
        </div>

        {/* recent activity + running list */}
        <div className="dash-2col">
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TlnIcon name="zap" size={14} style={{ color: 'var(--fg-2)' }} />
                {t('dash.recentActivity')}
              </span>
            }
            footer={
              <Button variant="ghost" size="sm" onClick={() => nav('/audit')}>
                {t('dash.viewAll')}
                <TlnIcon name="arrowRight" size={12} />
              </Button>
            }
          >
            <RecentActivity />
          </Card>

          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TlnIcon name="dot" size={14} style={{ color: 'var(--ok)', animation: 'tln-pulse 1.6s ease-in-out infinite' }} />
                {t('dash.runningNow')}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>
                  {MOCK_SANDBOXES.filter(s => s.state === 'running' || s.state === 'pulling-image').length}
                </span>
              </span>
            }
            footer={
              <Button variant="ghost" size="sm" onClick={() => nav('/sandboxes')}>
                {t('dash.viewAll')}
                <TlnIcon name="arrowRight" size={12} />
              </Button>
            }
          >
            <RunningList />
          </Card>
        </div>
      </div>
    </>
  );
}
