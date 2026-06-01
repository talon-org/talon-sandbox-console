/* PageAudit — 审计事件日志，含类型/时间范围过滤、关键词搜索、CSV 导出、加载更多。
 * 表格用 ui-lib DataTable(统一组件/列定义/空态/loading);分页保留游标「加载更多」
 * + 实时 tail(useAuditStream)——append-only 审计日志的正确形态,不用 offset 编号分页。
 * 历史记录通过 listAuditEvents 管理(游标分页),实时 tail 来自 useAuditStream()。无 mock。
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, Input, PageHeader, Badge, DataTable, DataTableContent, TablePagination, TablePaginationInfo } from '@talon-sandbox/react';
import type { ColumnDef } from '@talon-sandbox/react';
import { EmptyState } from '../components';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useAuditStream } from '../hooks';
import { listAuditEvents } from '../api/audit';
import type { AuditEventDTO, AuditStreamEvent } from '../api/types';
import { typeKind } from '../lib/auditUtils';
import { eventLabel } from '../lib/eventLabel';
import { relTime as sharedRelTime } from '../lib/relTime';

import './PageAudit.css';

/** 每次 API 请求拉取的最大条数(向后端取一个历史窗口;游标「加载更早」步长) */
const PAGE_LIMIT = 100;

/** 前端编号分页:每页行数 */
const PAGE_SIZE = 20;

/** 各时间范围对应的秒数 */
const RANGE_SECONDS: Record<string, number> = {
  '1h':  3600,
  '24h': 86400,
  '7d':  604800,
  '30d': 2592000,
};

/** 实时 SSE 事件的最大内存缓存条数 */
const MAX_LIVE = 200;

/** 把 SSE 流事件转换成与历史记录结构相同的 DTO */
function streamToDisplay(e: AuditStreamEvent): AuditEventDTO {
  return {
    id:         `live-${e.ts}-${Math.random().toString(36).slice(2)}`,
    event_type: e.kind,
    outcome:    'ok',
    actor:      e.actor,
    target:     e.target,
    tenant_id:  e.tenant_id,
    reason:     e.reason,
    extra:      e.extra,
    at:         Math.floor(new Date(e.ts).getTime() / 1000),
  };
}

function actorIcon(actorKind: string): string {
  if (actorKind === 'sandbox') return 'box';
  return 'user';
}

/** 把任意值转义为 CSV 安全的带双引号字符串（RFC 4180） */
function csvField(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

/** 把事件列表导出为 CSV 并触发浏览器下载 */
function exportToCsv(events: AuditEventDTO[], range: string): void {
  const headers = ['时间', '事件', '操作者', '目标', '结果', '元数据'];
  const rows = events.map(e => {
    const meta = e.extra
      ? Object.entries(e.extra).map(([k, v]) => `${k}=${v}`).join('; ')
      : '';
    return [
      csvField(new Date(e.at * 1000).toLocaleString()),
      csvField(e.event_type),
      csvField(e.actor  ?? ''),
      csvField(e.target ?? ''),
      csvField(e.outcome),
      csvField(meta),
    ].join(',');
  });

  const csv  = [headers.map(csvField).join(','), ...rows].join('\r\n');
  // 加 BOM 确保 Excel 识别 UTF-8
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD
  const a    = document.createElement('a');
  a.href        = url;
  a.download    = `audit-${range}-${date}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PageAudit() {
  const t = useT();

  // ── 过滤条件 ───────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [range,  setRange]  = useState('24h');

  // ── 实时 SSE tail ──────────────────────────────────────────────────────────
  // liveEvents 只在头部 prepend，与历史游标互不干扰
  const [liveEvents, setLiveEvents] = useState<AuditEventDTO[]>([]);

  const onStreamEvent = useCallback((e: AuditStreamEvent) => {
    setLiveEvents(prev => [streamToDisplay(e), ...prev].slice(0, MAX_LIVE));
  }, []);

  // 保持实时 tail 连接；connected 状态不再展示给用户，仅内部使用
  useAuditStream(onStreamEvent);

  // ── 历史分页 state ─────────────────────────────────────────────────────────
  const [historyBatch, setHistoryBatch] = useState<AuditEventDTO[]>([]);
  const [untilCursor,  setUntilCursor]  = useState<number | undefined>(undefined);
  const [hasMore,      setHasMore]      = useState(true);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isError,      setIsError]      = useState(false);

  // loadIdRef 用于取消已过期的异步请求结果
  const loadIdRef = useRef(0);

  // 注意:不向后端传 event_type。后端是精确匹配(event_type = 'sandbox_created' …),
  // 而类型 chip 是「类别」(sandbox/auth/…),传过去匹配不到任何东西 —— 这正是之前
  // 过滤器失效的根因。类别过滤改在前端按 typeKind 做(见 filtered)。
  const doLoad = useCallback(async (opts: {
    reset:   boolean;
    sinceTs: number;
    untilTs: number | undefined;
  }) => {
    const myId = ++loadIdRef.current;
    setIsLoading(true);
    setIsError(false);

    try {
      const resp = await listAuditEvents({
        since: opts.sinceTs,
        until: opts.untilTs,
        limit: PAGE_LIMIT,
      });

      if (myId !== loadIdRef.current) return;

      const events = resp.events ?? [];

      if (opts.reset) {
        setHistoryBatch(events);
        setLiveEvents([]);
      } else {
        setHistoryBatch(prev => [...prev, ...events]);
      }

      setHasMore(events.length >= PAGE_LIMIT);

      if (events.length > 0) {
        setUntilCursor(events[events.length - 1].at - 1);
      }
    } catch {
      if (myId !== loadIdRef.current) return;
      setIsError(true);
    } finally {
      if (myId === loadIdRef.current) setIsLoading(false);
    }
  }, []);

  // 时间范围变更时重置并重新拉取窗口。类型 chip(filter)是前端过滤,不触发网络请求。
  useEffect(() => {
    const sinceTs = Math.floor(Date.now() / 1000) - (RANGE_SECONDS[range] ?? 86400);
    setUntilCursor(undefined);
    setHasMore(true);
    doLoad({ reset: true, sinceTs, untilTs: undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const since = useMemo(
    () => Math.floor(Date.now() / 1000) - (RANGE_SECONDS[range] ?? 86400),
    [range],
  );

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    doLoad({ reset: false, sinceTs: since, untilTs: untilCursor });
  }, [isLoading, hasMore, doLoad, since, untilCursor]);

  // 合并 live + 历史，按 id 去重(live 在前)
  const allEvents = useMemo(() => {
    const seen   = new Set<string>();
    const merged: AuditEventDTO[] = [];
    for (const e of [...liveEvents, ...historyBatch]) {
      if (!seen.has(e.id)) { seen.add(e.id); merged.push(e); }
    }
    return merged;
  }, [liveEvents, historyBatch]);

  const typeCounts = useMemo(() => ({
    all:     allEvents.length,
    sandbox: allEvents.filter(e => typeKind(e.event_type) === 'sandbox').length,
    secret:  allEvents.filter(e => typeKind(e.event_type) === 'secret').length,
    auth:    allEvents.filter(e => typeKind(e.event_type) === 'auth').length,
    pty:     allEvents.filter(e => typeKind(e.event_type) === 'pty').length,
    image:   allEvents.filter(e => typeKind(e.event_type) === 'image').length,
  }), [allEvents]);

  // 类别过滤(typeKind)+ 关键词搜索,都在前端做。
  // 类别过滤是之前失效那块的正确实现:按 typeKind 把具体 event_type 归类后比对 chip 值。
  const filtered = useMemo(() => allEvents.filter(e => {
    if (filter !== 'all' && typeKind(e.event_type) !== filter) return false;
    if (!search) return true;
    const q   = search.toLowerCase();
    const hay = [e.event_type, e.actor ?? '', e.target ?? '', e.reason ?? '',
      ...(e.extra ? Object.values(e.extra) : [])].join(' ').toLowerCase();
    return hay.includes(q);
  }), [allEvents, filter, search]);

  // ── 前端编号分页 ───────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // 过滤/搜索/范围变化导致结果集变化时,把页码夹回合法区间(避免停在空页)。
  useEffect(() => { setPage(p => Math.min(p, totalPages)); }, [totalPages]);
  useEffect(() => { setPage(1); }, [filter, search, range]);

  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRows  = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleExportCsv = useCallback(() => {
    exportToCsv(filtered, range);   // 导出当前过滤结果全集(非仅当前页)
  }, [filtered, range]);

  // ── DataTable 列定义:把原 AuditRow 的逐格渲染搬进 render,沿用 .aud-* 类样式 ──
  const columns = useMemo<ColumnDef<AuditEventDTO>[]>(() => [
    {
      key: 'time', label: t('audit.colTime'), width: 110,
      render: (e) => (
        <div className="awhen">
          <span className="rel">{sharedRelTime(Math.round(Date.now() / 1000 - e.at), t)}</span>
          <span>{new Date(e.at * 1000).toISOString().slice(11, 19)}</span>
        </div>
      ),
    },
    {
      key: 'event', label: t('audit.colEvent'),
      render: (e) => {
        const kind = typeKind(e.event_type);
        // 类别用一个色点表示(色由 .cat-<kind> 决定),事件名走统一中文映射;
        // 不再把英文类别词裸贴在中文前面(之前 "auth请求验证码" 那种)。
        return (
          <div className="atype">
            <span className={'cat-dot cat-' + kind} title={kind} />
            <span className="aname">{eventLabel(e.event_type, t)}</span>
          </div>
        );
      },
    },
    {
      key: 'actor', label: t('audit.colActor'),
      render: (e) => {
        const ak = e.actor?.includes('sb_') ? 'sandbox' : 'user';
        return (
          <div className={'aactor ' + ak}>
            <TlnIcon name={actorIcon(ak)} size={11} className="aic" />
            {e.actor ?? '—'}
          </div>
        );
      },
    },
    {
      key: 'target', label: t('audit.colTarget'), width: '1.4fr', truncate: true,
      render: (e) => <span className="atarget">{e.target ?? '—'}</span>,
    },
    {
      key: 'result', label: t('audit.colResult'), width: '0.7fr',
      render: (e) => {
        // 后端 outcome 可能是 success/failure(REST)或 ok/err(SSE);统一归一化。
        const ok = e.outcome === 'ok' || e.outcome === 'success';
        return (
          <Badge variant={ok ? 'ok' : 'err'} dot>
            {ok ? t('audit.outcome.ok') : t('audit.outcome.err')}
          </Badge>
        );
      },
    },
    {
      key: 'meta', label: t('audit.colMeta'), width: '1.5fr', truncate: true,
      render: (e) => (
        <span className="ameta">
          {e.extra ? Object.entries(e.extra).map(([k, v]) => `${k}=${v}`).join(' · ') : (e.reason ?? '—')}
        </span>
      ),
    },
  ], [t]);

  return (
    <>
      <PageHeader
        title={t('audit.title')}
        desc={t('audit.desc')}
        actions={
          <Button variant="default" onClick={handleExportCsv}>
            <TlnIcon name="download" size={14} />
            {t('audit.exportCsv')}
          </Button>
        }
      />

      <div className="page-body">
        {/* 筛选行:类型 chip + 时间范围 chip + 搜索框 */}
        <div className="sbx-filters" style={{ marginBottom: 14 }}>
          <div className="group">
            {(['all','sandbox','secret','auth','pty','image'] as const).map(v => (
              <button key={v} className="sbx-filter" aria-pressed={filter === v} onClick={() => setFilter(v)}>
                <span>{t(`audit.filter${v.charAt(0).toUpperCase() + v.slice(1)}`)}</span>
                {typeCounts[v] != null && <span className="num">{typeCounts[v]}</span>}
              </button>
            ))}
          </div>

          <div className="group">
            {(['1h','24h','7d','30d'] as const).map(v => (
              <button key={v} className="sbx-filter" aria-pressed={range === v} onClick={() => setRange(v)}>
                <span>{t(`audit.range${v}`)}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('audit.searchPlaceholder')}
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 260 }}
          />
        </div>

        {isError ? (
          <EmptyState
            icon={<TlnIcon name="alert" size={24} />}
            title={t('audit.errorTitle')}
            description={t('audit.errorDesc')}
          />
        ) : (
          <DataTable<AuditEventDTO>
            className="aud-table"
            data={pageRows}
            columns={columns}
            rowKey={(e) => e.id}
            loading={isLoading && allEvents.length === 0}
            empty={
              <EmptyState
                icon={<TlnIcon name="scroll" size={24} />}
                title={t('audit.empty.head')}
                description={t('audit.empty.desc')}
              />
            }
          >
            <DataTableContent />
          </DataTable>
        )}

        {/* 编号分页(前端切片)+ 信息文案 + 「加载更早」扩窗 */}
        {!isError && filtered.length > 0 && (
          <div className="aud-pager">
            <TablePagination page={page} total={totalPages} onPageChange={setPage}>
              <TablePaginationInfo>
                {t('audit.pageInfo')
                  .replace('{from}', String(filtered.length === 0 ? 0 : pageStart + 1))
                  .replace('{to}', String(Math.min(pageStart + PAGE_SIZE, filtered.length)))
                  .replace('{total}', String(filtered.length))}
              </TablePaginationInfo>
            </TablePagination>
            {/* 当前已翻到最后一页、且后端仍有更早历史时,允许把窗口拉长 */}
            {hasMore && page >= totalPages && (
              <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={isLoading}>
                {isLoading
                  ? <TlnIcon name="spinner" size={13} className="aud-spin" />
                  : <TlnIcon name="chevronDown" size={13} />}
                {t('audit.loadOlder')}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
