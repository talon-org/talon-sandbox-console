/* PageAudit — streaming audit event log with type & range filters.
 * History from useAuditEvents(); live tail from useAuditStream().
 * No mock data.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, SegmentedGroup, SegmentedItem, Input, PageHeader } from '@talon-sandbox/react';
import { EmptyState } from '../components';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useAuditEvents, useAuditStream } from '../hooks';
import type { AuditEventDTO, AuditStreamEvent, AuditQueryParams } from '../api/types';
import { AuditRow } from './AuditRow';
import { typeKind } from '../lib/auditUtils';

import './PageAudit.css';

const RANGE_SECONDS: Record<string, number> = {
  '1h':  3600,
  '24h': 86400,
  '7d':  604800,
  '30d': 2592000,
};
const MAX_LIVE = 200;

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

export function PageAudit() {
  const t = useT();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [range,  setRange]  = useState('24h');
  const [liveEvents, setLiveEvents] = useState<AuditEventDTO[]>([]);

  const onStreamEvent = useCallback((e: AuditStreamEvent) => {
    setLiveEvents(prev => [streamToDisplay(e), ...prev].slice(0, MAX_LIVE));
  }, []);

  const { connected } = useAuditStream(onStreamEvent);

  const since = useMemo(
    () => Math.floor(Date.now() / 1000) - (RANGE_SECONDS[range] ?? 86400),
    [range],
  );
  const queryParams: AuditQueryParams = useMemo(() => ({
    since,
    event_type: filter !== 'all' ? filter : undefined,
    limit: 200,
  }), [since, filter]);

  const { data, isLoading, isError } = useAuditEvents(queryParams);
  const historyEvents = data?.events ?? [];

  const allEvents = useMemo(() => {
    const seen = new Set<string>();
    const merged: AuditEventDTO[] = [];
    for (const e of [...liveEvents, ...historyEvents]) {
      if (!seen.has(e.id)) { seen.add(e.id); merged.push(e); }
    }
    return merged;
  }, [liveEvents, historyEvents]);

  useEffect(() => { setLiveEvents([]); }, [range, filter]);

  const typeCounts = useMemo(() => ({
    all:     allEvents.length,
    sandbox: allEvents.filter(e => typeKind(e.event_type) === 'sandbox').length,
    secret:  allEvents.filter(e => typeKind(e.event_type) === 'secret').length,
    auth:    allEvents.filter(e => typeKind(e.event_type) === 'auth').length,
    pty:     allEvents.filter(e => typeKind(e.event_type) === 'pty').length,
    image:   allEvents.filter(e => typeKind(e.event_type) === 'image').length,
  }), [allEvents]);

  const filtered = useMemo(() => allEvents.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    const hay = [e.event_type, e.actor ?? '', e.target ?? '', e.reason ?? '',
      ...(e.extra ? Object.values(e.extra) : [])].join(' ').toLowerCase();
    return hay.includes(q);
  }), [allEvents, search]);

  return (
    <>
      <PageHeader
        title={t('audit.title')}
        desc={
          <span>
            {t('audit.desc')}&nbsp;
            <span className="aud-stream-pill">
              <span className="sdot" style={{ color: connected ? 'var(--ok)' : 'var(--warn)' }} />
              {connected ? t('audit.liveConnected') : t('audit.liveDisconnected')}
            </span>
          </span>
        }
        actions={
          <>
            {/* time range moved into header actions for visual consistency with PageSandboxes filter row */}
            <SegmentedGroup value={range} size="sm">
              {(['1h','24h','7d','30d'] as const).map(v => (
                <SegmentedItem key={v} value={v} onClick={() => setRange(v)}>{t(`audit.range${v}`)}</SegmentedItem>
              ))}
            </SegmentedGroup>
            <Button variant="ghost">
              <TlnIcon name="filter" size={14} />
              {t('audit.advFilter')}
            </Button>
            <Button variant="ghost">
              <TlnIcon name="download" size={14} />
              {t('audit.exportCsv')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        <div className="sbx-filters" style={{ marginBottom: 14 }}>
          {/* type filter chip row — same .sbx-filter style as PageSandboxes */}
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
          <div style={{ flex: 1 }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('audit.searchPlaceholder')}
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 280 }}
          />
        </div>

        {isLoading && liveEvents.length === 0 && (
          <EmptyState title={t('common.loading')} description={t('audit.loadingDesc')} />
        )}
        {isError && (
          <EmptyState
            icon={<TlnIcon name="alert" size={24} />}
            title={t('audit.errorTitle')}
            description={t('audit.errorDesc')}
          />
        )}

        {!isError && (
          <div className="tln-tbl" role="table" aria-label={t('audit.title')}>
            <div className="tln-tbl-head aud-row" role="rowgroup">
              <div role="columnheader">{t('audit.colTime')}</div>
              <div role="columnheader">{t('audit.colEvent')}</div>
              <div role="columnheader">{t('audit.colActor')}</div>
              <div role="columnheader">{t('audit.colTarget')}</div>
              <div role="columnheader">{t('audit.colResult')}</div>
              <div role="columnheader">{t('audit.colMeta')}</div>
              <div role="columnheader" />
            </div>

            {filtered.map(e => <AuditRow key={e.id} event={e} />)}

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
      </div>
    </>
  );
}
