/* PageRecordings — workspace: recording session list.
 * Data from useRecordings() hook; no mock data.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, PageHeader } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { relTime } from '../lib/relTime';
import { useRecordings } from '../hooks';
import { useApp } from '../store';
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
      <div className="actions" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" iconOnly aria-label="More">
          <TlnIcon name="more" size={14} />
        </Button>
      </div>
    </div>
  );
}

export function PageRecordings() {
  const t = useT();
  const me = useApp(s => s.me);
  const isAdmin = me?.tenant_id === '__admin';

  const [agentFilter, setAgentFilter] = useState('all');

  const queryOpts: RecordingQueryParams = useMemo(() => {
    const p: RecordingQueryParams = { limit: 50 };
    if (agentFilter !== 'all') p.agent = agentFilter;
    if (!isAdmin && me?.tenant_id) p.tenant_id = me.tenant_id;
    return p;
  }, [agentFilter, isAdmin, me?.tenant_id]);

  const { data, isLoading, isError } = useRecordings(queryOpts);
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        title={t('recordings.title')}
        num={t('recordings.count').replace('{n}', String(items.length))}
        desc={t('recordings.desc')}
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="filter" size={14} />
              {t('common.filter')}
            </Button>
            <Button variant="ghost">
              <TlnIcon name="download" size={14} />
              {t('common.export')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        {isAdmin && (
          <div className="sbx-filters" style={{ marginBottom: 14 }}>
            <div className="group">
              <button className={'filter-btn' + (agentFilter === 'all' ? ' active' : '')} onClick={() => setAgentFilter('all')}>
                {t('recordings.filterAll')}
              </button>
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
              <div role="columnheader" />
            </div>

            {items.length === 0 ? (
              <div style={{ padding: 32 }}>
                <EmptyState
                  icon={<TlnIcon name="video" size={24} />}
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
