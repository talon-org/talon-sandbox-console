/* src/components/StatCard.tsx
 * KPI card: micro label, animated value, optional limit, delta badge, sparkline.
 * Used by PageDashboard for the 4 top metric cards.
 * Usage:
 *   <StatCard micro="Running" value={18} delta="+3" deltaKind="neut" series={[...]} />
 */
import { useEffect, useState } from 'react';
import { Card } from '@talon-sandbox/react';

interface StatCardProps {
  micro: string;
  value: number;
  unit?: string;
  of?: number | string;
  delta?: string;
  deltaKind?: 'neut' | 'ok' | 'bad';
  series?: number[];
  color?: string;
  style?: React.CSSProperties;
}

function useAnimatedCount(target: number, duration = 700): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const ease = 1 - (1 - k) ** 3;
      setV(target * ease);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function StatCard({
  micro, value, unit, of: ofVal, delta, deltaKind = 'neut', series, color, style,
}: StatCardProps) {
  const animated = useAnimatedCount(value);
  const display = value >= 100
    ? Math.round(animated).toString()
    : animated.toFixed(1);

  return (
    <Card style={{ padding: 'var(--pad-card, 16px)', ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {micro}
          </span>
          {delta && (
            <span style={{
              fontSize: 11,
              color: deltaKind === 'bad' ? 'var(--err)' : deltaKind === 'ok' ? 'var(--ok)' : 'var(--fg-3)',
            }}>
              {delta}
            </span>
          )}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: 'var(--fg-1)' }}>
          {display}
          {unit && (
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg-3)', marginLeft: 4 }}>
              {unit}
            </span>
          )}
          {ofVal !== undefined && (
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg-3)' }}>
              {' / '}{ofVal}
            </span>
          )}
        </div>
        {series && series.length > 0 && (
          <svg
            viewBox={`0 0 ${series.length - 1} 30`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: 32, marginTop: 4 }}
            aria-hidden="true"
          >
            <polyline
              points={series
                .map((v, i) => {
                  const min = Math.min(...series);
                  const max = Math.max(...series);
                  const range = max - min || 1;
                  const y = 30 - ((v - min) / range) * 28;
                  return `${i},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={color ?? 'var(--acc)'}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </Card>
  );
}
