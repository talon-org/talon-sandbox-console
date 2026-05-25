/* src/pages/_workers/RegionGroup.tsx
 * Worker table for a single region.
 */
import { Fragment } from 'react';
import { Button } from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { WorkerLoadBars } from './WorkerLoadBars';
import { WorkerStatusBadge } from './WorkerStatusBadge';
import type { WorkerDTO } from '../../api/types';

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

interface Props {
  region: string;
  workers: WorkerDTO[];
}

export function RegionGroup({ region, workers }: Props) {
  const t = useT();
  const regionSbx = workers.reduce((a, w) => a + (w.sandboxes ?? w.sandbox_count ?? 0), 0);
  const avgLoad   = workers.length
    ? Math.round(workers.reduce((a, w) => a + (w.cpu_pct ?? 0), 0) / workers.length)
    : 0;

  return (
    <div className="region-group">
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
                  <span className="wused">{wSbx}</span>{' '}
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
}
