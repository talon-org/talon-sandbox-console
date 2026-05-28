/* src/components/InlineEmpty.tsx
 *
 * Lightweight inline empty state for "this card / sub-region has no content
 * right now". Distinct from the library EmptyState (which is reserved for
 * full-tab "first-time / actionable" empty states with a primary CTA).
 *
 * Two sizes:
 *   sm (80px)  — file-tree empty dir, "no secrets mounted", "no exposed ports"
 *   md (160px) — half-screen card body left intentionally blank (e.g. file
 *                preview pane before any file is picked).
 *
 * Visual choices:
 *   - dashed border using `var(--line)` (matches page palette, not the
 *     stronger `--line-strong` of actionable EmptyState).
 *   - sans-serif 13px `var(--fg-3)` — same font family as the rest of the
 *     page body, so the empty state doesn't look like a mono micro-label
 *     interruption.
 *   - icon optional, sized 16px, color `var(--fg-3)` — restrained.
 */
import type { ReactNode } from 'react';
import './InlineEmpty.css';

export interface InlineEmptyProps {
  /** Optional leading icon (a small svg from TlnIcon, typically 14–16px). */
  icon?: ReactNode;
  /** Primary message. Keep it to one short line. */
  children: ReactNode;
  /** sm (≈80px) for in-card sub-regions, md (≈160px) for half-screen panels. */
  size?: 'sm' | 'md';
  /** Optional inline action (e.g. retry, browse). Right of the message. */
  action?: ReactNode;
  /** Use the "error" tone — red icon + (when bordered) reddish border. */
  tone?: 'default' | 'error';
  /**
   * Draw the dashed border. Default is false: most callers sit inside a
   * Card or similar container that already provides a visual boundary, and
   * a second dashed border there reads as redundant nesting. Set to true
   * only when InlineEmpty is the *outermost* visual element of a region.
   */
  bordered?: boolean;
  className?: string;
}

export function InlineEmpty({
  icon,
  children,
  size = 'sm',
  action,
  tone = 'default',
  bordered = false,
  className,
}: InlineEmptyProps) {
  const cls = [
    'inline-empty',
    `inline-empty--${size}`,
    bordered ? 'inline-empty--bordered' : '',
    tone === 'error' ? 'inline-empty--error' : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} role={tone === 'error' ? 'alert' : undefined}>
      {icon && <span className="inline-empty__icon" aria-hidden="true">{icon}</span>}
      <span className="inline-empty__text">{children}</span>
      {action && <span className="inline-empty__action">{action}</span>}
    </div>
  );
}
