/* PageWorkers — admin: worker nodes grouped by region.
 * Data: useWorkers() from src/hooks/useWorkers.ts
 * Non-admin gets error EmptyState from hook 403 — no ACL logic here.
 */
import { Fragment } from 'react';
import { PageHeader, Button, ProgressBar } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useWorkers } from '../hooks/useWorkers';
import { EmptyState } from '../components';
import { WorkerLoadBars } from './_workers/WorkerLoadBars';
import { WorkerStatusBadge } from './_workers/WorkerStatusBadge';
import type { WorkerDTO } from '../api/types';

import './PageWorkers.css';

function fmtUptime(sec: number): string {
  if (sec > 86400) return Math.floor(sec / 86400) + 'd ' + Math.floor((sec % 86400) / 3600) + 'h';
  if (sec > 3600)  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
  return Math.floor(sec / 60) + 'm';
}

const STATUS_KEY: Record<WorkerDTO['status'], string> = {
  healthy:   'workers.healthy',
  draining:  'workers.draining',
  unhealthy: 'workers.unhealthy',
};

export function PageWorkers() {
  const t = useT();
  const { data, isLoading, isError } = useWorkers();

  const ws = data?.workers ?? [];

  const byRegion: Record<string, WorkerDTO[]> = {};
  for (const w of ws) { (byRegion[w.region ?? 'unknown'] ??= []).push(w); }

  const stats = {
    total:    ws.length,
    healthy:  ws.filter(w => w.status === 'healthy').length,
    draining: ws.filter(w => w.status === 'draining').length,
    unhealthy:ws.filter(w => w.status === 'unhealthy').length,
    sandboxes:ws.reduce((a, w) => a + (w.sandboxes ?? w.sandbox_count ?? 0), 0),
    capacity: ws.reduce((a, w) => a + (w.capacity ?? w.max_sandboxes ?? 0), 0),
  };

  const numStr = `${stats.total} ${t('workers.nodesOf')} · ${Object.keys(byRegion).length} ${t('workers.regionsOf')}`;

  return (
    <>
      <PageHeader
        eyebrow={t('workers.eyebrow')}
        title={t('workers.title')}
        num={numStr}
        desc={t('workers.desc')}
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="refresh" size={14} />
              {t('workers.sync')}
            </Button>
            <Button variant="primary" disabled>
              <TlnIcon name="plus" size={14} />
              {t('workers.join')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}

        {isError && (
          <EmptyState
            variant="error"
            title={t('workers.forbiddenTitle')}
            message={t('workers.forbidden')}
          />
        )}

        {!isLoading && !isError && (
          <>
            <div className="wkr-summary">
              <div className="wkr-sum-card ok">
                <div className="wlabel">
                  <TlnIcon name="dot" size={10} className="wic" />
                  {t('workers.healthy')}
                </div>
                <div className="wn">
                  {stats.healthy}
                  <span className="small">/ {stats.total} {t('workers.nodesOf')}</span>
                </div>
              </div>
              <div className="wkr-sum-card warn">
                <div className="wlabel">
                  <TlnIcon name="alert" size={11} className="wic" />
                  {t('workers.draining')}
                </div>
                <div className="wn">
                  {stats.draining}
                  <span className="small">{t('workers.gracefulExit')}</span>
                </div>
              </div>
              <div className="wkr-sum-card err">
                <div className="wlabel">
                  <TlnIcon name="alert" size={11} className="wic" />
                  {t('workers.unhealthy')}
                </div>
                <div className="wn">
                  {stats.unhealthy}
                  <span className="small">{t('workers.needsAttention')}</span>
                </div>
              </div>
              <div className="wkr-sum-card">
                <div className="wlabel">
                  <TlnIcon name="box" size={11} className="wic" />
                  {t('workers.capacity')}
                </div>
                <div className="wn">
                  {stats.sandboxes}
                  <span className="small">/ {stats.capacity}</span>
                </div>
                <ProgressBar value={stats.sandboxes} max={stats.capacity} />
              </div>
            </div>

            {Object.entries(byRegion).map(([region, workers]) => {
              const regionSbx = workers.reduce((a, w) => a + (w.sandboxes ?? w.sandbox_count ?? 0), 0);
              const avgLoad   = workers.length
                ? Math.round(workers.reduce((a, w) => a + (w.cpu_pct ?? 0), 0) / workers.length)
                : 0;

              return (
                <div key={region} className="region-group">
                  <div className="region-head">
                    <TlnIcon name="globe" size={13} style={{ color: 'var(--info)' }} />
                    <span className="rname">{region}</span>
                    <span className="rcount">{workers.length} {t('workers.nodesOf')}</span>
                    <span className="rmeta">
                      {regionSbx} {t('workers.sandboxes')} · {t('workers.avgLoad')} {avgLoad}%
                    </span>
                  </div>
                  <div className="tln-tbl">
                    <div className="tln-tbl-head wkr-row">
                      <div>{t('workers.colWorker')}</div>
                      <div>{t('workers.colStatus')}</div>
                      <div>{t('workers.colLoad')}</div>
                      <div>{t('workers.colSandboxes')}</div>
                      <div>{t('workers.colUptime')}</div>
                      <div />
                    </div>
                    {workers.map(w => {
                      const dotColor  = w.status === 'healthy' ? 'var(--ok)' : w.status === 'draining' ? 'var(--warn)' : 'var(--err)';
                      const dotShadow = w.status === 'healthy' ? '0 0 0 3px var(--ok-soft)' : 'none';
                      const wSbx = w.sandboxes ?? w.sandbox_count ?? 0;
                      const wCap = w.capacity ?? w.max_sandboxes ?? 0;
                      return (
                        <Fragment key={w.id}>
                          <div className="tln-tbl-row wkr-row" style={{ cursor: 'default' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: dotColor, boxShadow: dotShadow }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="wid">{w.id}</span>
                                <span className="wuptime">{w.region}</span>
                              </div>
                            </div>
                            <div>
                              <WorkerStatusBadge status={w.status} label={t(STATUS_KEY[w.status])} />
                            </div>
                            <WorkerLoadBars cpu={w.cpu_pct ?? 0} mem={w.mem_pct ?? 0} disk={w.disk_pct ?? 0} />
                            <div className="wpop">
                              <span className="wused">{wSbx}</span>
                              {' '}
                              <span className="wof">/ {wCap}</span>
                            </div>
                            <div className="wuptime">{fmtUptime(w.uptime_sec ?? 0)}</div>
                            <div className="actions">
                              <Button variant="ghost" size="sm" iconOnly aria-label={t('common.filter')}>
                                <TlnIcon name="more" size={14} />
                              </Button>
                            </div>
                          </div>
                          {w.last_error && (
                            <div className="wkr-error-strip">
                              <TlnIcon name="alert" size={12} />
                              <span>{w.last_error}</span>
                              <Button variant="ghost" size="sm" style={{ marginLeft: 'auto', color: 'var(--err)' }}>
                                {t('workers.drain')}
                              </Button>
                            </div>
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {ws.length === 0 && <EmptyState variant="empty" title={t('common.empty')} />}
          </>
        )}
      </div>
    </>
  );
}
