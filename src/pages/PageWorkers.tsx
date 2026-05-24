/* PageWorkers — admin: worker nodes grouped by region.
 * 1:1 port of page-workers.jsx prototype.
 */
import { Fragment } from 'react';
import { PageHeader, Button, ProgressBar } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_WORKERS } from '../mock/data';
// TODO: replace mock with apiGet('/v1/admin/workers')

// ── inject styles once ────────────────────────────────────────────────────────
if (!document.getElementById('tln-page-workers-styles')) {
  const s = document.createElement('style');
  s.id = 'tln-page-workers-styles';
  s.textContent = `
.wkr-summary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px;
}
.wkr-sum-card {
  border: 1px solid var(--line); border-radius: var(--r-3); background: var(--bg-2);
  padding: 16px 18px; display: flex; flex-direction: column; gap: 8px;
}
.wkr-sum-card .wlabel { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; }
.wkr-sum-card .wn     { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; color: var(--fg-0); font-variant-numeric: tabular-nums; display: flex; align-items: baseline; gap: 6px; }
.wkr-sum-card .wn .small { font-size: 13px; color: var(--fg-3); font-family: var(--font-mono); font-weight: 400; }
.wkr-sum-card.ok   .wlabel .wic { color: var(--ok); }
.wkr-sum-card.warn .wlabel .wic { color: var(--warn); }
.wkr-sum-card.err  .wlabel .wic { color: var(--err); }

.region-group { margin-bottom: 22px; }
.region-head { display: flex; align-items: center; padding: 8px 4px; gap: 10px; }
.region-head .rname { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fg-2); font-weight: 500; }
.region-head .rcount { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-3); }
.region-head .rmeta { margin-left: auto; font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); }

.wkr-row { grid-template-columns: 1fr 0.8fr 1.4fr 0.7fr 0.7fr 50px; }
.wkr-row .wid { font-family: var(--font-mono); font-size: 12px; color: var(--fg-0); }
.wkr-row .wuptime { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); }
.wkr-row .loads { display: grid; grid-template-columns: 30px 1fr 36px; gap: 8px; align-items: center; }
.wkr-row .loads .llbl { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.08em; }
.wkr-row .loads .lval { font-family: var(--font-mono); font-size: 10.5px; text-align: right; color: var(--fg-2); }
.wkr-row .loads .lval.hot { color: var(--err); font-weight: 500; }
.wkr-row .loads .lval.warm { color: var(--warn); }
.wkr-row .wpop { font-family: var(--font-mono); font-size: 11.5px; }
.wkr-row .wpop .wused { color: var(--fg-0); }
.wkr-row .wpop .wof   { color: var(--fg-3); }
.wkr-error-strip {
  grid-column: 1 / -1; padding: 8px 16px;
  background: var(--err-soft); border-top: 1px solid var(--line);
  color: var(--err); font-family: var(--font-mono); font-size: 11px;
  display: flex; align-items: center; gap: 8px;
}
`;
  document.head.appendChild(s);
}

function fmtUptime(sec: number): string {
  if (sec > 86400) return Math.floor(sec / 86400) + 'd ' + Math.floor((sec % 86400) / 3600) + 'h';
  if (sec > 3600)  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
  return Math.floor(sec / 60) + 'm';
}

function loadCls(n: number): string { return n >= 90 ? 'hot' : n >= 70 ? 'warm' : ''; }

export function PageWorkers() {
  const t = useT();
  const ws = MOCK_WORKERS;
  // TODO: replace with apiGet('/v1/admin/workers')

  // group by region
  const byRegion: Record<string, typeof ws> = {};
  for (const w of ws) { (byRegion[w.region] ??= []).push(w); }

  const stats = {
    total:    ws.length,
    healthy:  ws.filter(w => w.state === 'healthy').length,
    draining: ws.filter(w => w.state === 'draining').length,
    unhealthy:ws.filter(w => w.state === 'unhealthy').length,
    sandboxes:ws.reduce((a, w) => a + w.sandboxes, 0),
    capacity: ws.reduce((a, w) => a + w.capacity, 0),
  };

  return (
    <>
      <PageHeader
        eyebrow={t('sidebar.admin')}
        title={t('nav.workers')}
        num={`${stats.total} nodes · ${Object.keys(byRegion).length} regions`}
        desc="Worker nodes run the actual sandbox micro-VMs. Drain a node before maintenance — the scheduler will stop dispatching new tasks."
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="refresh" size={14} />
              Sync
            </Button>
            <Button variant="primary">
              <TlnIcon name="plus" size={14} />
              Join node
            </Button>
          </>
        }
      />

      <div className="page-body">
        {/* summary */}
        <div className="wkr-summary">
          <div className="wkr-sum-card ok">
            <div className="wlabel"><TlnIcon name="dot" size={10} className="wic" />Healthy</div>
            <div className="wn">{stats.healthy} <span className="small">/ {stats.total} nodes</span></div>
          </div>
          <div className="wkr-sum-card warn">
            <div className="wlabel"><TlnIcon name="alert" size={11} className="wic" />Draining</div>
            <div className="wn">{stats.draining} <span className="small">graceful exit</span></div>
          </div>
          <div className="wkr-sum-card err">
            <div className="wlabel"><TlnIcon name="alert" size={11} className="wic" />Unhealthy</div>
            <div className="wn">{stats.unhealthy} <span className="small">needs attention</span></div>
          </div>
          <div className="wkr-sum-card">
            <div className="wlabel"><TlnIcon name="box" size={11} className="wic" />Sandboxes / capacity</div>
            <div className="wn">{stats.sandboxes} <span className="small">/ {stats.capacity}</span></div>
            <ProgressBar value={stats.sandboxes} max={stats.capacity} />
          </div>
        </div>

        {/* per-region tables */}
        {Object.entries(byRegion).map(([region, workers]) => (
          <div key={region} className="region-group">
            <div className="region-head">
              <TlnIcon name="globe" size={13} style={{ color: 'var(--info)' }} />
              <span className="rname">{region}</span>
              <span className="rcount">{workers.length} nodes</span>
              <span className="rmeta">
                {workers.reduce((a, w) => a + w.sandboxes, 0)} sandboxes ·
                avg load {Math.round(workers.reduce((a, w) => a + w.cpu, 0) / workers.length)}%
              </span>
            </div>
            <div className="tln-tbl">
              <div className="tln-tbl-head wkr-row">
                <div>Worker</div>
                <div>State</div>
                <div>Load · CPU · Mem · Disk</div>
                <div>Sandboxes</div>
                <div>Uptime</div>
                <div />
              </div>
              {workers.map(w => {
                const dotColor = w.state === 'healthy' ? 'var(--ok)' : w.state === 'draining' ? 'var(--warn)' : 'var(--err)';
                const dotShadow = w.state === 'healthy' ? '0 0 0 3px var(--ok-soft)' : 'none';
                const stateVariant = (w.state === 'healthy' ? 'success' : w.state === 'draining' ? 'warning' : 'danger') as 'success' | 'warning' | 'danger';
                return (
                  <Fragment key={w.id}>
                    <div className="tln-tbl-row wkr-row" style={{ cursor: 'default' }}>
                      {/* id */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: dotColor, boxShadow: dotShadow, animation: 'tln-pulse 1.6s ease-in-out infinite' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="wid">{w.id}</span>
                          <span className="wuptime">{w.region}</span>
                        </div>
                      </div>
                      {/* state */}
                      <div>
                        {/* inline Badge-like without importing to keep sizes */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          fontSize: 10.5, fontFamily: 'var(--font-mono)',
                          padding: '2px 7px', borderRadius: 4,
                          background: stateVariant === 'success' ? 'var(--ok-soft)' : stateVariant === 'warning' ? 'var(--warn-soft)' : 'var(--err-soft)',
                          color:      stateVariant === 'success' ? 'var(--ok)'      : stateVariant === 'warning' ? 'var(--warn)'      : 'var(--err)',
                        }}>{w.state}</span>
                      </div>
                      {/* loads */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                          { lbl: 'CPU', val: w.cpu,  color: w.cpu  >= 90 ? 'var(--err)' : w.cpu  >= 70 ? 'var(--warn)' : 'var(--ok)' },
                          { lbl: 'MEM', val: w.mem,  color: w.mem  >= 90 ? 'var(--err)' : w.mem  >= 70 ? 'var(--warn)' : 'var(--info)' },
                          { lbl: 'DSK', val: w.disk, color: w.disk >= 90 ? 'var(--err)' : 'var(--info)' },
                        ].map(({ lbl, val, color }) => (
                          <div key={lbl} className="loads">
                            <span className="llbl">{lbl}</span>
                            <ProgressBar value={val} max={100} style={{ '--tln-progress-color': color } as React.CSSProperties} />
                            <span className={'lval ' + loadCls(val)}>{val}%</span>
                          </div>
                        ))}
                      </div>
                      {/* sandboxes */}
                      <div className="wpop">
                        <span className="wused">{w.sandboxes}</span> <span className="wof">/ {w.capacity}</span>
                      </div>
                      {/* uptime */}
                      <div className="wuptime">{fmtUptime(w.uptimeSec)}</div>
                      {/* actions */}
                      <div className="actions">
                        <Button variant="ghost" size="sm" iconOnly aria-label="More">
                          <TlnIcon name="more" size={14} />
                        </Button>
                      </div>
                    </div>
                    {w.lastError && (
                      <div className="wkr-error-strip">
                        <TlnIcon name="alert" size={12} />
                        <span>{w.lastError}</span>
                        <Button variant="ghost" size="sm" style={{ marginLeft: 'auto', color: 'var(--err)' }}>
                          Drain · Restart
                        </Button>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
