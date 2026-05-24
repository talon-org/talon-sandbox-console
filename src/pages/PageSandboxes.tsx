/* PageSandboxes — list view + create drawer.
 * 1:1 port of page-sandboxes.jsx prototype.
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PageHeader, Button, Input, Select, Textarea,
  Drawer, EmptyState, Badge, ProgressBar, toast,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_SANDBOXES, MOCK_SECRETS, MOCK_TENANTS } from '../mock/data';
import type { SandboxState } from '../mock/data';
// TODO: replace mock with apiGet('/v1/sandboxes'), apiPost('/v1/sandboxes')

// ── inject styles once ────────────────────────────────────────────────────────
if (!document.getElementById('tln-page-sandboxes-styles')) {
  const s = document.createElement('style');
  s.id = 'tln-page-sandboxes-styles';
  s.textContent = `
.sbx-filters {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; margin-bottom: 14px;
}
.sbx-filters .group {
  display: flex; gap: 4px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  padding: 2px;
  background: var(--bg-2);
}
.sbx-filter {
  border: 0; background: transparent;
  font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--fg-2); padding: 0 9px; height: 22px;
  border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.sbx-filter:hover { color: var(--fg-1); background: var(--bg-hover); }
.sbx-filter[aria-pressed='true'] { color: var(--fg-0); background: var(--bg-3); box-shadow: 0 0 0 1px var(--line-strong) inset; }
.sbx-filter .num { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
.sbx-filter[aria-pressed='true'] .num { color: var(--acc-strong); }

.tln-tbl { width: 100%; border: 1px solid var(--line); border-radius: var(--r-3); overflow: hidden; }
.tln-tbl-head, .tln-tbl-row {
  display: grid; align-items: center; gap: 0;
  padding: 0 16px; min-height: 40px;
}
.tln-tbl-head { background: var(--bg-2); font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3); height: 36px; min-height: 36px; }
.tln-tbl-row { background: var(--bg-1); border-top: 1px solid var(--line-soft); cursor: pointer; transition: background 0.1s; }
.tln-tbl-row:hover { background: var(--bg-2); }
.tln-tbl-row .mono { font-family: var(--font-mono); font-size: 12px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tln-tbl-row .actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }

.sbx-row { grid-template-columns: 1.6fr 1.2fr 1fr 0.7fr 1.1fr 0.9fr 60px; }
.sbx-row .pull { display: flex; align-items: center; gap: 6px; }
.sbx-row .pull .pct { font-family: var(--font-mono); font-size: 10.5px; color: var(--warn); }
.sbx-row .img-row { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sbx-row .img-row .name { font-family: var(--font-mono); color: var(--fg-1); font-size: 12px; }
.sbx-row .img-row .meta { font-family: var(--font-mono); color: var(--fg-3); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sbx-row .res { font-family: var(--font-mono); font-size: 11.5px; color: var(--fg-2); }
.sbx-row .res .lim { color: var(--fg-3); }

.form-sect { display: flex; flex-direction: column; gap: 12px; padding: 18px 0; border-top: 1px solid var(--line-soft); }
.form-sect:first-of-type { border-top: 0; padding-top: 0; }
.form-sect-title { font-size: 13px; color: var(--fg-0); font-weight: 500; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.form-sect-title .ic { color: var(--fg-3); }
.form-sect-title .hint { margin-left: auto; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-grid.full { grid-template-columns: 1fr; }
.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-field .ff-label { font-size: 12px; font-weight: 500; color: var(--fg-1); }
.form-field .ff-hint { font-size: 11px; color: var(--fg-3); margin-top: 2px; }

.chip-multi {
  display: flex; flex-wrap: wrap; gap: 4px;
  padding: 6px; border: 1px solid var(--line); border-radius: var(--r-2);
  background: var(--bg-input, var(--bg-2)); min-height: 28px; align-items: center;
}
.chip-multi .chip {
  display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px;
  border-radius: var(--r-1); background: var(--magenta-soft); color: var(--magenta);
  font-family: var(--font-mono); font-size: 10.5px;
}
.chip-multi .chip .x { cursor: pointer; opacity: 0.6; }
.chip-multi .chip .x:hover { opacity: 1; }
.chip-multi .add { border: 0; background: transparent; color: var(--fg-3); font-family: var(--font-mono); font-size: 10.5px; cursor: pointer; padding: 2px 6px; }
.chip-multi .add:hover { color: var(--fg-1); }

.image-suggest { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
.image-suggest button { background: transparent; border: 1px solid var(--line); color: var(--fg-2); font-family: var(--font-mono); font-size: 10.5px; padding: 3px 8px; border-radius: var(--r-1); cursor: pointer; }
.image-suggest button:hover { color: var(--fg-0); border-color: var(--line-strong); }
.image-suggest button.on { background: var(--acc-soft); color: var(--acc-strong); border-color: var(--acc-line); }

.policy-radio { display: flex; gap: 8px; }
.policy-radio label { flex: 1; border: 1px solid var(--line); border-radius: var(--r-2); padding: 10px 12px; cursor: pointer; background: var(--bg-2); transition: border-color 0.1s, background 0.1s; }
.policy-radio label:hover { border-color: var(--line-strong); }
.policy-radio label[data-active='true'] { border-color: var(--acc); background: var(--acc-soft); }
.policy-radio label .title { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--fg-0); font-weight: 500; margin-bottom: 2px; }
.policy-radio label .desc { font-size: 11px; color: var(--fg-3); line-height: 1.4; }
.policy-radio input { display: none; }

.drawer-footer { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.drawer-footer .right { display: flex; gap: 8px; }
`;
  document.head.appendChild(s);
}

// ── helpers ───────────────────────────────────────────────────────────────────
const STATE_COLORS: Record<SandboxState, string> = {
  'running':       'var(--ok)',
  'pulling-image': 'var(--warn)',
  'provisioning':  'var(--warn)',
  'terminating':   'var(--warn)',
  'idle':          'var(--fg-3)',
  'paused':        'var(--fg-4, var(--fg-3))',
  'failed':        'var(--err)',
  'evicted':       'var(--fg-4, var(--fg-3))',
};

const STATE_PULSE: Set<SandboxState> = new Set(['running', 'pulling-image', 'provisioning', 'terminating']);

function stateVariant(state: SandboxState): 'success' | 'warning' | 'danger' | 'neutral' {
  if (state === 'running') return 'success';
  if (['pulling-image', 'provisioning', 'terminating', 'paused', 'idle'].includes(state)) return 'warning';
  if (state === 'failed') return 'danger';
  return 'neutral';
}

function fmtAge(sec: number): string {
  if (sec < 60)   return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}

// ── preset images ─────────────────────────────────────────────────────────────
const PRESET_IMAGES = [
  'node:20-bookworm', 'node:22-alpine',
  'python:3.12-slim', 'python:3.12',
  'ubuntu:24.04', 'debian:12-slim',
  'rust:1.78-slim', 'golang:1.23-alpine',
];

// ── CreateSandboxDrawer ───────────────────────────────────────────────────────
interface CreateSandboxDrawerProps {
  open: boolean;
  onClose: () => void;
}

function CreateSandboxDrawer({ open, onClose }: CreateSandboxDrawerProps) {
  const t = useT();
  const [name,    setName]    = useState('');
  const [image,   setImage]   = useState('node:20-bookworm');
  const [tenantId,setTenantId]= useState('acme');
  const [cpu,     setCpu]     = useState(2);
  const [mem,     setMem]     = useState(4);
  const [disk,    setDisk]    = useState(8);
  const [policy,  setPolicy]  = useState<'allow-all' | 'allowlist' | 'block-all'>('allowlist');
  const [allowed, setAllowed] = useState('api.acme.dev\nregistry.npmjs.org\n*.github.com');
  const [secrets, setSecrets] = useState<string[]>(['GITHUB_TOKEN']);
  const [env,     setEnv]     = useState('NODE_ENV=development\nLOG_LEVEL=debug');
  const [busy,    setBusy]    = useState(false);

  const create = async () => {
    setBusy(true);
    // TODO: apiPost('/v1/sandboxes', { name, image, tenant_id: tenantId, cpu, mem_gb: mem, disk_gb: disk, network: { policy, allowed_hosts: allowed.split('\n').filter(Boolean) }, secrets, env })
    await new Promise(r => setTimeout(r, 400));
    const id = 'sb_' + Math.random().toString(36).slice(2, 6);
    toast.success('Sandbox ' + id + ' creating…');
    setBusy(false);
    onClose();
  };

  const estCost = (cpu * mem * 0.012).toFixed(3).slice(1); // e.g. ".048"

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width={580}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TlnIcon name="box" size={16} style={{ color: 'var(--acc)' }} />
          {t('sbx.create.title')}
        </span>
      }
    >
      {/* basics */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="box" size={14} className="ic" />
          {t('sbx.create.basics')}
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="ff-label" htmlFor="csd-name">Name</label>
            <Input id="csd-name" value={name} onChange={e => setName(e.target.value)} placeholder="auto · sb_…" />
          </div>
          <div className="form-field">
            <label className="ff-label" htmlFor="csd-tenant">{t('sbx.colTenant')}</label>
            <Select id="csd-tenant" value={tenantId} onChange={e => setTenantId(e.target.value)}>
              {MOCK_TENANTS.map(tn => (
                <option key={tn.id} value={tn.id}>{tn.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="form-field">
          <label className="ff-label" htmlFor="csd-image">{t('sbx.colImage')}</label>
          <Input id="csd-image" mono value={image} onChange={e => setImage(e.target.value)}
            prefix={<TlnIcon name="image" size={14} style={{ color: 'var(--fg-3)' }} />}
          />
          <div className="image-suggest">
            {PRESET_IMAGES.map(p => (
              <button key={p} className={p === image ? 'on' : ''} onClick={() => setImage(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* resources */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="cpu" size={14} className="ic" />
          {t('sbx.create.resources')}
          <span className="hint">{cpu} vCPU · {mem} GiB · {disk} GiB</span>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="ff-label">vCPU <span style={{ fontFamily: 'var(--font-mono)', float: 'right' }}>{cpu}</span></label>
            <input type="range" min={1} max={16} step={1} value={cpu} onChange={e => setCpu(+e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="form-field">
            <label className="ff-label">Memory (GiB) <span style={{ fontFamily: 'var(--font-mono)', float: 'right' }}>{mem}</span></label>
            <input type="range" min={1} max={32} step={1} value={mem} onChange={e => setMem(+e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="form-field">
            <label className="ff-label">Disk (GiB) <span style={{ fontFamily: 'var(--font-mono)', float: 'right' }}>{disk}</span></label>
            <input type="range" min={4} max={64} step={4} value={disk} onChange={e => setDisk(+e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* network */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="network" size={14} className="ic" />
          {t('sbx.create.network')}
        </div>
        <div className="policy-radio">
          {([
            { v: 'allow-all', t: 'Allow all', d: 'Sandbox can reach any external host. Use only with trusted code.' },
            { v: 'allowlist', t: 'Allowlist',  d: 'Only listed hosts reachable. Recommended.' },
            { v: 'block-all', t: 'Block all',  d: 'No outbound network. Use for sealed evaluation.' },
          ] as const).map(p => (
            <label key={p.v} data-active={policy === p.v}>
              <input type="radio" checked={policy === p.v} onChange={() => setPolicy(p.v)} />
              <div className="title">{p.t}</div>
              <div className="desc">{p.d}</div>
            </label>
          ))}
        </div>
        {policy === 'allowlist' && (
          <div className="form-field">
            <label className="ff-label">Allowed hosts</label>
            <Textarea value={allowed} onChange={e => setAllowed(e.target.value)} rows={4} />
            <div className="ff-hint">One per line · wildcards supported (*.github.com)</div>
          </div>
        )}
      </div>

      {/* secrets */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="key" size={14} className="ic" />
          {t('sbx.create.secrets')}
          <span className="hint">injected as env vars</span>
        </div>
        <div className="chip-multi">
          {secrets.map(sec => (
            <span key={sec} className="chip">
              {sec}
              <TlnIcon name="x" size={10} className="x"
                onClick={() => setSecrets(secrets.filter(x => x !== sec))} />
            </span>
          ))}
          <button className="add" onClick={() => {
            const avail = MOCK_SECRETS.map(s => s.name).filter(n => !secrets.includes(n));
            if (avail.length) setSecrets([...secrets, avail[0]]);
          }}>
            + add secret
          </button>
        </div>
      </div>

      {/* env vars */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="fileText" size={14} className="ic" />
          {t('sbx.create.env')}
          <span className="hint">key=value · one per line</span>
        </div>
        <Textarea value={env} onChange={e => setEnv(e.target.value)} rows={3} />
      </div>

      {/* footer */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
        <div className="drawer-footer">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
            {t('sbx.create.estimate')} ·{' '}
            <span style={{ color: 'var(--fg-1)' }}>${estCost}/hr</span>
          </span>
          <div className="right">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={busy} disabled={busy} onClick={create}>
              <TlnIcon name="zap" size={14} />
              {t('sbx.create.launch')}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageSandboxes() {
  const t              = useT();
  const nav            = useNavigate();
  const [searchParams] = useSearchParams();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);

  // auto-open create drawer when ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') setDrawer(true);
  }, [searchParams]);

  const sandboxes = MOCK_SANDBOXES;
  // TODO: replace with apiGet('/v1/sandboxes') when ready

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sandboxes.length };
    for (const s of sandboxes) {
      c[s.state] = (c[s.state] ?? 0) + 1;
    }
    c['active'] = sandboxes.filter(s => ['running', 'pulling-image', 'provisioning'].includes(s.state)).length;
    return c;
  }, [sandboxes]);

  const filtered = useMemo(() => sandboxes.filter(s => {
    if (filter !== 'all') {
      if (filter === 'active') {
        if (!['running', 'pulling-image', 'provisioning'].includes(s.state)) return false;
      } else if (s.state !== filter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!(s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.image.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [sandboxes, filter, search]);

  const filterBtn = (val: string, label: string) => (
    <button key={val} className="sbx-filter" aria-pressed={filter === val} onClick={() => setFilter(val)}>
      <span>{label}</span>
      <span className="num">{counts[val] ?? 0}</span>
    </button>
  );

  return (
    <>
      <PageHeader
        eyebrow={t('sbx.eyebrow')}
        title={t('sbx.title')}
        num={`${counts['active'] ?? 0} / ${counts.all}`}
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="refresh" size={14} />
              {t('common.refresh')}
            </Button>
            <Button variant="primary" onClick={() => setDrawer(true)}>
              <TlnIcon name="plus" size={14} />
              {t('sbx.newSandbox')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        <div className="sbx-filters">
          <div className="group">
            {filterBtn('all',    t('sbx.filterAll'))}
            {filterBtn('active', t('sbx.filterActive'))}
          </div>
          <div className="group">
            {filterBtn('running',       t('sbx.filterRunning'))}
            {filterBtn('pulling-image', t('sbx.filterPulling'))}
            {filterBtn('idle',          t('sbx.filterIdle'))}
            {filterBtn('failed',        t('sbx.filterFailed'))}
          </div>
          <div style={{ flex: 1 }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('sbx.searchPlaceholder')}
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 280 }}
          />
          <Button variant="ghost" iconOnly title={t('common.filter')} aria-label={t('common.filter')}>
            <TlnIcon name="filter" size={14} />
          </Button>
        </div>

        <div className="tln-tbl">
          {/* header row */}
          <div className="tln-tbl-head sbx-row">
            <div>{t('sbx.colSandbox')}</div>
            <div>{t('sbx.colImage')}</div>
            <div>{t('sbx.colTenant')}</div>
            <div>{t('sbx.colAge')}</div>
            <div>{t('sbx.colResources')}</div>
            <div>{t('sbx.colStatus')}</div>
            <div />
          </div>

          {filtered.map((s) => {
            const color  = STATE_COLORS[s.state];
            const pulse  = STATE_PULSE.has(s.state);
            return (
              <div
                key={s.id}
                className="tln-tbl-row sbx-row"
                onClick={() => nav('/sandboxes/' + s.id)}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && nav('/sandboxes/' + s.id)}
              >
                {/* ID + task */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', flex: '0 0 auto',
                    background: color,
                    boxShadow: s.state === 'running' ? '0 0 0 3px var(--ok-soft)' : 'none',
                    animation: pulse ? 'tln-pulse 1.6s ease-in-out infinite' : 'none',
                  }} />
                  <div className="img-row">
                    <span className="name">{s.id}</span>
                    <span className="meta">{s.name}{s.task ? ' · ' + s.task : ''}</span>
                  </div>
                </div>

                {/* image */}
                <div className="mono">{s.image}</div>

                {/* tenant */}
                <div className="mono">{s.tenant ?? '—'}</div>

                {/* age */}
                <div className="mono">{fmtAge(s.ageSec)}</div>

                {/* resources */}
                <div className="res">
                  {s.state === 'pulling-image' ? (
                    <div className="pull">
                      <ProgressBar value={s.pullProgress ?? 0} max={1} style={{ width: 56 }} />
                      <span className="pct">{Math.round((s.pullProgress ?? 0) * 100)}%</span>
                    </div>
                  ) : s.cpuLimit ? (
                    <span>{s.cpuLimit}v <span className="lim">·</span> {Math.round((s.memLimit ?? 0) / 1024)}G</span>
                  ) : (
                    <span className="lim">—</span>
                  )}
                </div>

                {/* state badge */}
                <div>
                  <Badge variant={stateVariant(s.state)} dot={s.state === 'running'}>
                    {s.state}
                  </Badge>
                </div>

                {/* actions */}
                <div className="actions" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" iconOnly aria-label="More actions">
                    <TlnIcon name="more" size={14} />
                  </Button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={<TlnIcon name="box" size={24} />}
                eyebrow={t('sbx.filterAll')}
                title={t('sbx.empty.head')}
                description={t('sbx.empty.desc')}
                action={
                  <Button variant="primary" onClick={() => setDrawer(true)}>
                    <TlnIcon name="plus" size={14} />
                    {t('sbx.newSandbox')}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <CreateSandboxDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}
