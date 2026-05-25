/* src/components/StatusPill.tsx
 * Color-coded badge for sandbox state, worker health, and tenant status.
 * Handles the full state set from api/types.ts (including stopped/destroyed
 * which are absent from @talon-sandbox/react's SandboxState union).
 * Usage:
 *   <StatusPill state="running" />
 *   <StatusPill state="failed" />
 *   <StatusPill workerStatus="draining" />
 *   <StatusPill tenantStatus="suspended" />
 */
import type { CSSProperties } from 'react';
import type { SandboxState } from '../api/types';

type WorkerStatus = 'healthy' | 'draining' | 'unhealthy';
type TenantStatus = 'active' | 'suspended';

interface StatusPillSandboxProps {
  state: SandboxState;
  workerStatus?: never;
  tenantStatus?: never;
}
interface StatusPillWorkerProps {
  state?: never;
  workerStatus: WorkerStatus;
  tenantStatus?: never;
}
interface StatusPillTenantProps {
  state?: never;
  workerStatus?: never;
  tenantStatus: TenantStatus;
}

type StatusPillProps = (StatusPillSandboxProps | StatusPillWorkerProps | StatusPillTenantProps) & {
  style?: CSSProperties;
};

interface PillStyle {
  label: string;
  bg: string;
  fg: string;
  dot?: boolean;
  pulse?: boolean;
}

const SANDBOX_STYLES: Record<SandboxState, PillStyle> = {
  'running':        { label: 'Running',       bg: 'var(--ok-muted)',   fg: 'var(--ok)',   dot: true, pulse: true },
  'pulling-image':  { label: 'Pulling',        bg: 'var(--acc-muted)',  fg: 'var(--acc)',  dot: true },
  'provisioning':   { label: 'Provisioning',   bg: 'var(--acc-muted)',  fg: 'var(--acc)',  dot: true },
  'idle':           { label: 'Idle',           bg: 'var(--border)',     fg: 'var(--fg-2)' },
  'paused':         { label: 'Paused',         bg: 'var(--border)',     fg: 'var(--fg-2)' },
  'terminating':    { label: 'Terminating',    bg: 'var(--warn-muted)', fg: 'var(--warn)', dot: true },
  'failed':         { label: 'Failed',         bg: 'var(--err-muted)',  fg: 'var(--err)' },
  'evicted':        { label: 'Evicted',        bg: 'var(--err-muted)',  fg: 'var(--err)' },
  'stopped':        { label: 'Stopped',        bg: 'var(--border)',     fg: 'var(--fg-3)' },
  'destroyed':      { label: 'Destroyed',      bg: 'var(--border)',     fg: 'var(--fg-3)' },
};

const WORKER_STYLES: Record<WorkerStatus, PillStyle> = {
  'healthy':   { label: 'Healthy',   bg: 'var(--ok-muted)',   fg: 'var(--ok)',   dot: true, pulse: true },
  'draining':  { label: 'Draining',  bg: 'var(--warn-muted)', fg: 'var(--warn)', dot: true },
  'unhealthy': { label: 'Unhealthy', bg: 'var(--err-muted)',  fg: 'var(--err)' },
};

const TENANT_STYLES: Record<TenantStatus, PillStyle> = {
  'active':    { label: 'Active',    bg: 'var(--ok-muted)',  fg: 'var(--ok)' },
  'suspended': { label: 'Suspended', bg: 'var(--err-muted)', fg: 'var(--err)' },
};

function resolvePill(props: StatusPillProps): PillStyle {
  if (props.state !== undefined) return SANDBOX_STYLES[props.state];
  if (props.workerStatus !== undefined) return WORKER_STYLES[props.workerStatus];
  return TENANT_STYLES[props.tenantStatus];
}

export function StatusPill(props: StatusPillProps) {
  const pill = resolvePill(props);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: pill.bg,
        color: pill.fg,
        whiteSpace: 'nowrap',
        ...props.style,
      }}
    >
      {pill.dot && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            animation: pill.pulse ? 'pulse 1.4s ease-in-out infinite' : undefined,
            flexShrink: 0,
          }}
        />
      )}
      {pill.label}
    </span>
  );
}
