/* Console-private icons. Not exported from @talon-sandbox/react to avoid
 * polluting the component library. 52 Lucide-style 16px stroke icons.
 */
import type { CSSProperties, ReactNode } from 'react';

type IconPaths = ReactNode;

const PATHS: Record<string, IconPaths> = {
  // nav
  home: <><path d="M3 9l5-5 5 5v5a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" /></>,
  box: <><path d="M2.5 4.5L8 2l5.5 2.5M2.5 4.5L8 7M2.5 4.5v6.5L8 13.5M13.5 4.5L8 7M13.5 4.5v6.5L8 13.5M8 7v6.5" /></>,
  image: <><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><circle cx="6" cy="6.5" r="1" /><path d="M13.5 10l-3-3-6 5.5" /></>,
  key: <><circle cx="5.5" cy="10.5" r="2.5" /><path d="M7.5 8.5l5-5M10 5l1.5 1.5M11.5 3.5L13 5" /></>,
  scroll: <><path d="M3 3h7a2 2 0 012 2v8a2 2 0 002-2V5" /><path d="M3 3v9a1 1 0 001 1h7" /><path d="M5.5 6h5M5.5 9h3" /></>,
  server: <><rect x="2" y="3" width="12" height="4" rx="1" /><rect x="2" y="9" width="12" height="4" rx="1" /><circle cx="5" cy="5" r="0.5" fill="currentColor" /><circle cx="5" cy="11" r="0.5" fill="currentColor" /></>,
  users: <><circle cx="6" cy="6" r="2.5" /><path d="M1.5 13.5c0-2 2-3.5 4.5-3.5s4.5 1.5 4.5 3.5" /><circle cx="11.5" cy="5.5" r="2" /><path d="M14.5 13.5c0-1.6-1.4-2.7-3.2-3" /></>,
  terminal: <><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><path d="M4 6l2.5 2L4 10M7.5 10h4" /></>,
  film: <><rect x="2" y="2.5" width="12" height="11" rx="1" /><path d="M5 2.5v11M11 2.5v11M2 5.5h3M2 8h3M2 10.5h3M11 5.5h3M11 8h3M11 10.5h3" /></>,
  // action
  plus: <><path d="M8 3v10M3 8h10" /></>,
  search: <><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>,
  x: <><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></>,
  check: <><path d="M3 8l3.5 3.5L13 5" /></>,
  chevronDown: <><path d="M4 6l4 4 4-4" /></>,
  chevronRight: <><path d="M6 4l4 4-4 4" /></>,
  chevronUp: <><path d="M4 10l4-4 4 4" /></>,
  arrowRight: <><path d="M3 8h10M9 4l4 4-4 4" /></>,
  arrowUpRight: <><path d="M5 11l6-6M5.5 5h5.5v5.5" /></>,
  more: <><circle cx="3.5" cy="8" r="1" fill="currentColor" /><circle cx="8" cy="8" r="1" fill="currentColor" /><circle cx="12.5" cy="8" r="1" fill="currentColor" /></>,
  refresh: <><path d="M2 7a6 6 0 0110.5-3M14 9a6 6 0 01-10.5 3" /><path d="M11 4h2.5V1.5M5 12H2.5v2.5" /></>,
  pause: <><rect x="4" y="3" width="2.5" height="10" rx="0.5" /><rect x="9.5" y="3" width="2.5" height="10" rx="0.5" /></>,
  play: <><path d="M4 3l9 5-9 5z" /></>,
  stop: <><rect x="3.5" y="3.5" width="9" height="9" rx="1" /></>,
  copy: <><rect x="5" y="5" width="8.5" height="8.5" rx="1" /><path d="M3 9.5V3a.5.5 0 01.5-.5H10" /></>,
  external: <><path d="M9 2.5h4.5V7M13.5 2.5L7.5 8.5" /><path d="M11.5 9v3.5a1 1 0 01-1 1H3.5a1 1 0 01-1-1V5.5a1 1 0 011-1H7" /></>,
  download: <><path d="M8 2v9M4.5 7.5L8 11l3.5-3.5M3 13.5h10" /></>,
  upload: <><path d="M8 11V2M4.5 5.5L8 2l3.5 3.5M3 13.5h10" /></>,
  filter: <><path d="M2 3.5h12M4 7.5h8M6 11.5h4" /></>,
  sort: <><path d="M5 3v10M5 13l-2-2M5 13l2-2M11 13V3M11 3l-2 2M11 3l2 2" /></>,
  eye: <><path d="M1 8c1.5-2.5 4-4.5 7-4.5S13.5 5.5 15 8c-1.5 2.5-4 4.5-7 4.5S2.5 10.5 1 8z" /><circle cx="8" cy="8" r="2" /></>,
  eyeOff: <><path d="M3.5 4l9 8M4 7c-.7.6-1.3 1.3-2 2 1.5 2.5 4 4.5 7 4.5 1.2 0 2.3-.3 3.3-.8M12 11c.7-.6 1.3-1.3 2-3-1.5-2.5-4-4.5-7-4.5-.6 0-1.2.1-1.7.2" /><circle cx="8" cy="8" r="2" /></>,
  lock: <><rect x="3" y="7" width="10" height="6.5" rx="1.5" /><path d="M5 7V5a3 3 0 016 0v2" /></>,
  shield: <><path d="M8 2l5 1.5v4c0 2.8-2.2 5.4-5 6-2.8-.6-5-3.2-5-6V3.5L8 2z" /></>,
  alert: <><path d="M8 2L1.5 13.5h13L8 2z" /><path d="M8 6.5v3M8 11.5v0.5" strokeLinecap="round" /></>,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7v4M8 5v.5" /></>,
  zap: <><path d="M9 1L3 9h4l-1 6 6-8H8l1-6z" /></>,
  cpu: <><rect x="3" y="3" width="10" height="10" rx="1" /><rect x="5.5" y="5.5" width="5" height="5" /><path d="M3 6h-1.5M3 10h-1.5M14.5 6H13M14.5 10H13M6 3V1.5M10 3V1.5M6 14.5V13M10 14.5V13" /></>,
  memory: <><rect x="2" y="4" width="12" height="8" rx="1" /><path d="M5 7v2M8 7v2M11 7v2M4 4V2.5M12 4V2.5" /></>,
  network: <><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 1.6 3 4 3 6s-1 4.4-3 6c-2-1.6-3-4-3-6s1-4.4 3-6z" /></>,
  globe: <><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2.5 2 2.5 10 0 12M8 2c-2.5 2-2.5 10 0 12" /></>,
  bell: <><path d="M4 6.5a4 4 0 018 0V10l1 2H3l1-2V6.5z" /><path d="M6.5 13.5a1.5 1.5 0 003 0" /></>,
  command: <><path d="M5.5 2A1.5 1.5 0 004 3.5v2.5h2.5V3.5A1.5 1.5 0 005.5 2zM10.5 14a1.5 1.5 0 011.5-1.5V10H9.5v2.5A1.5 1.5 0 0110.5 14zM2 10.5A1.5 1.5 0 013.5 9H6v2.5H3.5A1.5 1.5 0 012 10.5zM14 5.5A1.5 1.5 0 0112.5 7H10V4.5h2.5A1.5 1.5 0 0114 5.5zM6 6h4v4H6z" /></>,
  settings: <><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M3 8H1M15 8h-2M3.5 3.5L5 5M11 11l1.5 1.5M3.5 12.5L5 11M11 5l1.5-1.5" /></>,
  logout: <><path d="M9 11l3-3-3-3M12 8H4.5M7.5 3.5H4A1.5 1.5 0 002.5 5v6A1.5 1.5 0 004 12.5h3.5" /></>,
  user: <><circle cx="8" cy="6" r="2.5" /><path d="M2.5 14c.5-2.5 2.8-4 5.5-4s5 1.5 5.5 4" /></>,
  fileText: <><path d="M3.5 1.5h6L13 5v9a1 1 0 01-1 1H3.5a1 1 0 01-1-1V2.5a1 1 0 011-1z" /><path d="M9 1.5V5h4M5 8h6M5 10.5h6M5 13h4" /></>,
  folder: <><path d="M2 4a1 1 0 011-1h3l1.5 1.5h5.5a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" /></>,
  gitBranch: <><circle cx="5" cy="3" r="1.5" /><circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="6" r="1.5" /><path d="M5 4.5v7M5 8c0-2 2-2 4-2" /></>,
  clock: <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>,
  trash: <><path d="M3 5h10M5 5V3.5a1 1 0 011-1h4a1 1 0 011 1V5M4 5l.5 8a1 1 0 001 1h5a1 1 0 001-1L12 5" /></>,
  dot: <><circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" /></>,
  tag: <><path d="M2.5 7.5V3a.5.5 0 01.5-.5h4.5L13.5 9a1 1 0 010 1.4L10.4 13.5a1 1 0 01-1.4 0L2.5 7.5z" /><circle cx="5.5" cy="5.5" r="1" /></>,
  flame: <><path d="M8 14c-2.5 0-4-2-4-4 0-2 1-3 1-5 0 0 2 1 2 3 0-2 1.5-3.5 2-5 1 2 4 3 4 7 0 2-2 4-5 4z" /></>,
  agent: <><path d="M3.5 6.5L8 2l4.5 4.5M8 2v8M3 13.5h10" /></>,
  // theme toggle
  sun: <><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" /></>,
  moon: <><path d="M13.5 9.5A6 6 0 016.5 2.5a6 6 0 107 7z" /></>,
};

interface TlnIconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export function TlnIcon({ name, size = 16, stroke = 1.5, className, style }: TlnIconProps) {
  const path = PATHS[name];
  if (!path) {
    return (
      <span
        style={{ display: 'inline-block', width: size, height: size, border: '1px dashed currentColor', opacity: 0.4, flex: '0 0 auto', ...style }}
        title={'missing:' + name}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: '0 0 auto', ...style }}
    >
      {path}
    </svg>
  );
}

interface MarkProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Mark({ size = 14, className, style }: MarkProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        background: 'var(--acc)',
        clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
        flex: '0 0 auto',
        ...style,
      }}
    />
  );
}
