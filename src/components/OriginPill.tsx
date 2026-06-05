/* src/components/OriginPill.tsx
 * sandbox 来源渠道 pill —— 列表页"来源"列与详情页来源区共用。
 * 图标 + 配色 + 文案统一从 lib/sandboxOrigin 取，不在各 page 重复造。
 * 空值由调用方决定是否渲染（列表里空显示"—"，不渲染本组件）。
 */
import type { CSSProperties } from 'react';
import { TlnIcon } from '../icons/TlnIcon';
import { useT } from '../i18n/useT';
import { resolveOrigin } from '../lib/sandboxOrigin';

interface OriginPillProps {
  origin?: string;
  /** sm = 列表列内紧凑形态；md = 详情区稍大 */
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

export function OriginPill({ origin, size = 'sm', style }: OriginPillProps) {
  const t = useT();
  const v = resolveOrigin(origin);
  const iconSize = size === 'sm' ? 11 : 12;
  const fontSize = size === 'sm' ? 10.5 : 11.5;
  const label = t(v.labelKey, origin ?? '');
  return (
    <span
      className="origin-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: size === 'sm' ? '2px 7px' : '3px 9px',
        borderRadius: 'var(--r-1)',
        background: v.soft,
        color: v.color,
        fontFamily: 'var(--font-mono)',
        fontSize,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={label}
    >
      <TlnIcon name={v.icon} size={iconSize} />
      {label}
    </span>
  );
}
