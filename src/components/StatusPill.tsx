/* src/components/StatusPill.tsx
 * Color-coded badge for sandbox state, worker health, and tenant status.
 * Delegates rendering to @talon-sandbox/react Badge; label comes from i18n.
 *
 * Usage:
 *   <StatusPill state="running" />
 *   <StatusPill workerStatus="draining" />
 *   <StatusPill tenantStatus="suspended" />
 */
import type { CSSProperties } from 'react';
import { Badge } from '@talon-sandbox/react';
import type { BadgeVariant } from '@talon-sandbox/react';
import type { SandboxState } from '../api/types';
import { useT } from '../i18n/useT';

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

interface PillVisual {
  variant: BadgeVariant;
  dot: boolean;
  /** i18n key — resolved at render via useT() */
  labelKey: string;
}

// variant 必须是 ui-lib Badge 的合法值:info|magenta|teal|default|muted|ok|warn|err
// (不是 success/danger/warning/neutral —— 那些是非法值,会渲染成无色默认徽章)
const SANDBOX_CONFIG: Record<SandboxState, PillVisual> = {
  'created':       { variant: 'info',  dot: true,  labelKey: 'state.created' },
  'running':       { variant: 'ok',    dot: true,  labelKey: 'state.running' },
  'pulling-image': { variant: 'info',  dot: true,  labelKey: 'state.pulling-image' },
  'provisioning':  { variant: 'info',  dot: true,  labelKey: 'state.provisioning' },
  'idle':          { variant: 'muted', dot: false, labelKey: 'state.idle' },
  'paused':        { variant: 'muted', dot: false, labelKey: 'state.paused' },
  'terminating':   { variant: 'warn',  dot: true,  labelKey: 'state.terminating' },
  'failed':        { variant: 'err',   dot: false, labelKey: 'state.failed' },
  'evicted':       { variant: 'err',   dot: false, labelKey: 'state.evicted' },
  'stopped':       { variant: 'muted', dot: false, labelKey: 'state.stopped' },
  'destroyed':     { variant: 'muted', dot: false, labelKey: 'state.destroyed' },
};

const WORKER_CONFIG: Record<WorkerStatus, PillVisual> = {
  'healthy':   { variant: 'ok',   dot: true,  labelKey: 'worker.healthy' },
  'draining':  { variant: 'warn', dot: true,  labelKey: 'worker.draining' },
  'unhealthy': { variant: 'err',  dot: false, labelKey: 'worker.unhealthy' },
};

const TENANT_CONFIG: Record<TenantStatus, PillVisual> = {
  'active':    { variant: 'ok',  dot: false, labelKey: 'tenant.active' },
  'suspended': { variant: 'err', dot: false, labelKey: 'tenant.suspended' },
};

function resolveConfig(props: StatusPillProps): PillVisual {
  if ((props as StatusPillSandboxProps).state !== undefined)
    return SANDBOX_CONFIG[(props as StatusPillSandboxProps).state];
  if ((props as StatusPillWorkerProps).workerStatus !== undefined)
    return WORKER_CONFIG[(props as StatusPillWorkerProps).workerStatus];
  return TENANT_CONFIG[(props as StatusPillTenantProps).tenantStatus];
}

export function StatusPill(props: StatusPillProps) {
  const t = useT();
  const { variant, dot, labelKey } = resolveConfig(props);
  return (
    <Badge variant={variant} dot={dot} style={props.style}>
      {t(labelKey)}
    </Badge>
  );
}
