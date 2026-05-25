/* src/pages/_workers/WorkerStatusBadge.tsx
 * Inline status badge for a worker (healthy / draining / unhealthy).
 */
import type { WorkerDTO } from '../../api/types';

interface Props {
  status: WorkerDTO['status'];
  label: string;
}

const BG: Record<WorkerDTO['status'], string> = {
  healthy:   'var(--ok-soft)',
  draining:  'var(--warn-soft)',
  unhealthy: 'var(--err-soft)',
};

const COLOR: Record<WorkerDTO['status'], string> = {
  healthy:   'var(--ok)',
  draining:  'var(--warn)',
  unhealthy: 'var(--err)',
};

export function WorkerStatusBadge({ status, label }: Props) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 10.5,
      fontFamily: 'var(--font-mono)',
      padding: '2px 7px',
      borderRadius: 4,
      background: BG[status],
      color: COLOR[status],
    }}>
      {label}
    </span>
  );
}
