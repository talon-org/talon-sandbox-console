/* PageSandboxDetail — 6-tab detail view for a single sandbox.
 * 1:1 port of page-sandbox-detail.jsx prototype.
 * Tabs: Overview · Processes · Ports · Files · Network · Audit
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Tabs, Dialog, KV, Badge, ResRow, toast } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_SANDBOXES, MOCK_AUDIT, relTime } from '../mock/data';
// TODO: replace mock with apiGet('/v1/sandboxes/{id}')

import './PageSandboxDetail.css';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtAge(sec: number): string {
  if (sec < 60)   return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}

// ── page ──────────────────────────────────────────────────────────────────────
export function PageSandboxDetail() {
  const { id } = useParams<{ id: string }>();
  const t      = useT();
  const nav    = useNavigate();

  const s = MOCK_SANDBOXES.find(sb => sb.id === id) ?? MOCK_SANDBOXES[0];
  // TODO: replace with apiGet(`/v1/sandboxes/${id}`)

  const [tab,         setTab]         = useState('overview');
  const [confirmKill, setConfirmKill] = useState(false);

  const auditForThis = MOCK_AUDIT.filter(e => e.target === s.id || e.actor === s.id);

  const tabItems = [
    { value: 'overview',  label: t('detail.tab.overview') },
    { value: 'processes', label: <>{t('detail.tab.processes')}{s.processes ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>{s.processes.length}</span> : null}</> },
    { value: 'ports',     label: <>{t('detail.tab.ports')}{s.ports ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>{s.ports.length}</span> : null}</> },
    { value: 'files',     label: t('detail.tab.files') },
    { value: 'network',   label: t('detail.tab.network') },
    { value: 'audit',     label: <>{t('detail.tab.audit')}<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>{auditForThis.length}</span></> },
  ];

  const stateVariant = (
    s.state === 'running' ? 'success' :
    ['pulling-image', 'provisioning', 'terminating', 'paused', 'idle'].includes(s.state) ? 'warning' :
    s.state === 'failed' ? 'danger' : 'neutral'
  ) as 'success' | 'warning' | 'danger' | 'neutral';

  return (
    <>
      {/* header */}
      <div className="sbx-detail-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="id-row">
            <span className="sbxid">{s.id}</span>
            <Badge variant={stateVariant} dot={s.state === 'running'}>{s.state}</Badge>
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-mono)',
              padding: '2px 8px', borderRadius: 4,
              border: '1px solid var(--line)', color: 'var(--fg-2)',
              background: 'var(--bg-2)',
            }}>{s.tenant}</span>
          </div>
          <div className="name-row">
            <TlnIcon name="box" size={14} style={{ color: 'var(--fg-3)' }} />
            <span>{s.name}</span>
            <span style={{ color: 'var(--fg-4, var(--fg-3))' }}>·</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>{s.image}</span>
          </div>
        </div>
        <div className="det-actions">
          <Button variant="ghost" onClick={() => nav('/sandboxes/' + s.id + '/terminal')}>
            <TlnIcon name="terminal" size={14} />
            {t('detail.openShell')}
          </Button>
          <Button variant="ghost" iconOnly aria-label="Recordings">
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

      {/* meta row */}
      <div className="sbx-info-row">
        <div className="item"><span className="k">worker</span><span className="v">{s.worker ?? '—'}</span></div>
        <div className="item"><span className="k">region</span><span className="v">{s.region ?? '—'}</span></div>
        <div className="item"><span className="k">started</span><span className="v">{s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 19).replace('T', ' ') + ' UTC' : '—'}</span></div>
        <div className="item"><span className="k">age</span><span className="v">{fmtAge(s.ageSec)}</span></div>
        <div className="item"><span className="k">resources</span><span className="v">{s.cpuLimit ? `${s.cpuLimit} vCPU · ${(s.memLimit ?? 0) / 1024} GiB` : '—'}</span></div>
        <div className="item"><span className="k">disk</span><span className="v">{s.disk != null ? `${s.disk} / ${s.diskLimit} GiB` : '—'}</span></div>
      </div>

      {/* tabs */}
      <div className="sbx-tabs-wrap">
        <Tabs value={tab} onChange={setTab} items={tabItems} />
      </div>

      <div className="sbx-tab-body">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {s.task && (
              <Card
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TlnIcon name="zap" size={14} style={{ color: 'var(--acc-strong)' }} />
                    {t('detail.task')}
                  </span>
                }
                footer={
                  <Button variant="ghost" size="sm" onClick={() => nav('/sandboxes/' + s.id + '/terminal')}>
                    {t('detail.openShell')}
                    <TlnIcon name="arrowRight" size={12} />
                  </Button>
                }
              >
                <div className="task-card">
                  <div className="task-text">{s.task}</div>
                  <div className="task-meta">
                    <span className="agent"><TlnIcon name="agent" size={12} />Claude Sonnet 4.5</span>
                    <span>{fmtAge(s.ageSec)} ago</span>
                    <span>14 commands run</span>
                  </div>
                </div>
              </Card>
            )}

            <div className="sbx-2col">
              <Card
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TlnIcon name="cpu" size={14} style={{ color: 'var(--fg-2)' }} />
                    {t('detail.resources')}
                  </span>
                }
                footer={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>{t('detail.realtime')}</span>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ResRow label="vCPU"   used={s.cpu ?? 0}                max={s.cpuLimit ?? 2}              unit="vCPU" />
                  <ResRow label="Memory" used={(s.mem ?? 0) / 1024}       max={(s.memLimit ?? 4096) / 1024}  unit="GiB" />
                  <ResRow label="Disk"   used={s.disk ?? 0}               max={s.diskLimit ?? 12}            unit="GiB"  color="ok" />
                  <ResRow label="Egress" used={(s.egressKBs ?? 0) / 1024} max={5}                            unit="MB/s" color="acc" />
                </div>
              </Card>

              <Card
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TlnIcon name="network" size={14} style={{ color: 'var(--info)' }} />
                    {t('detail.tab.ports')}
                  </span>
                }
                footer={
                  <Button variant="ghost" size="sm" iconOnly aria-label={t('detail.exposePort')}>
                    <TlnIcon name="plus" size={12} />
                  </Button>
                }
              >
                {!s.ports || s.ports.length === 0 ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>{t('detail.noPorts')}</span>
                ) : (
                  <div className="port-list">
                    {s.ports.map(p => (
                      <div key={p.port} className="port-item">
                        <span className="pport">:{p.port}</span>
                        <span className="pproto">{p.proto}</span>
                        <span className="plabel">
                          {p.label}
                          {p.url && <span className="purl">{p.url}</span>}
                        </span>
                        <span className={'pexposed' + (p.exposed ? '' : ' off')}>
                          <span className="pd" />
                          {p.exposed ? 'public' : 'internal'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TlnIcon name="key" size={14} style={{ color: 'var(--magenta, #c678dd)' }} />
                  {t('detail.mountedSecrets')}
                </span>
              }
              footer={
                <Button variant="ghost" size="sm" onClick={() => nav('/secrets')}>
                  {t('detail.manage')}
                  <TlnIcon name="arrowRight" size={12} />
                </Button>
              }
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(s.secrets ?? []).map(name => (
                  <span key={name} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px', borderRadius: 4,
                    background: 'var(--magenta-soft, rgba(198,120,221,0.1))',
                    color: 'var(--magenta, #c678dd)',
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                  }}>
                    <TlnIcon name="key" size={11} />
                    {name}
                  </span>
                ))}
                {(!s.secrets || s.secrets.length === 0) && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>{t('detail.noSecrets')}</span>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── Processes ── */}
        {tab === 'processes' && (
          <Card>
            <div className="tln-tbl" style={{ border: 0, borderRadius: 0, margin: '-16px' }}>
              <div className="tln-tbl-head proc-tbl">
                <div>PID</div><div>Process</div><div>Command</div><div>CPU</div><div>Memory</div>
              </div>
              {(s.processes ?? [
                { pid: 4128, name: 'node', cmd: 'node /workspace/index.js', cpu: '12%', mem: '512 MiB', user: 'node' },
                { pid: 4001, name: 'init', cmd: '/sbin/talon-init', cpu: '0%', mem: '2 MiB', user: 'root' },
              ]).map(p => (
                <div key={p.pid} className="tln-tbl-row proc-tbl" style={{ cursor: 'default' }}>
                  <div className="mono" style={{ color: 'var(--fg-0)' }}>{p.pid}</div>
                  <div className="mono" style={{ color: 'var(--fg-1)' }}>{p.name}</div>
                  <div className="proc-cmd">{p.cmd}</div>
                  <div className="mono">{p.cpu}</div>
                  <div className="mono">{p.mem}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Ports ── */}
        {tab === 'ports' && (
          <Card
            title={t('detail.tab.ports')}
            footer={
              <Button variant="primary" size="sm">
                <TlnIcon name="plus" size={12} />
                {t('detail.exposePort')}
              </Button>
            }
          >
            <div className="port-list">
              {(s.ports ?? []).map(p => (
                <div key={p.port} className="port-item">
                  <span className="pport">:{p.port}</span>
                  <span className="pproto">{p.proto}</span>
                  <span className="plabel">
                    {p.label}
                    {p.url && <span className="purl">{p.url}</span>}
                  </span>
                  <span className={'pexposed' + (p.exposed ? '' : ' off')}>
                    <span className="pd" />
                    {p.exposed ? 'public' : 'internal'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Files ── */}
        {tab === 'files' && (
          <div className="sbx-2col">
            <Card title="/workspace">
              <div className="file-tree">
                {[
                  { name: 'workspace/', kind: 'dir',  depth: 0 },
                  { name: 'app/',       kind: 'dir',  depth: 1 },
                  { name: 'index.tsx',  kind: 'file', depth: 2 },
                  { name: 'globals.css',kind: 'file', depth: 2 },
                  { name: 'package.json',kind:'file', depth: 1, active: true },
                  { name: 'next.config.js',kind:'file',depth:1 },
                  { name: 'node_modules/',kind:'dir', depth: 1 },
                  { name: 'public/',    kind: 'dir',  depth: 1 },
                  { name: '.env.local', kind: 'file', depth: 1 },
                ].map((f, i) => (
                  <div key={i} className={'frow ' + f.kind + (f.active ? ' active' : '')} style={{ paddingLeft: 8 + f.depth * 14 }}>
                    <TlnIcon name={f.kind === 'dir' ? 'folder' : 'fileText'} size={12} className="fic" />
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card
              title="/workspace/package.json"
              footer={<Button variant="ghost" size="sm"><TlnIcon name="copy" size={12} />{t('common.copy')}</Button>}
            >
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, color: 'var(--fg-1)', margin: 0, whiteSpace: 'pre-wrap' }}>{`{
  "name": "next-dev",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "19.0.0",
    "vite": "5.4.2"
  }
}`}</pre>
            </Card>
          </div>
        )}

        {/* ── Network ── */}
        {tab === 'network' && (
          <div className="sbx-2col">
            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TlnIcon name="shield" size={14} style={{ color: 'var(--info)' }} />
                  {t('detail.networkPolicy')}
                </span>
              }
            >
              <KV items={[
                { label: 'Policy',        value: s.network?.policy ?? 'allow-all' },
                { label: 'Allowed hosts', value: String(s.network?.allowed?.length ?? 0) },
                { label: 'Blocked · 24h', value: String(s.network?.blocked ?? 0) },
              ]} />
              <div style={{ margin: '16px 0', borderTop: '1px solid var(--line-soft)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 8 }}>
                Allowed hosts
              </div>
              <div className="hostlist">
                {(s.network?.allowed ?? ['api.acme.dev', 'registry.npmjs.org', '*.github.com']).map(h => (
                  <div key={h} className="hitem">
                    <TlnIcon name="check" size={12} style={{ color: 'var(--ok)', flex: '0 0 auto' }} />
                    {h}
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TlnIcon name="alert" size={14} style={{ color: 'var(--warn)' }} />
                  {t('detail.recentBlocked')}
                </span>
              }
            >
              <div className="hostlist">
                {['evil-cdn.io', 'data-exfil.example', 'tracker.bad.com', 'unknown-registry.dev'].map(h => (
                  <div key={h} className="hitem blocked">
                    <TlnIcon name="x" size={12} style={{ color: 'var(--err)', flex: '0 0 auto' }} />
                    {h}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── Audit ── */}
        {tab === 'audit' && (
          <Card>
            <div className="tln-tbl" style={{ border: 0, borderRadius: 0, margin: '-16px' }}>
              <div className="tln-tbl-head det-audit-row">
                <div>Time</div><div>Event</div><div>Actor</div><div>Target / Meta</div><div>Result</div>
              </div>
              {(auditForThis.length ? auditForThis : MOCK_AUDIT.slice(0, 6)).map(e => {
                const secAgo = Math.round((Date.now() - new Date(e.at).getTime()) / 1000);
                return (
                  <div key={e.id} className="tln-tbl-row det-audit-row" style={{ cursor: 'default' }}>
                    <span className="when">{relTime(secAgo)}</span>
                    <span className="etype">{e.type}</span>
                    <span className="actor">{e.actor}</span>
                    <span className="dtarget">{e.target}{e.meta ? ' · ' + e.meta : ''}</span>
                    <span className="dresult">
                      <Badge variant={e.result === 'ok' ? 'success' : 'danger'}>{e.result}</Badge>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* kill dialog */}
      <Dialog
        open={confirmKill}
        onClose={() => setConfirmKill(false)}
        title={
          <>
            {t('sbx.kill.title')}&nbsp;
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--err)' }}>{s.id}</span>
          </>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmKill(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => {
              setConfirmKill(false);
              toast.error(s.id + ' terminated');
              nav('/sandboxes');
            }}>
              <TlnIcon name="stop" size={14} />
              {t('sbx.kill.confirm')}
            </Button>
          </>
        }
      >
        {t('sbx.kill.body')}
      </Dialog>
    </>
  );
}
