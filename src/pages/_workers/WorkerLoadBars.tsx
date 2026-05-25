/* src/pages/_workers/WorkerLoadBars.tsx
 * Three load bars (CPU / MEM / DSK) for a single worker row.
 */
import { ProgressBar } from '@talon-sandbox/react';

interface Props {
  cpu:  number;
  mem:  number;
  disk: number;
}

const loadCls = (n: number): string => (n >= 90 ? 'hot' : n >= 70 ? 'warm' : '');
const loadColor = (n: number, base: string): string =>
  n >= 90 ? 'var(--err)' : n >= 70 ? 'var(--warn)' : base;

export function WorkerLoadBars({ cpu, mem, disk }: Props) {
  const bars: Array<{ lbl: string; val: number; base: string }> = [
    { lbl: 'CPU', val: cpu,  base: 'var(--ok)' },
    { lbl: 'MEM', val: mem,  base: 'var(--info)' },
    { lbl: 'DSK', val: disk, base: 'var(--info)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {bars.map(({ lbl, val, base }) => (
        <div key={lbl} className="loads">
          <span className="llbl">{lbl}</span>
          <ProgressBar
            value={val}
            max={100}
            style={{ '--tln-progress-color': loadColor(val, base) } as React.CSSProperties}
          />
          <span className={'lval ' + loadCls(val)}>{val}%</span>
        </div>
      ))}
    </div>
  );
}
