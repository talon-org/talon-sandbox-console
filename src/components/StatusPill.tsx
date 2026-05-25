/* src/components/StatusPill.tsx
 * Color-coded badge for sandbox state, worker health, and tenant status.
 * Delegates rendering to @talon-sandbox/react Badge.
 * Covers the full SandboxState union from api/types.ts, including 'stopped' and
 * 'destroyed' which are absent from the design-system SandboxState type.
 *
 * Usage:
 *   <StatusPill state="running" />
 *   <StatusPill state="failed" />
 *   <StatusPill workerStatus="draining" />
 *   <StatusPill tenantStatus="suspended" />
 */
import type { CSSProperties } from 'react';
import { Badge } from '@talon-sandbox/react';
import type { BadgeVariant } from '@talon-sandbox/react';
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

export type StatusPillProps = (
  | StatusPillSandboxProps
  | StatusPillWorkerProps
  | StatusPillTenantProps
) & { style?: CSSProperties };

// ── State → Badge variant + dot map ──────────────────────────────────────────

interface PillConfig {
  variant: BadgeVariant;
  dot: boolean;
  label: string;
}

const SANDBOX_CONFIG: Record<SandboxState, PillConfig> = {
  'running':       { variant: 'success', dot: true,  label: 'Running' },
  'pulling-image': { variant: 'info',    dot: true,  label: 'Pulling' },
  'provisioning':  { variant: 'info',    dot: true,  label: 'Provisioning' },
  'idle':          { variant: 'neutral', dot: false, label: 'Idle' },
  'paused':        { variant: 'neutral', dot: false, label: 'Paused' },
  'terminating':   { variant: 'warning', dot: true,  label: 'Terminating' },
  'failed':        { variant: 'danger',  dot: false, label: 'Failed' },
  'evicted':       { variant: 'danger',  dot: false, label: 'Evicted' },
  'stopped':       { variant: 'neutral', dot: false, label: 'Stopped' },
  'destroyed':     { variant: 'neutral', dot: false, label: 'Destroyed' },
};

const WORKER_CONFIG: Record<WorkerStatus, PillConfig> = {
  'healthy':   { variant: 'success', dot: true,  label: 'Healthy' },
  'draining':  { variant: 'warning', dot: true,  label: 'Draining' },
  'unhealthy': { variant: 'danger',  dot: false, label: 'Unhealthy' },
};

const TENANT_CONFIG: Record<TenantStatus, PillConfig> = {
  'active':    { variant: 'success', dot: false, label: 'Active' },
  'suspended': { variant: 'danger',  dot: false, label: 'Suspended' },
};

function resolveConfig(props: StatusPillProps): PillConfig {
  if ((props as StatusPillSandboxProps).state !== undefined)
    return SANDBOX_CONFIG[(props as StatusPillSandboxProps).state];
  if ((props as StatusPillWorkerProps).workerStatus !== undefined)
    return WORKER_CONFIG[(props as StatusPillWorkerProps).workerStatus];
  return TENANT_CONFIG[(props as StatusPillTenantProps).tenantStatus];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatusPill(props: StatusPillProps) {
  const { variant, dot, label } = resolveConfig(props);
  return (
    <Badge variant={variant} dot={dot} style={props.style}>
      {label}
    </Badge>
  );
}
