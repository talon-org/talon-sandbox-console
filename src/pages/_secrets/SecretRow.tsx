/* src/pages/_secrets/SecretRow.tsx
 * 凭据列表单行组件。
 * 行级操作：轮换（弹确认）、复制名称、删除（弹确认）。
 * 凭据值后端设计上不返回，故不提供「查看明文」入口（曾有的眼睛按钮只能弹提示，
 * 是承诺查看却做不到的假功能，已移除）。
 * 无下拉组件依赖——所有操作直接暴露为图标按钮，与 PageApiKeys 风格一致。
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
  /** 父组件处理删除确认弹窗，此处只触发 */
  onDelete: (s: SecretDTO) => void;
}

export function SecretRow({ secret: s, onRotate, onDelete }: Props) {
  const t = useT();
  const rotatedAgo    = s.last_rotated_at ? relTime(secsAgo(s.last_rotated_at)) : '—';
  const lastUsedAgo   = s.last_used_at && s.last_used_at > 0 ? relTime(secsAgo(s.last_used_at)) : '—';
  const rotateDueFlag = !s.last_rotated_at;

  /** 复制凭据名称到剪贴板 */
  const handleCopyName = () => {
    navigator.clipboard.writeText(s.name).then(
      () => toast.success(s.name + ' — ' + t('secrets.copyNameSuccess')),
      () => toast.error(t('common.loadFailed')),
    );
  };

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
      {/* created_by：G5 新增字段；旧记录 / API Key 为空则显示 — */}
      <div className="mono" title={s.created_by || undefined} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {s.created_by || '—'}
      </div>
      <div className="actions">
        {/* 轮换：由父组件弹确认 */}
        <Button variant="ghost" size="sm" onClick={() => onRotate(s)}>
          <TlnIcon name="refresh" size={13} />
        </Button>
        {/* 复制名称到剪贴板 */}
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={handleCopyName}
          title={t('secrets.copyName')}
          aria-label={t('secrets.copyName')}
        >
          <TlnIcon name="copy" size={13} />
        </Button>
        {/* 删除：由父组件弹确认，避免在 row 层持有 mutation state */}
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => onDelete(s)}
          title={t('secrets.delete')}
          aria-label={t('secrets.delete')}
        >
          <TlnIcon name="trash" size={13} />
        </Button>
      </div>
    </div>
  );
}
