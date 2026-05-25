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
  const lastUsedAgo   = s.last_used_at && s.last_used_at > 0 ? relTime(secsAgo(s.last_used_at)) : '—';
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
          {/* scope pill 反映实际 scope 字段，缺省视为 tenant（G5 新增字段） */}
          <span className={`scope-pill${s.scope === 'sandbox' ? ' sandbox' : ''}`}>
            {t(`secrets.scope.${s.scope || 'tenant'}`, t('secrets.filterTenant'))}
          </span>
        </div>
      </div>
      <div className="mono">{rotatedAgo}</div>
      {/* last_used_at：G5 新增字段；后端未写入时显示 — */}
      <div className="mono">{lastUsedAgo}</div>
      <div className="mono" style={{ color: 'var(--fg-1)' }}>{s.used_by_count.toLocaleString()}</div>
      <div className="mono">{s.used_by_count}</div>
      {/* created_by：G5 新增字段；旧记录 / API Key 为空则显示 — */}
      <div className="mono" title={s.created_by || undefined} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {s.created_by || '—'}
      </div>
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
