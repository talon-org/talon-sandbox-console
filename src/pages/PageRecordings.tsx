/* PageRecordings — workspace: recording session list.
 * Data from useRecordings() hook; no mock data.
 */
import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, PageHeader } from '@talon-sandbox/react';
import { EmptyState } from '../components';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { relTime } from '../lib/relTime';
import { useRecordings } from '../hooks';
import { useApp, useIsAdmin } from '../store';
import type { RecordingQueryParams } from '../api/types';

import './PageRecordings.css';

function fmtDuration(sec: number): string {
  return `${Math.floor(sec / 60)}m ${(sec % 60).toString().padStart(2, '0')}s`;
}

interface RecordingRowProps {
  id: string;
  title?: string;
  sandboxId: string;
  agent?: string;
  startedAt?: string;
  durationSec: number;
  steps: number;
  sizeKb: number;
  frames: number;
}

function RecordingRow({ id, title, sandboxId, agent, startedAt, durationSec, steps, sizeKb, frames }: RecordingRowProps) {
  const t        = useT();
  const navigate = useNavigate();
  const ageSec   = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : null;

  return (
    <div
      className="tln-tbl-row rec-row"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate('/recordings/' + id)}
      role="row"
      aria-label={title ?? id}
    >
      <div className="rectitle">
        <span className="t1">{title ?? id}</span>
        <span className="t2">{id} · {Math.round(sizeKb)} KiB · {frames} {t('recordings.frames')}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{sandboxId}</div>
      <div>
        {agent ? (
          <span className="agentpill">
            <TlnIcon name="agent" size={11} />
            {agent}
          </span>
        ) : (
          <span style={{ color: 'var(--fg-4)' }}>—</span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
        {ageSec !== null ? relTime(ageSec, t) : '—'}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        {fmtDuration(durationSec)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-1)' }}>
        {steps}
      </div>
    </div>
  );
}

export function PageRecordings() {
  const t = useT();
  const me = useApp(s => s.me);
  const isAdmin = useIsAdmin();

  const [agentFilter, setAgentFilter] = useState('all');

  // sandbox 过滤:从 URL query 读(详情页「录像」按钮跳转时带 ?sandbox=<id>)。
  // 用 query 而非 state,使该过滤可被链接/刷新保留,并能从详情页直接深链进来。
  const [searchParams, setSearchParams] = useSearchParams();
  const sandboxFilter = searchParams.get('sandbox') ?? '';
  const clearSandboxFilter = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('sandbox');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const queryOpts: RecordingQueryParams = useMemo(() => {
    const p: RecordingQueryParams = { limit: 50 };
    if (agentFilter !== 'all') p.agent = agentFilter;
    if (sandboxFilter) p.sandbox_id = sandboxFilter;
    if (!isAdmin && me?.tenant_id) p.tenant_id = me.tenant_id;
    return p;
  }, [agentFilter, sandboxFilter, isAdmin, me?.tenant_id]);

  const { data, isLoading, isError } = useRecordings(queryOpts);
  const items = data?.items ?? [];

  // Agent 筛选选项:后端没有 agent 目录端点,从已加载录像里累积提取 distinct agent。
  // 用 ref 跨渲染累积——选了具体 agent 后列表只剩该 agent,但 chip 仍保留之前见过
  // 的全部 agent,避免筛选后选项消失。
  const seenAgentsRef = useRef<Set<string>>(new Set());
  for (const r of items) {
    if (r.agent) seenAgentsRef.current.add(r.agent);
  }
  const agentOptions = useMemo<string[]>(
    () => Array.from(seenAgentsRef.current).sort(),
    // items 变化时重算(ref 已在上面累积)
    [items],
  );

  // 导出 CSV:把当前可见录像列表导出(纯前端,RFC4180 转义 + BOM)。
  const handleExportCsv = useCallback(() => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['id', 'title', 'sandbox_id', 'agent', 'started_at', 'duration_sec', 'steps', 'size_kb', 'frames'];
    const rows = items.map(r => [
      r.id, r.title ?? '', r.sandbox_id, r.agent ?? '',
      r.started_at ?? '', r.duration_sec, r.steps, r.size_kb, r.frames,
    ].map(esc).join(','));
    const csv = '﻿' + [header.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recordings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  return (
    <>
      <PageHeader
        title={t('recordings.title')}
        num={t('recordings.count').replace('{n}', String(items.length))}
        desc={t('recordings.desc')}
        actions={
          <>
            <Button variant="default" onClick={handleExportCsv} disabled={items.length === 0}>
              <TlnIcon name="download" size={14} />
              {t('common.export')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        {/* sandbox 过滤提示条:从详情页深链进来时显示,可一键清除回到全部录像。 */}
        {sandboxFilter && (
          <div className="sbx-filters" style={{ marginBottom: 14 }}>
            <button className="sbx-filter" aria-pressed onClick={clearSandboxFilter} title={t('recordings.clearSandboxFilter')}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{sandboxFilter}</span>
              <TlnIcon name="x" size={11} />
            </button>
          </div>
        )}
        {/* Agent 筛选:从当前录像里提取 distinct agent 动态生成 chip(与审计页同款
            .sbx-filter 风格)。只有存在 agent 数据时才显示;无 agent 则不渲染筛选行。 */}
        {agentOptions.length > 0 && (
          <div className="sbx-filters" style={{ marginBottom: 14 }}>
            <div className="group">
              <button
                className="sbx-filter"
                aria-pressed={agentFilter === 'all'}
                onClick={() => setAgentFilter('all')}
              >
                <span>{t('recordings.filterAll')}</span>
              </button>
              {agentOptions.map(a => (
                <button
                  key={a}
                  className="sbx-filter"
                  aria-pressed={agentFilter === a}
                  onClick={() => setAgentFilter(a)}
                >
                  <span>{a}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <EmptyState title={t('common.loading')} description={t('recordings.loadingDesc')} />
        )}
        {isError && (
          <EmptyState
            icon={<TlnIcon name="alert" size={24} />}
            title={t('recordings.errorTitle')}
            description={t('recordings.errorDesc')}
          />
        )}

        {!isLoading && !isError && (
          <div className="tln-tbl" role="table" aria-label={t('recordings.title')}>
            <div className="tln-tbl-head rec-row" role="rowgroup">
              <div role="columnheader">{t('recordings.colTitle')}</div>
              <div role="columnheader">{t('recordings.colSandbox')}</div>
              <div role="columnheader">{t('recordings.colAgent')}</div>
              <div role="columnheader">{t('recordings.colStarted')}</div>
              <div role="columnheader">{t('recordings.colDuration')}</div>
              <div role="columnheader">{t('recordings.colSteps')}</div>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: 32 }}>
                <EmptyState
                  icon={<TlnIcon name="film" size={24} />}
                  title={t('recordings.emptyTitle')}
                  description={t('recordings.emptyDesc')}
                />
              </div>
            ) : items.map(r => (
              <RecordingRow
                key={r.id}
                id={r.id}
                title={r.title}
                sandboxId={r.sandbox_id}
                agent={r.agent}
                startedAt={r.started_at}
                durationSec={r.duration_sec}
                steps={r.steps}
                sizeKb={r.size_kb}
                frames={r.frames}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
