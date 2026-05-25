/* AuditRow — 审计事件表格单行组件。
 * 从 PageAudit 中抽离，保持该文件在 200 行以内。
 */
import { Button, Badge } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { relTime as sharedRelTime } from '../lib/relTime';
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

/** 将流事件时间戳（RFC3339）或 AuditEventDTO.at（Unix 秒）换算为距今秒数 */
export function auditSecAgo(atUnix: number): number {
  return Math.round(Date.now() / 1000 - atUnix);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AuditRowProps {
  event: AuditEventDTO;
}

export function AuditRow({ event }: AuditRowProps) {
  const t         = useT();
  const kind      = typeKind(event.event_type);
  const secAgo    = auditSecAgo(event.at);
  const timeStr   = new Date(event.at * 1000).toISOString().slice(11, 19);
  const subEvent  = event.event_type.split('.').slice(1).join('.');
  const actorKind = event.actor?.includes('sb_') ? 'sandbox' : 'user';
  const meta = event.extra
    ? Object.entries(event.extra).map(([k, v]) => `${k}=${v}`).join(' · ')
    : event.reason ?? '—';

  // outcome 通过 i18n 翻译（ok → 成功/OK，err → 失败/Error）
  const outcomeLabel = t(`audit.outcome.${event.outcome}`, event.outcome);

  return (
    <div className="tln-tbl-row aud-row" style={{ cursor: 'default' }} role="row">
      <div className="awhen">
        <span className="rel">{sharedRelTime(secAgo, t)}</span>
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
        <Badge variant={event.outcome === 'ok' ? 'success' : 'danger'}>{outcomeLabel}</Badge>
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
