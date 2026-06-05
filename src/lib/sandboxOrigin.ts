/* src/lib/sandboxOrigin.ts
 * sandbox 来源渠道（created_from）的视觉与文案统一来源。
 * 列表页"来源"列 pill 与详情页来源区共用，避免每个 page 各自造一套图标/配色映射。
 *
 *   icon  — TlnIcon name
 *   color — CSS 变量（pill 文字 + 边框/点用同色族，背景用 *-soft）
 *   key   — i18n 友好展示名（origin.*）
 *
 * 未知/缺失渠道走 ORIGIN_FALLBACK，渲染成中性灰 pill，文案兜底原始串。
 */
import type { SandboxOrigin } from '../api/types';

export interface OriginVisual {
  icon: string;     // TlnIcon name
  color: string;    // 主色 CSS 变量
  soft: string;     // 软背景 CSS 变量
  labelKey: string; // origin.* i18n key
}

// 渠道 → 视觉。SDK 各语言统一用 box 图标 + teal 色族，靠文案区分语言；
// console 用 command（控制台），cli 用 terminal，api 用 zap。
export const ORIGIN_VISUALS: Record<SandboxOrigin, OriginVisual> = {
  'web-console':    { icon: 'command',  color: 'var(--acc-strong, var(--acc))', soft: 'var(--acc-soft)',                          labelKey: 'origin.web-console' },
  'sdk-python':     { icon: 'box',      color: 'var(--info)',                    soft: 'var(--info-soft, rgba(96,165,250,0.12))',  labelKey: 'origin.sdk-python' },
  'sdk-go':         { icon: 'box',      color: 'var(--teal, #2dd4bf)',           soft: 'var(--teal-soft, rgba(45,212,191,0.12))',  labelKey: 'origin.sdk-go' },
  'sdk-typescript': { icon: 'box',      color: 'var(--info)',                    soft: 'var(--info-soft, rgba(96,165,250,0.12))',  labelKey: 'origin.sdk-typescript' },
  'sdk-rust':       { icon: 'box',      color: 'var(--warn)',                    soft: 'var(--warn-soft, rgba(245,158,11,0.12))',  labelKey: 'origin.sdk-rust' },
  'sdk-dotnet':     { icon: 'box',      color: 'var(--magenta, #c678dd)',        soft: 'var(--magenta-soft, rgba(198,120,221,0.12))', labelKey: 'origin.sdk-dotnet' },
  'cli':            { icon: 'terminal', color: 'var(--fg-1)',                    soft: 'var(--bg-3)',                              labelKey: 'origin.cli' },
  'api':            { icon: 'zap',      color: 'var(--fg-2)',                    soft: 'var(--bg-3)',                              labelKey: 'origin.api' },
};

export const ORIGIN_FALLBACK: OriginVisual = {
  icon: 'globe',
  color: 'var(--fg-3)',
  soft: 'var(--bg-3)',
  labelKey: 'origin.unknown',
};

/** 解析 created_from → 视觉配置；未知值回退到中性兜底。 */
export function resolveOrigin(origin?: string): OriginVisual {
  if (!origin) return ORIGIN_FALLBACK;
  return ORIGIN_VISUALS[origin as SandboxOrigin] ?? ORIGIN_FALLBACK;
}
