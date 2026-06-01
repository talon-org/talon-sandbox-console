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
  'reserving':     { variant: 'info',  dot: true,  labelKey: 'state.reserving' },
  'terminating':   { variant: 'warn',  dot: true,  labelKey: 'state.terminating' },
  'failed':        { variant: 'err',   dot: false, labelKey: 'state.failed' },
  'evicted':       { variant: 'err',   dot: false, labelKey: 'state.evicted' },
  'killed':        { variant: 'err',   dot: false, labelKey: 'state.killed' },
  'lost':          { variant: 'err',   dot: false, labelKey: 'state.lost' },
  'stopped':       { variant: 'muted', dot: false, labelKey: 'state.stopped' },
  'exited':        { variant: 'muted', dot: false, labelKey: 'state.exited' },
  'destroyed':     { variant: 'muted', dot: false, labelKey: 'state.destroyed' },
  'unknown':       { variant: 'muted', dot: false, labelKey: 'state.unknown' },
};

// 未知 state 的兜底:即便后端将来再加新 state、字典一时没跟上,也只渲染成一个
// 中性徽章而非整页崩溃(之前 destructure undefined.variant 直接抛错炸掉详情页)。
const FALLBACK: PillVisual = { variant: 'muted', dot: false, labelKey: '' };

const WORKER_CONFIG: Record<WorkerStatus, PillVisual> = {
  'healthy':   { variant: 'ok',   dot: true,  labelKey: 'worker.healthy' },
  'draining':  { variant: 'warn', dot: true,  labelKey: 'worker.draining' },
  'unhealthy': { variant: 'err',  dot: false, labelKey: 'worker.unhealthy' },
};

const TENANT_CONFIG: Record<TenantStatus, PillVisual> = {
  'active':    { variant: 'ok',  dot: false, labelKey: 'tenant.active' },
  'suspended': { variant: 'err', dot: false, labelKey: 'tenant.suspended' },
};

// resolveConfig 返回 [视觉, 原始值] —— 原始值在字典未命中时作为兜底显示文本。
function resolveConfig(props: StatusPillProps): [PillVisual, string] {
  const s = (props as StatusPillSandboxProps).state;
  if (s !== undefined) return [SANDBOX_CONFIG[s] ?? FALLBACK, s];
  const w = (props as StatusPillWorkerProps).workerStatus;
  if (w !== undefined) return [WORKER_CONFIG[w] ?? FALLBACK, w];
  const tt = (props as StatusPillTenantProps).tenantStatus;
  return [TENANT_CONFIG[tt] ?? FALLBACK, tt];
}

export function StatusPill(props: StatusPillProps) {
  const t = useT();
  const [{ variant, dot, labelKey }, raw] = resolveConfig(props);
  // labelKey 为空(未知 state 兜底)时直接显示原始值,不查 i18n。
  const label = labelKey ? t(labelKey) : raw;
  return (
    <Badge variant={variant} dot={dot} style={props.style}>
      {label}
    </Badge>
  );
}
