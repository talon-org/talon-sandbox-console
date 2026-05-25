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
import { EmptyState as TlnEmptyState } from '@talon-sandbox/react';

// ── Preset config ─────────────────────────────────────────────────────────────

type Variant = 'loading' | 'empty' | 'error';

const PRESET_ICON: Record<Variant, ReactNode> = {
  loading: (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        fontSize: 28,
        color: 'var(--fg-3)',
        animation: 'tln-spin 1s linear infinite',
      }}
    >
      ⟳
    </span>
  ),
  empty: (
    <span aria-hidden="true" style={{ fontSize: 28, color: 'var(--fg-3)' }}>
      ○
    </span>
  ),
  error: (
    <span aria-hidden="true" style={{ fontSize: 28, color: 'var(--err)' }}>
      ✕
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
    <TlnEmptyState
      eyebrow={eyebrow}
      icon={icon}
      title={title!}
      description={desc}
      action={action}
      className={className}
      style={style}
    />
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
