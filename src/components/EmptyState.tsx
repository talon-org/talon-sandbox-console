/* src/components/EmptyState.tsx
 * Unified loading / empty / error display for data-fetching pages.
 * Usage:
 *   <EmptyState variant="loading" />
 *   <EmptyState variant="empty" title="No sandboxes" action={<Button>New</Button>} />
 *   <EmptyState variant="error" title="Failed to load" message={err.message} />
 */
import type { ReactNode, CSSProperties } from 'react';

interface EmptyStateProps {
  variant: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  action?: ReactNode;
  style?: CSSProperties;
}

const ICON: Record<EmptyStateProps['variant'], string> = {
  loading: '⟳',
  empty: '○',
  error: '✕',
};

const ICON_COLOR: Record<EmptyStateProps['variant'], string> = {
  loading: 'var(--fg-3)',
  empty: 'var(--fg-3)',
  error: 'var(--err)',
};

const DEFAULT_TITLE: Record<EmptyStateProps['variant'], string> = {
  loading: 'Loading…',
  empty: 'Nothing here yet',
  error: 'Something went wrong',
};

export function EmptyState({ variant, title, message, action, style }: EmptyStateProps) {
  const displayTitle = title ?? DEFAULT_TITLE[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      aria-busy={variant === 'loading' ? true : undefined}
      aria-live={variant === 'loading' ? 'polite' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '64px 24px',
        textAlign: 'center',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: 32,
          color: ICON_COLOR[variant],
          display: 'block',
          lineHeight: 1,
          animation: variant === 'loading' ? 'spin 1s linear infinite' : undefined,
        }}
      >
        {ICON[variant]}
      </span>
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--fg-1)', fontSize: 15 }}>
          {displayTitle}
        </p>
        {message && (
          <p style={{ margin: '6px 0 0', color: 'var(--fg-3)', fontSize: 13, maxWidth: 360 }}>
            {message}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
