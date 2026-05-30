/* PageAudit — 审计事件日志，含类型/时间范围过滤、关键词搜索、CSV 导出、加载更多。
 * 历史记录通过直接调用 listAuditEvents 管理（游标分页），实时 tail 来自 useAuditStream()。
 * 无任何 mock 数据。
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, Input, PageHeader } from '@talon-sandbox/react';
import { EmptyState } from '../components';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useAuditStream } from '../hooks';
import { listAuditEvents } from '../api/audit';
import type { AuditEventDTO, AuditStreamEvent } from '../api/types';
import { AuditRow } from './AuditRow';
import { typeKind } from '../lib/auditUtils';

import './PageAudit.css';

/** 每次 API 请求拉取的最大条数，同时作为游标分页的步长 */
const PAGE_LIMIT = 100;

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
  // historyBatch：已累积的历史事件（追加式，不含实时 live events）
  const [historyBatch, setHistoryBatch] = useState<AuditEventDTO[]>([]);
  // until 游标：下次「加载更多」时传入的 until 参数（Unix 秒）
  const [untilCursor,  setUntilCursor]  = useState<number | undefined>(undefined);
  // 是否还有更多历史数据（上次返回条数 < PAGE_LIMIT 即认为到底）
  const [hasMore,      setHasMore]      = useState(true);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isError,      setIsError]      = useState(false);

  // ── 加载函数（首次 + 加载更多共用）────────────────────────────────────────
  // loadIdRef 用于取消已过期的异步请求结果
  const loadIdRef = useRef(0);

  const doLoad = useCallback(async (opts: {
    reset:     boolean;
    sinceTs:   number;
    untilTs:   number | undefined;
    eventType: string | undefined;
  }) => {
    const myId = ++loadIdRef.current;
    setIsLoading(true);
    setIsError(false);

    try {
      const resp = await listAuditEvents({
        since:      opts.sinceTs,
        until:      opts.untilTs,
        event_type: opts.eventType,
        limit:      PAGE_LIMIT,
      });

      if (myId !== loadIdRef.current) return;   // 被更新的请求覆盖，直接丢弃

      const events = resp.events ?? [];

      if (opts.reset) {
        // 过滤条件切换：清空历史和 live，重新开始
        setHistoryBatch(events);
        setLiveEvents([]);
      } else {
        // 加载更多：追加到现有历史列表
        setHistoryBatch(prev => [...prev, ...events]);
      }

      // 返回条数 < PAGE_LIMIT → 到底了
      setHasMore(events.length >= PAGE_LIMIT);

      // 更新游标：取本批最旧一条的 at，下次用 until = at - 1 避免重复
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

  // ── 过滤条件变更时重置并加载第一页 ────────────────────────────────────────
  useEffect(() => {
    const sinceTs = Math.floor(Date.now() / 1000) - (RANGE_SECONDS[range] ?? 86400);
    setUntilCursor(undefined);
    setHasMore(true);
    doLoad({
      reset:     true,
      sinceTs,
      untilTs:   undefined,
      eventType: filter !== 'all' ? filter : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, filter]);   // doLoad 是稳定的 useCallback，不需要列入依赖

  // ── since（用于「加载更多」时传给 API）────────────────────────────────────
  const since = useMemo(
    () => Math.floor(Date.now() / 1000) - (RANGE_SECONDS[range] ?? 86400),
    [range],
  );

  // ── 加载更多（游标向过去翻页）─────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    doLoad({
      reset:     false,
      sinceTs:   since,
      untilTs:   untilCursor,
      eventType: filter !== 'all' ? filter : undefined,
    });
  }, [isLoading, hasMore, doLoad, since, untilCursor, filter]);

  // ── 合并 live + 历史，按 id 去重 ──────────────────────────────────────────
  // live 在前（最新），history 在后（时间倒序）
  const allEvents = useMemo(() => {
    const seen   = new Set<string>();
    const merged: AuditEventDTO[] = [];
    for (const e of [...liveEvents, ...historyBatch]) {
      if (!seen.has(e.id)) { seen.add(e.id); merged.push(e); }
    }
    return merged;
  }, [liveEvents, historyBatch]);

  // ── 类型计数（基于合并后、未搜索的 allEvents）─────────────────────────────
  const typeCounts = useMemo(() => ({
    all:     allEvents.length,
    sandbox: allEvents.filter(e => typeKind(e.event_type) === 'sandbox').length,
    secret:  allEvents.filter(e => typeKind(e.event_type) === 'secret').length,
    auth:    allEvents.filter(e => typeKind(e.event_type) === 'auth').length,
    pty:     allEvents.filter(e => typeKind(e.event_type) === 'pty').length,
    image:   allEvents.filter(e => typeKind(e.event_type) === 'image').length,
  }), [allEvents]);

  // ── 关键词搜索（纯前端本地过滤，不触发网络请求）──────────────────────────
  const filtered = useMemo(() => allEvents.filter(e => {
    if (!search) return true;
    const q   = search.toLowerCase();
    const hay = [e.event_type, e.actor ?? '', e.target ?? '', e.reason ?? '',
      ...(e.extra ? Object.values(e.extra) : [])].join(' ').toLowerCase();
    return hay.includes(q);
  }), [allEvents, search]);

  // ── 导出 CSV（纯前端，基于当前 filtered 数组）─────────────────────────────
  const handleExportCsv = useCallback(() => {
    exportToCsv(filtered, range);
  }, [filtered, range]);

  return (
    <>
      {/* PageHeader：标题 + 描述 + 导出按钮（导出与 PageSecrets/PageSandboxes
          一致放在 header actions 里，全站统一）。过滤控件放表格上方筛选行。 */}
      <PageHeader
        title={t('audit.title')}
        desc={t('audit.desc')}
        actions={
          <>
            <Button variant="default" onClick={handleExportCsv}>
              <TlnIcon name="download" size={14} />
              {t('audit.exportCsv')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        {/* 筛选行：类型 chip + 时间范围 chip + 搜索框，统一放在表格上方。
            时间范围用与类型 chip 同款 .sbx-filter 风格，全行视觉统一。 */}
        <div className="sbx-filters" style={{ marginBottom: 14 }}>
          {/* 类型 chip 组 */}
          <div className="group">
            {(['all','sandbox','secret','auth','pty','image'] as const).map(v => (
              <button
                key={v}
                className="sbx-filter"
                aria-pressed={filter === v}
                onClick={() => setFilter(v)}
              >
                <span>{t(`audit.filter${v.charAt(0).toUpperCase() + v.slice(1)}`)}</span>
                {typeCounts[v] != null && <span className="num">{typeCounts[v]}</span>}
              </button>
            ))}
          </div>

          {/* 时间范围 chip 组（与类型 chip 同款 .sbx-filter 样式） */}
          <div className="group">
            {(['1h','24h','7d','30d'] as const).map(v => (
              <button
                key={v}
                className="sbx-filter"
                aria-pressed={range === v}
                onClick={() => setRange(v)}
              >
                <span>{t(`audit.range${v}`)}</span>
              </button>
            ))}
          </div>

          {/* 弹性间距 */}
          <div style={{ flex: 1 }} />

          {/* 搜索框 */}
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('audit.searchPlaceholder')}
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 260 }}
          />
        </div>

        {/* 骨架态：初次加载且无任何数据时展示 */}
        {isLoading && allEvents.length === 0 && (
          <EmptyState title={t('common.loading')} description={t('audit.loadingDesc')} />
        )}

        {/* 错误态 */}
        {isError && (
          <EmptyState
            icon={<TlnIcon name="alert" size={24} />}
            title={t('audit.errorTitle')}
            description={t('audit.errorDesc')}
          />
        )}

        {!isError && (
          <div className="tln-tbl" role="table" aria-label={t('audit.title')}>
            {/* 表头 */}
            <div className="tln-tbl-head aud-row" role="rowgroup">
              <div role="columnheader">{t('audit.colTime')}</div>
              <div role="columnheader">{t('audit.colEvent')}</div>
              <div role="columnheader">{t('audit.colActor')}</div>
              <div role="columnheader">{t('audit.colTarget')}</div>
              <div role="columnheader">{t('audit.colResult')}</div>
              <div role="columnheader">{t('audit.colMeta')}</div>
            </div>

            {/* 事件行列表 */}
            {filtered.map(e => <AuditRow key={e.id} event={e} />)}

            {/* 空结果提示 */}
            {filtered.length === 0 && !isLoading && (
              <div style={{ padding: 32 }}>
                <EmptyState
                  icon={<TlnIcon name="scroll" size={24} />}
                  eyebrow={t('audit.empty.head')}
                  title={t('audit.empty.head')}
                  description={t('audit.empty.desc')}
                />
              </div>
            )}
          </div>
        )}

        {/* 加载更多：仍有数据且不在初次加载中时展示 */}
        {!isError && hasMore && allEvents.length > 0 && (
          <div className="aud-load-more">
            <Button variant="ghost" onClick={handleLoadMore} disabled={isLoading}>
              {isLoading
                ? <TlnIcon name="spinner" size={14} className="aud-spin" />
                : <TlnIcon name="chevron-down" size={14} />
              }
              {t('audit.loadMore')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
