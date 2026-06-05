/* PageSandboxes — sandbox list + create drawer, wired to useSandboxes(). */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, ProgressBar, PageHeader } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';
import { OriginPill } from '../components/OriginPill';
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
// showOrigin：列表中至少有一条带 created_from 时才插入"来源"列，避免空列占位。
function SandboxRow({ s, onClick, showOrigin }: { s: SandboxDTO; onClick: () => void; showOrigin: boolean }) {
  const t     = useT();
  const color = STATE_COLORS[s.state] ?? 'var(--fg-3)';
  return (
    <div className={'tln-tbl-row sbx-row' + (showOrigin ? ' sbx-row--origin' : '')} onClick={onClick} role="row" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', flex: '0 0 auto', background: color }} />
        <div className="img-row">
          {/* G2 name 字段：有值则显示用户命名，下方显示 id；无名称则 id 作主显 */}
          <span className="name">{s.name || s.id}</span>
          <span className="meta">{s.name ? s.id : s.profile}</span>
        </div>
      </div>
      <div className="mono">{s.image_id ?? '—'}</div>
      {/* tenant_id 列：直接渲染 API 字段，无则显示 — */}
      <div className="mono">{(s as { tenant_id?: string }).tenant_id ?? '—'}</div>
      {/* 来源列：有 created_from 渲染 pill，空值显示 —；仅在整列有数据时存在 */}
      {showOrigin && (
        <div className="origin-cell">
          {s.created_from ? <OriginPill origin={s.created_from} /> : <span className="mono">—</span>}
        </div>
      )}
      <div className="mono">{fmtAge(s.created_at)}</div>
      <div className="res">
        {s.state === 'pulling-image' ? (
          <div className="pull"><ProgressBar indeterminate style={{ width: 56 }} /></div>
        ) : (
          <span>{fmtCpu(s.cpu_millis)} <span className="lim">·</span> {fmtMem(s.memory_bytes)}</span>
        )}
      </div>
      <div>
        <StatusPill state={s.state} />
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
  const [originFilter, setOriginFilter] = useState('all');
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

  // 列表中实际出现过的来源渠道(去重、稳定顺序)。仅当有数据时才出现"来源"列与筛选器。
  const origins = useMemo(() => {
    const seen = new Set<string>();
    for (const s of sandboxes) if (s.created_from) seen.add(s.created_from);
    return Array.from(seen);
  }, [sandboxes]);
  const showOrigin = origins.length > 0;

  const filtered = useMemo(() => sandboxes.filter(s => {
    if (filter === 'active') { if (!ACTIVE_STATES.includes(s.state)) return false; }
    else if (filter !== 'all' && s.state !== filter) return false;
    // 来源筛选:与状态筛选正交,'all' 不过滤
    if (originFilter !== 'all' && s.created_from !== originFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      // G2：name 字段也参与搜索；admin 视角下 tenant_id 也参与搜索
      if (
        !s.id.toLowerCase().includes(q) &&
        !(s.name ?? '').toLowerCase().includes(q) &&
        !(s.profile ?? '').toLowerCase().includes(q) &&
        !(s.image_id ?? '').toLowerCase().includes(q) &&
        !(s.tenant_id ?? '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [sandboxes, filter, originFilter, search]);

  const filterBtn = (val: string, label: string) => (
    <button type="button" key={val} className="sbx-filter" aria-pressed={filter === val} onClick={() => setFilter(val)}>
      <span>{label}</span>
      <span className="num">{counts[val] ?? 0}</span>
    </button>
  );

  // 来源筛选 pill —— 与 filterBtn 同款,但作用于 originFilter 维度,不带计数。
  const originFilterBtn = (val: string, label: string) => (
    <button type="button" key={'o-' + val} className="sbx-filter" aria-pressed={originFilter === val} onClick={() => setOriginFilter(val)}>
      <span>{label}</span>
    </button>
  );

  if (isLoading) return <EmptyState variant="loading" />;
  if (error) {
    return <EmptyState variant="error" error={error} action={<Button onClick={() => refetch()}>{t('common.retry')}</Button>} />;
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
          {/* 来源筛选 —— 仅在列表里实际出现过来源时显示;与状态筛选独立成组。
           * 复用 .sbx-filter pill 样式,选项动态来自数据中出现过的渠道。 */}
          {showOrigin && (
            <div className="group">
              {originFilterBtn('all', t('sbx.filterOriginAll'))}
              {origins.map(o => originFilterBtn(o, t(`origin.${o}`, o)))}
            </div>
          )}
          <div style={{ flex: 1 }} />
          {/* 搜索框已覆盖筛选意图，原 filter 图标按钮（无 onClick）属冗余装饰，已删除 */}
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('sbx.searchPlaceholder')}
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 280 }}
          />
        </div>

        <div className="tln-tbl">
          {/* showOrigin 时切到 7 列模板(含来源列),否则用原 6 列模板。 */}
          <div className={'tln-tbl-head sbx-row' + (showOrigin ? ' sbx-row--origin' : '')}>
            <div>{t('sbx.colSandbox')}</div>
            <div>{t('sbx.colImage')}</div>
            <div>{t('sbx.colTenant')}</div>
            {showOrigin && <div>{t('sbx.colOrigin')}</div>}
            <div>{t('sbx.colAge')}</div>
            <div>{t('sbx.colResources')}</div>
            <div>{t('sbx.colStatus')}</div>
            <div />
          </div>
          {filtered.map(s => (
            <SandboxRow key={s.id} s={s} onClick={() => nav('/sandboxes/' + s.id)} showOrigin={showOrigin} />
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
