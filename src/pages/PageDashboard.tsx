/* PageDashboard — 工作区概览。按最新原型（page-dashboard.jsx）重构：
 *   顶部 4 张 Stat 卡（label/value/delta/hint + Sparkline，vCPU/内存带进度条）
 *   中间行 1.4fr/1fr：Sandbox 状态分布（SandboxStateBar + legend）+ 活动流（Timeline）
 *   底部：最近 sandbox DataTable（ID·状态 / 名称 / 镜像 / 工作区 / CPU / 时长 / 操作）
 * 数据走 useDashboard()。 */
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Button, PageHeader, Sparkline, ProgressBar,
  Grid, Flex, StatusBadge,
  Stat, StatLabel, StatValue, StatDelta, StatHint,
  Timeline, TimelineItem, TimelineDot, TimelineContent, TimelineTitle, TimelineTime, TimelineDesc,
  DataTable, DataTableContent, DataTableToolbar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@talon-sandbox/react';
import type { ColumnDef, StatDeltaKind, TimelineItemKind, SandboxState } from '@talon-sandbox/react';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { EmptyState } from '../components/EmptyState';
import { useDashboard } from '../hooks';
import type { DashboardActivity, DashboardSandbox } from '../api/types';

import './PageDashboard.css';

// dashboard 列表封顶：最多展示 20 条，超出由列表页承接。
const DASH_LIST_CAP = 20;
// 活动流只展示最新 5 条（dashboard 是概览，完整历史走审计日志页）。
const ACTIVITY_CAP = 5;

// 状态分布柱状条用色（与原型 STATE_COLORS 对齐；created 用 info 蓝补全）。
const STATE_COLORS: Partial<Record<string, string>> = {
  running: 'var(--ok)',
  idle: 'var(--fg-3)',
  paused: 'var(--magenta)',
  provisioning: 'var(--warn)',
  'pulling-image': 'var(--warn)',
  created: 'var(--info)',
  terminating: 'var(--warn)',
  failed: 'var(--err)',
  evicted: 'var(--fg-4)',
};
const STATE_ORDER = [
  'running', 'pulling-image', 'provisioning', 'created', 'idle', 'paused', 'terminating', 'failed', 'evicted',
];

function relTime(secAgo: number): string {
  if (secAgo < 60) return `${secAgo}s`;
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m`;
  if (secAgo < 86400) return `${Math.floor(secAgo / 3600)}h`;
  return `${Math.floor(secAgo / 86400)}d`;
}
function ageSecOf(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 1000));
}
// cpu_millis → "0.5 vCPU"；0/缺省走默认标签。
function fmtVCPU(millis: number | undefined, t: (k: string) => string): string {
  if (!millis) return t('dash.cpuDefault');
  const v = millis / 1000;
  return (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + ' vCPU';
}

// 审计事件类型 → Timeline 行色调。
function activityKind(eventKind: string, outcome?: string): TimelineItemKind {
  if (outcome === 'failure') return 'err';
  if (eventKind.includes('failed') || eventKind.includes('invalid') || eventKind.includes('rate_limited')) return 'err';
  if (eventKind.startsWith('sandbox_')) return 'ok';
  if (eventKind.startsWith('secret') || eventKind.includes('reveal')) return 'warn';
  return 'info';
}

export function PageDashboard() {
  const t = useT();
  const nav = useNavigate();
  const me = useApp((s) => s.me);

  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) return <EmptyState variant="loading" />;
  if (error) {
    return (
      <EmptyState
        variant="error"
        error={error}
        action={<Button onClick={() => refetch()}>{t('common.retry')}</Button>}
      />
    );
  }

  const summary  = data?.summary;
  const activity = data?.recent_activity ?? [];
  const sandboxes = data?.running_sandboxes ?? [];   // 后端已扩为「所有非终态 sandbox」
  const stateMap = data?.states_by_count ?? {};
  const total = Object.values(stateMap).reduce((a, b) => a + b, 0);

  const activeSeries = summary?.active_sandboxes.series.map(p => p.value) ?? [];
  const cpuSeries    = summary?.vcpu.series.map(p => p.value) ?? [];
  const memSeries    = summary?.memory_gib.series.map(p => p.value) ?? [];
  const egressSeries = summary?.egress_mbps.series.map(p => p.value) ?? [];

  const vcpuCur = summary?.vcpu.current ?? 0;
  const vcpuLim = summary?.vcpu.limit ?? 0;
  const memCur  = summary?.memory_gib.current ?? 0;
  const memLim  = summary?.memory_gib.limit ?? 0;
  const egress  = summary?.egress_mbps.current ?? 0;
  const deltaEgress = summary?.egress_mbps.delta_24h_pct;
  const deltaActive = summary?.active_sandboxes.delta_24h;

  // 最近 sandbox 表：按 age 降序（最新在前），封顶。
  const rows = [...sandboxes]
    .sort((a, b) => ageSecOf(b.created_at) - ageSecOf(a.created_at))
    .slice(0, DASH_LIST_CAP);

  const columns: ColumnDef<DashboardSandbox>[] = [
    {
      key: 'id', label: t('dash.col.idState'), width: 230,
      render: (r) => (
        <div className="dsb-idstate">
          <span className="dsb-id">{r.id}</span>
          <StatusBadge state={r.status as SandboxState} />
        </div>
      ),
    },
    { key: 'name', label: t('dash.col.name'), truncate: true, render: (r) => <span style={{ color: 'var(--fg-1)' }}>{r.name || '—'}</span> },
    { key: 'image', label: t('dash.col.image'), truncate: true, render: (r) => <span className="dsb-mono">{r.image || '—'}</span> },
    { key: 'tenant', label: t('dash.col.tenant'), width: 150, render: (r) => <span className="dsb-mono">{r.tenant}</span> },
    {
      key: 'cpu', label: t('dash.col.cpu'), width: 120, align: 'right',
      render: (r) => <span className="dsb-mono" style={{ color: r.cpu_millis ? 'var(--fg-0)' : 'var(--fg-4)' }}>{fmtVCPU(r.cpu_millis, t)}</span>,
    },
    { key: 'age', label: t('dash.col.age'), width: 80, align: 'right', render: (r) => <span className="dsb-mono">{relTime(ageSecOf(r.created_at))}</span> },
    {
      key: 'a', label: '', width: 40, align: 'center', stopClick: true,
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button iconOnly variant="ghost" size="sm" aria-label="actions"><TlnIcon name="more" size={14} /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => nav('/sandboxes/' + r.id)}><TlnIcon name="box" size={13} />{t('dash.menu.open')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav('/sandboxes/' + r.id + '?tab=terminal')}><TlnIcon name="terminal" size={13} />{t('dash.menu.terminal')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onClick={() => nav('/sandboxes/' + r.id)}><TlnIcon name="stop" size={13} />{t('dash.menu.stop')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

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
        {/* ── 顶部指标行 ── */}
        <Grid cols={4} gap="md">
          <Card>
            <CardContent>
              <Flex justify="between" align="end">
                <Stat>
                  <StatLabel>{t('dash.metric.active')}</StatLabel>
                  <StatValue>{summary?.active_sandboxes.current ?? 0}</StatValue>
                  {deltaActive != null && <StatDelta kind={deltaActive >= 0 ? 'up' : 'down'}>{(deltaActive >= 0 ? '+' : '') + deltaActive}</StatDelta>}
                  <StatHint>vs 24h</StatHint>
                </Stat>
                {activeSeries.length > 1 && <Sparkline data={activeSeries} height={42} style={{ width: 100 }} color="var(--ok)" />}
              </Flex>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Flex justify="between" align="end">
                <Stat>
                  <StatLabel>{t('dash.metric.cpu')}</StatLabel>
                  <StatValue>{vcpuLim ? `${vcpuCur.toFixed(1)} / ${vcpuLim}` : vcpuCur.toFixed(1)}</StatValue>
                  <StatHint>{vcpuLim ? Math.round((vcpuCur / vcpuLim) * 100) + '%' : t('dash.unset')}</StatHint>
                </Stat>
                {cpuSeries.length > 1 && <Sparkline data={cpuSeries} height={42} style={{ width: 100 }} />}
              </Flex>
              {vcpuLim > 0 && <ProgressBar value={vcpuCur} max={vcpuLim} style={{ marginTop: 10 }} />}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Flex justify="between" align="end">
                <Stat>
                  <StatLabel>{t('dash.metric.mem')} · GiB</StatLabel>
                  <StatValue>{memLim ? `${memCur} / ${memLim}` : String(memCur)}</StatValue>
                  <StatHint>{memLim ? Math.round((memCur / memLim) * 100) + '%' : t('dash.unset')}</StatHint>
                </Stat>
                {memSeries.length > 1 && <Sparkline data={memSeries} height={42} style={{ width: 100 }} color="var(--info)" />}
              </Flex>
              {memLim > 0 && <ProgressBar value={memCur} max={memLim} style={{ marginTop: 10, '--pb-color': 'var(--info)' } as React.CSSProperties} />}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Flex justify="between" align="end">
                <Stat>
                  <StatLabel>{t('dash.metric.egress')} · MB/s</StatLabel>
                  <StatValue>{egress.toFixed(1)}</StatValue>
                  {deltaEgress != null && <StatDelta kind={(deltaEgress >= 0 ? 'up' : 'down') as StatDeltaKind}>{(deltaEgress >= 0 ? '+' : '') + deltaEgress.toFixed(0) + '%'}</StatDelta>}
                  <StatHint>vs 24h</StatHint>
                </Stat>
                {egressSeries.length > 1 && <Sparkline data={egressSeries} height={42} style={{ width: 100 }} color="var(--teal)" />}
              </Flex>
            </CardContent>
          </Card>
        </Grid>

        {/* ── 中间行：状态分布 + 活动流 ── */}
        <Grid template="1.4fr 1fr" gap="md" style={{ marginTop: 24 }}>
          <Card>
            <CardContent>
              <div className="dash-card-head">
                <div className="dch-title">
                  <TlnIcon name="box" size={14} style={{ color: 'var(--fg-2)' }} />
                  {t('dash.stateDist')}
                  <span className="dch-count">{t('dash.totalCount').replace('{n}', String(total))}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => nav('/sandboxes')}>{t('dash.viewAllAudit')}<TlnIcon name="arrowRight" size={12} /></Button>
              </div>

              {total === 0 ? (
                <div className="states-empty">
                  <div className="states-empty-text">
                    <div className="head">{t('dash.statesEmpty.head')}</div>
                    <div className="desc">{t('dash.statesEmpty.desc')}</div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => nav('/sandboxes?new=1')}>
                    <TlnIcon name="plus" size={12} />{t('dash.statesEmpty.cta')}
                  </Button>
                </div>
              ) : (
                <>
                  {/* 堆叠条:1:1 原型(inline，非 SandboxStateBar——后者强制带英文 legend) */}
                  <div className="dash-state-bar" role="img" aria-label="sandbox state distribution">
                    {STATE_ORDER.map((k) => {
                      const n = stateMap[k] ?? 0;
                      if (!n) return null;
                      return <div key={k} style={{ flex: n, background: STATE_COLORS[k] ?? 'var(--fg-3)' }} title={`${t(`state.${k}`)} · ${n}`} />;
                    })}
                  </div>
                  {/* legend:每格 色点 + 中文状态名 + 大号数字（自渲染保证 created 也有 zh 文案） */}
                  <Grid cols={4} gap="sm" style={{ marginTop: 16 }}>
                    {STATE_ORDER.map((k) => (
                      <div key={k} className="dash-legend-cell">
                        <div className="dlc-label">
                          <span className="dlc-swatch" style={{ background: STATE_COLORS[k] ?? 'var(--fg-3)' }} />
                          {t(`state.${k}`)}
                        </div>
                        <div className={'dlc-num' + ((stateMap[k] ?? 0) === 0 ? ' zero' : '')}>{stateMap[k] ?? 0}</div>
                      </div>
                    ))}
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="dash-card-head">
                <div className="dch-title">
                  <TlnIcon name="zap" size={14} style={{ color: 'var(--fg-2)' }} />
                  {t('dash.recentActivity')}
                </div>
                <Button variant="ghost" size="sm" onClick={() => nav('/audit')}>{t('dash.auditLog')}</Button>
              </div>

              {activity.length === 0 ? (
                <div className="activity-empty">{t('dash.activityEmpty')}</div>
              ) : (
                <Timeline>
                  {activity.slice(0, ACTIVITY_CAP).map((r: DashboardActivity, i: number) => {
                    const secAgo = Math.round((Date.now() - new Date(r.ts).getTime()) / 1000);
                    return (
                      <TimelineItem key={i} kind={activityKind(r.kind, r.outcome)}>
                        <TimelineDot />
                        <TimelineContent>
                          <TimelineTitle>
                            {r.summary}
                            <TimelineTime>{relTime(secAgo)}</TimelineTime>
                          </TimelineTitle>
                          <TimelineDesc>
                            <span className="tl-ev">{r.kind}</span>
                            {r.actor && <span className="tl-actor"><TlnIcon name="user" size={10} />{r.actor}</span>}
                            {r.target && <span className="tl-tgt" title={r.target}>{r.target}</span>}
                            {r.outcome && (
                              <span className={'tl-out ' + (r.outcome === 'failure' ? 'err' : 'ok')}>
                                {r.outcome === 'failure' ? t('audit.outcome.err') : t('audit.outcome.ok')}
                              </span>
                            )}
                          </TimelineDesc>
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
                </Timeline>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── 底部：最近 sandbox 表 ── */}
        <div style={{ marginTop: 24 }}>
          <DataTable
            data={rows}
            columns={columns}
            rowKey="id"
            onRowClick={(r) => nav('/sandboxes/' + r.id)}
            empty={t('dash.sbEmpty')}
          >
            <DataTableToolbar>
              <span className="dt-title">{t('dash.recentSandboxes')} <span className="dt-count">{sandboxes.length}</span></span>
              <span style={{ flex: 1 }} />
              <Button size="sm" variant="ghost" onClick={() => nav('/sandboxes')}>
                <TlnIcon name="filter" size={13} />{t('dash.viewAllShort')}
              </Button>
              <Button size="sm" variant="primary" onClick={() => nav('/sandboxes?new=1')}>
                <TlnIcon name="plus" size={13} />{t('dash.create')}
              </Button>
            </DataTableToolbar>
            <DataTableContent />
          </DataTable>
        </div>
      </div>
    </>
  );
}
