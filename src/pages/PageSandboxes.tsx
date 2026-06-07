/* PageSandboxes — sandbox list + create drawer + 批量生命周期操作, wired to useSandboxes(). */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, ProgressBar, PageHeader } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';
import { OriginPill } from '../components/OriginPill';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from '../components/Toast';
import { useSandboxes, useBatchSandboxAction } from '../hooks';
import { useRole, canBatchDestroySandboxes } from '../lib/permissions';
import type { SandboxState, SandboxDTO, BatchAction, BatchSandboxResponse } from '../api/types';
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
// selected/onToggle：批量多选。checkbox 单元 stopPropagation,点选不触发行导航。
function SandboxRow({
  s, onClick, showOrigin, selected, onToggle,
}: {
  s: SandboxDTO;
  onClick: () => void;
  showOrigin: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const color = STATE_COLORS[s.state] ?? 'var(--fg-3)';
  return (
    <div
      className={'tln-tbl-row sbx-row sbx-row--sel' + (showOrigin ? ' sbx-row--origin' : '') + (selected ? ' is-selected' : '')}
      onClick={onClick}
      role="row"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="sel-cell" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(s.id)}
          aria-label={`Select ${s.name || s.id}`}
        />
      </div>
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

// ── BatchToolbar ────────────────────────────────────────────────────────────────
// 有选中项时浮出。start/stop/pause 所有角色可见;destroy 仅 owner(canBatchDestroy)。
// busyAction 标出哪个动作正在跑——按钮 loading + 全栏禁用,避免并发重复提交。
function BatchToolbar({
  count, canDestroy, busyAction, onAction, onClear,
}: {
  count: number;
  canDestroy: boolean;
  busyAction: BatchAction | null;
  onAction: (a: BatchAction) => void;
  onClear: () => void;
}) {
  const t = useT();
  const busy = busyAction !== null;
  return (
    <div className="sbx-batchbar" role="region" aria-label="Batch actions">
      <span className="count">{t('sbx.batch.selected', '{n} selected').replace('{n}', String(count))}</span>
      <div className="acts">
        <Button variant="ghost" size="sm" disabled={busy} loading={busyAction === 'start'} onClick={() => onAction('start')}>
          <TlnIcon name="play" size={13} />{t('sbx.batch.start')}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} loading={busyAction === 'stop'} onClick={() => onAction('stop')}>
          <TlnIcon name="stop" size={13} />{t('sbx.batch.stop')}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} loading={busyAction === 'pause'} onClick={() => onAction('pause')}>
          <TlnIcon name="pause" size={13} />{t('sbx.batch.pause')}
        </Button>
        {canDestroy && (
          <Button variant="ghost" size="sm" className="danger" disabled={busy} loading={busyAction === 'destroy'} onClick={() => onAction('destroy')}>
            <TlnIcon name="trash" size={13} />{t('sbx.batch.destroy')}
          </Button>
        )}
      </div>
      <div style={{ flex: 1 }} />
      <Button variant="ghost" size="sm" disabled={busy} onClick={onClear}>{t('sbx.batch.clear')}</Button>
    </div>
  );
}

// summarizeBatch 把逐条结果汇成一条 toast。全成功 → success;有失败 → error;
// 否则(含跳过)→ 中性提示。文案走 i18n。
function toastBatchResult(t: ReturnType<typeof useT>, res: BatchSandboxResponse) {
  const total = res.results.length;
  if (res.failed === 0 && res.skipped === 0) {
    toast.success(t('sbx.batch.resultOk', 'All {n} succeeded').replace('{n}', String(total)));
    return;
  }
  const msg = t('sbx.batch.resultSummary', '{ok} succeeded · {skipped} skipped · {failed} failed')
    .replace('{ok}', String(res.ok))
    .replace('{skipped}', String(res.skipped))
    .replace('{failed}', String(res.failed));
  if (res.failed > 0 && res.ok === 0 && res.skipped === 0) {
    toast.error(t('sbx.batch.allFailed', 'All {n} operations failed').replace('{n}', String(total)));
  } else if (res.failed > 0) {
    toast.error(msg);
  } else {
    toast.success(msg);
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageSandboxes() {
  const t              = useT();
  const nav            = useNavigate();
  const role           = useRole();
  const canDestroy     = canBatchDestroySandboxes(role);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);

  // 批量多选状态。selectedIds 是用户勾选的全集(可能含已被筛掉/已消失的 id),
  // 渲染/操作前都用当前可见集求交,避免对不可见项误操作。
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const batch = useBatchSandboxAction();
  const [busyAction, setBusyAction] = useState<BatchAction | null>(null);

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

  // 当前可见 id 集 —— 全选/部分选判定与"勾选有效集"都基于它。
  const visibleIds = useMemo(() => filtered.map(s => s.id), [filtered]);
  // 选中且仍可见的 id —— 实际会被批量操作的目标。筛选/刷新让某项消失后自动剔除。
  const effectiveSelected = useMemo(
    () => visibleIds.filter(id => selectedIds.has(id)),
    [visibleIds, selectedIds],
  );
  const allVisibleSelected = visibleIds.length > 0 && effectiveSelected.length === visibleIds.length;
  const someVisibleSelected = effectiveSelected.length > 0 && !allVisibleSelected;

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      // 全选状态下再点 → 清空可见项;否则把可见项全部纳入。
      const next = new Set(prev);
      const allSel = visibleIds.length > 0 && visibleIds.every(id => next.has(id));
      if (allSel) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  }, [visibleIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // 执行一次批量操作:跑 mutation → toast 汇总 → 成功/跳过的取消勾选,失败的留选便于重试。
  const runBatch = useCallback(async (action: BatchAction) => {
    const ids = visibleIds.filter(id => selectedIds.has(id));
    if (ids.length === 0) return;
    setBusyAction(action);
    try {
      const res = await batch.mutateAsync({ action, ids });
      toastBatchResult(t, res);
      // 保留 failed,清掉 ok/skipped —— 让用户一眼看到还需处理的项。
      const keep = new Set(res.results.filter(r => r.status === 'failed').map(r => r.id));
      setSelectedIds(keep);
    } catch (e) {
      // 整体请求失败(如 403/网络)——非部分成功路径,整批保留选中。
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAction(null);
    }
  }, [visibleIds, selectedIds, batch, t]);

  const onToolbarAction = useCallback((action: BatchAction) => {
    if (action === 'destroy') { setConfirmDestroy(true); return; }
    void runBatch(action);
  }, [runBatch]);

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

        {/* 批量工具栏:有有效选中项时浮出,占据筛选行与表格之间。 */}
        {effectiveSelected.length > 0 && (
          <BatchToolbar
            count={effectiveSelected.length}
            canDestroy={canDestroy}
            busyAction={busyAction}
            onAction={onToolbarAction}
            onClear={clearSelection}
          />
        )}

        <div className="tln-tbl">
          {/* showOrigin 时切到含来源列的模板,sbx-row--sel 统一前插 checkbox 列。 */}
          <div className={'tln-tbl-head sbx-row sbx-row--sel' + (showOrigin ? ' sbx-row--origin' : '')}>
            <div className="sel-cell">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={el => { if (el) el.indeterminate = someVisibleSelected; }}
                onChange={toggleAll}
                aria-label={t('sbx.batch.selectAll', 'Select all')}
                disabled={visibleIds.length === 0}
              />
            </div>
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
            <SandboxRow
              key={s.id}
              s={s}
              onClick={() => nav('/sandboxes/' + s.id)}
              showOrigin={showOrigin}
              selected={selectedIds.has(s.id)}
              onToggle={toggleOne}
            />
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

      {/* 批量删除二次确认 —— 不可逆,与单条 DestroySandboxDialog 同等审慎,
       * 但批量不强制逐个输入 id(数量可能很大),用一次性确认即可。 */}
      <ConfirmDialog
        open={confirmDestroy}
        onClose={() => setConfirmDestroy(false)}
        title={t('sbx.batch.confirmTitle', 'Delete {n} sandboxes?').replace('{n}', String(effectiveSelected.length))}
        description={t('sbx.batch.confirmDesc')}
        confirmLabel={t('sbx.batch.destroy')}
        cancelLabel={t('common.cancel')}
        loading={busyAction === 'destroy'}
        danger
        onConfirm={async () => {
          await runBatch('destroy');
          setConfirmDestroy(false);
        }}
      />
    </>
  );
}
