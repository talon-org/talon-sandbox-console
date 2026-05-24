/* PageAudit — streaming audit event log with type & range filters.
 * 1:1 port of page-audit.jsx prototype.
 * Simulates streaming: prepends a new event every 4.2s (≤ 200 kept).
 */
import { useState, useEffect, useMemo } from 'react';
import { PageHeader, Button, Input, Segmented, Badge, EmptyState } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_AUDIT, relTime } from '../mock/data';
import type { MockAuditEvent } from '../mock/data';
// TODO: replace mock with apiGet('/v1/audit?limit=200') and SSE / WebSocket for live feed

// ── inject styles once ────────────────────────────────────────────────────────
if (!document.getElementById('tln-page-audit-styles')) {
  const s = document.createElement('style');
  s.id = 'tln-page-audit-styles';
  s.textContent = `
.aud-row { grid-template-columns: 100px 1fr 1fr 1.4fr 0.7fr 1.5fr 70px; }
.aud-row .awhen { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); display: flex; flex-direction: column; gap: 1px; }
.aud-row .awhen .rel { color: var(--fg-2); }
.aud-row .atype { font-family: var(--font-mono); font-size: 11px; color: var(--fg-1); font-weight: 500; letter-spacing: -0.005em; }
.aud-row .atype .kind {
  display: inline-block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 1px 5px; border-radius: 3px; margin-right: 6px;
}
.aud-row .atype .kind.sandbox { background: var(--acc-soft); color: var(--acc-strong); }
.aud-row .atype .kind.secret  { background: var(--magenta-soft, rgba(198,120,221,.1)); color: var(--magenta, #c678dd); }
.aud-row .atype .kind.auth    { background: var(--info-soft); color: var(--info); }
.aud-row .atype .kind.pty     { background: var(--teal-soft, rgba(86,203,184,.1)); color: var(--teal, #56cbb8); }
.aud-row .atype .kind.tenant  { background: var(--ok-soft); color: var(--ok); }
.aud-row .atype .kind.image   { background: var(--warn-soft); color: var(--warn); }
.aud-row .atype .kind.port    { background: var(--teal-soft, rgba(86,203,184,.1)); color: var(--teal, #56cbb8); }
.aud-row .atype .kind.file    { background: var(--bg-3); color: var(--fg-2); }
.aud-row .aactor, .aud-row .atarget {
  font-family: var(--font-mono); font-size: 11.5px; color: var(--fg-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: flex; align-items: center; gap: 5px;
}
.aud-row .aactor .aic { color: var(--fg-3); flex: 0 0 auto; }
.aud-row .aactor.user   .aic { color: var(--info); }
.aud-row .aactor.agent  .aic { color: var(--magenta, #c678dd); }
.aud-row .aactor.sandbox .aic { color: var(--acc-strong); }
.aud-row .ameta { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aud-stream-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  padding: 2px 7px; border-radius: 3px; background: var(--ok-soft); color: var(--ok);
}
.aud-stream-pill .sdot { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); animation: tln-pulse 1.6s ease-in-out infinite; }
`;
  document.head.appendChild(s);
}

// ── helpers ───────────────────────────────────────────────────────────────────
function typeKind(type: string): string {
  if (type.startsWith('sandbox')) return 'sandbox';
  if (type.startsWith('secret'))  return 'secret';
  if (type.startsWith('auth'))    return 'auth';
  if (type.startsWith('pty'))     return 'pty';
  if (type.startsWith('tenant'))  return 'tenant';
  if (type.startsWith('image'))   return 'image';
  if (type.startsWith('port'))    return 'port';
  if (type.startsWith('file'))    return 'file';
  return 'system';
}

function actorIcon(kind: string): string {
  if (kind === 'user')    return 'user';
  if (kind === 'agent')   return 'agent';
  if (kind === 'sandbox') return 'box';
  if (kind === 'system')  return 'server';
  return 'info';
}

// synthetic new events for streaming simulation
const STREAM_EVENTS: Omit<MockAuditEvent, 'id' | 'at'>[] = [
  { type: 'pty.write',      actor: 'sb_42a1', actorKind: 'sandbox', target: '/dev/pts/0',           tenant: 'acme', result: 'ok',   meta: 'bytes=128 · stream=stdout' },
  { type: 'secret.access',  actor: 'sb_9c0e', actorKind: 'sandbox', target: 'OPENAI_API_KEY',       tenant: 'acme', result: 'ok' },
  { type: 'file.write',     actor: 'sb_42a1', actorKind: 'sandbox', target: '/workspace/dist/index.js', tenant: 'acme', result: 'ok', meta: 'bytes=21408' },
  { type: 'port.probe',     actor: 'system',   actorKind: 'system',  target: 'sb_42a1:5173',        tenant: 'acme', result: 'ok' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageAudit() {
  const t = useT();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [range,  setRange]  = useState('24h');
  const [stream, setStream] = useState<MockAuditEvent[]>(MOCK_AUDIT);

  // simulate live stream
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      const tmpl = STREAM_EVENTS[i % STREAM_EVENTS.length];
      const evt: MockAuditEvent = {
        ...tmpl,
        id: 's' + Math.random().toString(36).slice(2),
        at: new Date().toISOString(),
      };
      setStream(prev => [evt, ...prev].slice(0, 200));
      i++;
    }, 4200);
    return () => clearInterval(iv);
  }, []);

  const typeCounts = useMemo(() => ({
    all:     stream.length,
    sandbox: stream.filter(e => typeKind(e.type) === 'sandbox').length,
    secret:  stream.filter(e => typeKind(e.type) === 'secret').length,
    auth:    stream.filter(e => typeKind(e.type) === 'auth').length,
    pty:     stream.filter(e => typeKind(e.type) === 'pty').length,
    image:   stream.filter(e => typeKind(e.type) === 'image').length,
  }), [stream]);

  const filtered = useMemo(() => stream.filter(e => {
    if (filter !== 'all' && typeKind(e.type) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![e.type, e.actor, e.target, e.tenant, e.meta ?? ''].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [stream, filter, search]);

  const filterBtn = (val: string, label: string, count: number) => (
    <button key={val} className="sbx-filter" aria-pressed={filter === val} onClick={() => setFilter(val)}>
      <span>{label}</span><span className="num">{count}</span>
    </button>
  );

  return (
    <>
      <PageHeader
        eyebrow={t('audit.eyebrow')}
        title={t('audit.title')}
        desc={
          <span>
            {t('audit.desc')}&nbsp;
            <span className="aud-stream-pill">
              <span className="sdot" />live
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="filter" size={14} />
              Advanced
            </Button>
            <Button variant="ghost">
              <TlnIcon name="download" size={14} />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="page-body">
        <div className="sbx-filters" style={{ marginBottom: 14 }}>
          <div className="group">
            {filterBtn('all',     t('audit.filterAll'),       typeCounts.all)}
            {filterBtn('sandbox', 'Sandbox',                  typeCounts.sandbox)}
            {filterBtn('secret',  'Secret',                   typeCounts.secret)}
            {filterBtn('auth',    'Auth',                     typeCounts.auth)}
            {filterBtn('pty',     'PTY',                      typeCounts.pty)}
            {filterBtn('image',   'Image',                    typeCounts.image)}
          </div>
          <div style={{ flex: 1 }} />
          <Segmented
            value={range}
            onChange={setRange}
            size="sm"
            options={[
              { value: '1h',  label: '1h' },
              { value: '24h', label: '24h' },
              { value: '7d',  label: '7d' },
              { value: '30d', label: '30d' },
            ]}
          />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search type · actor · target · meta…"
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 280 }}
          />
        </div>

        <div className="tln-tbl">
          <div className="tln-tbl-head aud-row">
            <div>Time</div>
            <div>Event</div>
            <div>Actor</div>
            <div>Target</div>
            <div>Result</div>
            <div>Meta</div>
            <div />
          </div>

          {filtered.map(e => {
            const kind      = typeKind(e.type);
            const actKind   = e.actorKind ?? 'user';
            const secAgo    = Math.round((Date.now() - new Date(e.at).getTime()) / 1000);
            const timeStr   = new Date(e.at).toISOString().slice(11, 19);
            const subEvent  = e.type.split('.').slice(1).join('.');
            return (
              <div key={e.id} className="tln-tbl-row aud-row" style={{ cursor: 'default' }}>
                <div className="awhen">
                  <span className="rel">{relTime(secAgo)}</span>
                  <span>{timeStr}</span>
                </div>
                <div className="atype">
                  <span className={'kind ' + kind}>{kind}</span>
                  {subEvent}
                </div>
                <div className={'aactor ' + actKind}>
                  <TlnIcon name={actorIcon(actKind)} size={11} className="aic" />
                  {e.actor}
                </div>
                <div className="atarget">{e.target}</div>
                <div>
                  <Badge variant={e.result === 'ok' ? 'success' : 'danger'}>{e.result}</Badge>
                </div>
                <div className="ameta">{e.meta ?? '—'}</div>
                <div className="actions">
                  <Button variant="ghost" size="sm" iconOnly aria-label="More">
                    <TlnIcon name="more" size={14} />
                  </Button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={<TlnIcon name="scroll" size={24} />}
                eyebrow="no events"
                title="No events match current filters"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
