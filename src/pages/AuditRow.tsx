/* AuditRow — single row in the audit event table.
 * Extracted from PageAudit to keep that file within the 200-line limit.
 */
import { Button, Badge } from '@talon-sandbox/react';
import { TlnIcon } from '../icons/TlnIcon';
import type { AuditEventDTO } from '../api/types';

// ── helpers ───────────────────────────────────────────────────────────────────

export function typeKind(type: string): string {
  if (type.startsWith('sandbox')) return 'sandbox';
  if (type.startsWith('secret'))  return 'secret';
  if (type.startsWith('auth'))    return 'auth';
  if (type.startsWith('pty'))     return 'pty';
  if (type.startsWith('image'))   return 'image';
  return 'system';
}

function actorIcon(actorKind: string): string {
  if (actorKind === 'user')    return 'user';
  if (actorKind === 'agent')   return 'agent';
  if (actorKind === 'sandbox') return 'box';
  if (actorKind === 'system')  return 'server';
  return 'info';
}

export function relTime(secAgo: number): string {
  if (secAgo < 60)   return `${secAgo}s ago`;
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m ago`;
  return `${Math.floor(secAgo / 3600)}h ago`;
}

/** Convert a stream event ts (RFC3339) + AuditEventDTO.at (Unix seconds). */
export function auditSecAgo(atUnix: number): number {
  return Math.round(Date.now() / 1000 - atUnix);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AuditRowProps {
  event: AuditEventDTO;
}

export function AuditRow({ event }: AuditRowProps) {
  const kind     = typeKind(event.event_type);
  const secAgo   = auditSecAgo(event.at);
  const timeStr  = new Date(event.at * 1000).toISOString().slice(11, 19);
  const subEvent = event.event_type.split('.').slice(1).join('.');
  const actorKind = event.actor?.includes('sb_') ? 'sandbox' : 'user';
  const meta = event.extra
    ? Object.entries(event.extra).map(([k, v]) => `${k}=${v}`).join(' · ')
    : event.reason ?? '—';

  return (
    <div className="tln-tbl-row aud-row" style={{ cursor: 'default' }} role="row">
      <div className="awhen">
        <span className="rel">{relTime(secAgo)}</span>
        <span>{timeStr}</span>
      </div>
      <div className="atype">
        <span className={'kind ' + kind}>{kind}</span>
        {subEvent}
      </div>
      <div className={'aactor ' + actorKind}>
        <TlnIcon name={actorIcon(actorKind)} size={11} className="aic" />
        {event.actor ?? '—'}
      </div>
      <div className="atarget">{event.target ?? '—'}</div>
      <div>
        <Badge variant={event.outcome === 'ok' ? 'success' : 'danger'}>{event.outcome}</Badge>
      </div>
      <div className="ameta">{meta}</div>
      <div className="actions">
        <Button variant="ghost" size="sm" iconOnly aria-label="More">
          <TlnIcon name="more" size={14} />
        </Button>
      </div>
    </div>
  );
}
