/* PageSandboxes — sandbox list + create drawer, wired to useSandboxes(). */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, Button, Input, Badge, ProgressBar } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { EmptyState } from '../components/EmptyState';
import { useSandboxes } from '../hooks';
import type { SandboxState, SandboxDTO } from '../api/types';
import { CreateSandboxDrawer } from './_sandboxes/CreateSandboxDrawer';

import './PageSandboxes.css';

// ── helpers ───────────────────────────────────────────────────────────────────
const STATE_COLORS: Partial<Record<SandboxState, string>> = {
  'running':       'var(--ok)',
  'pulling-image': 'var(--warn)',
  'provisioning':  'var(--warn)',
  'terminating':   'var(--warn)',
  'idle':          'var(--fg-3)',
  'paused':        'var(--fg-4, var(--fg-3))',
  'failed':        'var(--err)',
  'evicted':       'var(--fg-4, var(--fg-3))',
  'stopped':       'var(--fg-4, var(--fg-3))',
  'destroyed':     'var(--fg-4, var(--fg-3))',
};

const ACTIVE_STATES: SandboxState[] = ['running', 'pulling-image', 'provisioning'];

function stateVariant(state: SandboxState): 'success' | 'warning' | 'danger' | 'neutral' {
  if (state === 'running') return 'success';
  if (ACTIVE_STATES.includes(state) || state === 'paused' || state === 'idle') return 'warning';
  if (state === 'failed') return 'danger';
  return 'neutral';
}

function fmtCpu(millis?: number): string {
  if (!millis) return '—';
  return (millis / 1000).toFixed(1) + 'v';
}

function fmtMem(bytes?: number): string {
  if (!bytes) return '—';
  return (bytes / (1024 ** 3)).toFixed(1) + 'G';
}

function fmtAge(createdAt?: number): string {
  if (!createdAt) return '—';
  const sec = Math.floor(Date.now() / 1000 - createdAt);
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}

// ── SandboxRow ────────────────────────────────────────────────────────────────
function SandboxRow({ s, onClick }: { s: SandboxDTO; onClick: () => void }) {
  const t     = useT();
  const color = STATE_COLORS[s.state] ?? 'var(--fg-3)';
  // 状态标签通过 i18n 翻译，不直接渲染原始 API 字符串
  const stateLabel = t(`state.${s.state}`, s.state);
  return (
    <div className="tln-tbl-row sbx-row" onClick={onClick} role="row" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', flex: '0 0 auto', background: color }} />
        <div className="img-row">
          <span className="name">{s.id}</span>
          <span className="meta">{s.profile}</span>
        </div>
      </div>
      <div className="mono">{s.image_id ?? '—'}</div>
      {/* tenant_id 列：直接渲染 API 字段，无则显示 — */}
      <div className="mono">{(s as { tenant_id?: string }).tenant_id ?? '—'}</div>
      <div className="mono">{fmtAge(s.created_at)}</div>
      <div className="res">
        {s.state === 'pulling-image' ? (
          <div className="pull"><ProgressBar indeterminate style={{ width: 56 }} /></div>
        ) : (
          <span>{fmtCpu(s.cpu_millis)} <span className="lim">·</span> {fmtMem(s.memory_bytes)}</span>
        )}
      </div>
      <div>
        <Badge variant={stateVariant(s.state)} dot={s.state === 'running'}>{stateLabel}</Badge>
      </div>
      <div className="actions" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" iconOnly aria-label="More">
          <TlnIcon name="more" size={14} />
        </Button>
      </div>
    </div>
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

  useEffect(() => {
    if (searchParams.get('new') === '1') setDrawer(true);
  }, [searchParams]);

  const { data, isLoading, error, refetch } = useSandboxes();
  const sandboxes = data?.sandboxes ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sandboxes.length };
    for (const s of sandboxes) c[s.state] = (c[s.state] ?? 0) + 1;
    c['active'] = sandboxes.filter(s => ACTIVE_STATES.includes(s.state)).length;
    return c;
  }, [sandboxes]);

  const filtered = useMemo(() => sandboxes.filter(s => {
    if (filter === 'active') { if (!ACTIVE_STATES.includes(s.state)) return false; }
    else if (filter !== 'all' && s.state !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.id.toLowerCase().includes(q) && !(s.profile ?? '').toLowerCase().includes(q) && !(s.image_id ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [sandboxes, filter, search]);

  const filterBtn = (val: string, label: string) => (
    <button key={val} className="sbx-filter" aria-pressed={filter === val} onClick={() => setFilter(val)}>
      <span>{label}</span>
      <span className="num">{counts[val] ?? 0}</span>
    </button>
  );

  if (isLoading) return <EmptyState variant="loading" />;
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return <EmptyState variant="error" title={t('common.loadFailed')} message={msg} action={<Button onClick={() => refetch()}>{t('common.retry')}</Button>} />;
  }

  return (
    <>
      <PageHeader
        title={t('sbx.title')}
        num={`${counts['active'] ?? 0} ${t('sandboxes.running')} / ${counts.all} ${t('sandboxes.total')}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => refetch()}>
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
          <div className="tln-tbl-head sbx-row">
            <div>{t('sbx.colSandbox')}</div>
            <div>{t('sbx.colImage')}</div>
            <div>{t('sbx.colTenant')}</div>
            <div>{t('sbx.colAge')}</div>
            <div>{t('sbx.colResources')}</div>
            <div>{t('sbx.colStatus')}</div>
            <div />
          </div>
          {filtered.map(s => (
            <SandboxRow key={s.id} s={s} onClick={() => nav('/sandboxes/' + s.id)} />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 32 }}>
              <EmptyState
                variant="empty"
                title={t('sbx.empty.head')}
                message={t('sbx.empty.desc')}
                action={<Button variant="primary" onClick={() => setDrawer(true)}><TlnIcon name="plus" size={14} />{t('sbx.newSandbox')}</Button>}
              />
            </div>
          )}
        </div>
      </div>

      <CreateSandboxDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}
