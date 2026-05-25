/* src/pages/_secrets/SecretRow.tsx
 * Single row in the secrets table.
 */
import { Button, toast } from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import type { SecretDTO } from '../../api/types';

function relTime(sec: number): string {
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function secsAgo(unix: number): number {
  return Math.round((Date.now() / 1000) - unix);
}

interface Props {
  secret: SecretDTO;
  onRotate: (s: SecretDTO) => void;
}

export function SecretRow({ secret: s, onRotate }: Props) {
  const t = useT();
  const rotatedAgo    = s.last_rotated_at ? relTime(secsAgo(s.last_rotated_at)) : '—';
  const rotateDueFlag = !s.last_rotated_at;

  return (
    <div className="tln-tbl-row sec-row" style={{ cursor: 'default' }}>
      <div className="name-cell">
        <div className="sic"><TlnIcon name="key" size={12} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className="sn">
            {s.name}
            {rotateDueFlag && (
              <span className="rotate-warn">
                <TlnIcon name="refresh" size={9} />
                {t('secrets.filterRotate')}
              </span>
            )}
          </span>
          <span className="scope-pill">{t('secrets.filterTenant')}</span>
        </div>
      </div>
      <div className="mono">{rotatedAgo}</div>
      <div className="mono">—</div>
      <div className="mono" style={{ color: 'var(--fg-1)' }}>{s.used_by_count.toLocaleString()}</div>
      <div className="mono">{s.used_by_count}</div>
      <div className="mono">—</div>
      <div className="actions">
        <Button variant="ghost" size="sm"
          onClick={() => toast.warn(s.name + ' — ' + t('secrets.viewToast'))}>
          <TlnIcon name="eye" size={13} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onRotate(s)}>
          <TlnIcon name="refresh" size={13} />
        </Button>
        <Button variant="ghost" size="sm" iconOnly aria-label={t('secrets.rotate')}>
          <TlnIcon name="more" size={14} />
        </Button>
      </div>
    </div>
  );
}
