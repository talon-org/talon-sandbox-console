/* PageWorkers — admin: worker nodes grouped by region.
 * Data: useWorkers() from src/hooks/useWorkers.ts
 * Non-admin gets error EmptyState from hook 403 — no ACL logic here.
 */
import { PageHeader, Button, ProgressBar } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useWorkers } from '../hooks/useWorkers';
import { EmptyState } from '../components';
import { RegionGroup } from './_workers/RegionGroup';
import type { WorkerDTO } from '../api/types';

import './PageWorkers.css';

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

            {Object.entries(byRegion).map(([region, workers]) => (
              <RegionGroup key={region} region={region} workers={workers} />
            ))}

            {ws.length === 0 && <EmptyState variant="empty" title={t('common.empty')} />}
          </>
        )}
      </div>
    </>
  );
}
