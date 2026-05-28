/* Sparkline — lightweight SVG polyline chart for metric cards.
 * Renders a single line + subtle fill against transparent background.
 */
import type { CSSProperties } from 'react';

interface SparklineProps {
  data: number[];
  height?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Sparkline({ data, height = 36, color = 'var(--acc-strong)', className, style }: SparklineProps) {
  const w = 100; // viewBox width (percent-based)
  const h = height;

  // Empty state: render a dim dashed mid-line so the metric card keeps its
  // visual rhythm instead of collapsing. Avoids the layout shift caused by
  // returning null when a series happens to be empty.
  if (!data || data.length < 2) {
    const midY = (h / 2).toFixed(2);
    return (
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <line
          x1="0" y1={midY} x2={w} y2={midY}
          stroke="var(--fg-4, var(--fg-3))"
          strokeWidth="1"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h * 0.8) - h * 0.1;
    return `${x},${y.toFixed(2)}`;
  });

  const polyline = pts.join(' ');
  const first = pts[0];
  const last  = pts[pts.length - 1];
  // close fill path along the bottom
  const fillPath = `M ${first} L ${polyline} L ${last.split(',')[0]},${h} L 0,${h} Z`;

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* 填充区域透明度与原型保持一致（0.20），视觉上形成明显的面积感 */}
      <path d={fillPath} fill={color} fillOpacity={0.20} />
      {/* line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
