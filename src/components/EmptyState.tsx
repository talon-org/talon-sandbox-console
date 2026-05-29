/* src/components/EmptyState.tsx
 * Thin wrapper over @talon-sandbox/react EmptyState that adds a variant system
 * for the three standard data-fetching states: loading, empty, error.
 *
 * Usage — variant shorthand:
 *   <EmptyState variant="loading" />
 *   <EmptyState variant="empty" title="No sandboxes" action={<Button>New</Button>} />
 *   <EmptyState variant="error" title="Failed to load" message={err.message} />
 *
 * Usage — pass-through (no variant):
 *   <EmptyState title="…" description="…" icon={<Icon />} action={…} />
 */
import type { ReactNode, CSSProperties } from 'react';
import {
  EmptyState as TlnEmptyState,
  EmptyStateIcon,
  EmptyStateEyebrow,
  EmptyStateHeading,
  EmptyStateDescription,
  EmptyStateActions,
} from '@talon-sandbox/react';
import { TlnIcon } from '../icons/TlnIcon';

import './EmptyState.css';

// ── Preset config ─────────────────────────────────────────────────────────────

type Variant = 'loading' | 'empty' | 'error';

// Preset 图标用 TlnIcon 描边图标 + 视觉容器,与全站图标体系一致。
const PRESET_ICON: Record<Variant, ReactNode> = {
  loading: (
    <span className="es-preset-icon es-preset-icon--loading" aria-hidden="true">
      <TlnIcon name="refresh" size={32} />
    </span>
  ),
  empty: (
    <span className="es-preset-icon" aria-hidden="true">
      <TlnIcon name="box" size={32} />
    </span>
  ),
  error: (
    <span className="es-preset-icon es-preset-icon--error" aria-hidden="true">
      <TlnIcon name="alert" size={32} />
    </span>
  ),
};

const PRESET_TITLE: Record<Variant, string> = {
  loading: 'Loading…',
  empty:   'Nothing here yet',
  error:   'Something went wrong',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmptyStateVariantProps {
  /** Activates preset icon + title. Adds aria-busy / aria-live / role="alert". */
  variant: Variant;
  /** Overrides the preset title. */
  title?: ReactNode;
  /** Description text rendered below the title (alias: message). */
  description?: ReactNode;
  /** Backward-compat alias for description. */
  message?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

interface EmptyStateBaseProps {
  variant?: never;
  title: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export type EmptyStateProps = EmptyStateVariantProps | EmptyStateBaseProps;

// ── Component ─────────────────────────────────────────────────────────────────

export function EmptyState(props: EmptyStateProps) {
  const { variant, style, className } = props as EmptyStateVariantProps & EmptyStateBaseProps;

  const desc       = props.description ?? (props as EmptyStateVariantProps).message;
  const title      = props.title      ?? (variant ? PRESET_TITLE[variant]  : undefined);
  const icon       = (props as EmptyStateBaseProps).icon ?? (variant ? PRESET_ICON[variant] : undefined);
  const eyebrow    = (props as EmptyStateBaseProps).eyebrow;
  const action     = props.action;

  const inner = (
    <TlnEmptyState className={className} style={style}>
      {icon     && <EmptyStateIcon>{icon}</EmptyStateIcon>}
      {eyebrow  && <EmptyStateEyebrow>{eyebrow}</EmptyStateEyebrow>}
      {title    && <EmptyStateHeading>{title}</EmptyStateHeading>}
      {desc     && <EmptyStateDescription>{desc}</EmptyStateDescription>}
      {action   && <EmptyStateActions>{action}</EmptyStateActions>}
    </TlnEmptyState>
  );

  if (!variant) return inner;

  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      aria-busy={variant === 'loading' ? true : undefined}
      aria-live={variant === 'loading' ? 'polite' : undefined}
    >
      {inner}
    </div>
  );
}
