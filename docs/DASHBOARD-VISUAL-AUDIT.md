# Dashboard Visual Audit

Prototype: `talon-sandbox-ui/.design-source/project/app/page-dashboard.jsx`
Current: `src/pages/PageDashboard.tsx`, `PageDashboard.css`, `Sparkline.tsx`

## A. Color assignment — KPI cards

- KPI 1 (运行中 sandbox): prototype passes no `color` prop → falls back to `var(--acc-strong)` [OK — current matches]
- KPI 2 (vCPU 占用): prototype passes no `color` prop → `var(--acc-strong)` [OK — current matches]
- KPI 3 (内存): prototype passes `color="var(--info)"` [OK — current matches]
- KPI 4 (出站流量): prototype passes `color="var(--info)"` [OK — current matches]
- User screenshot shows KPI 1/2 as olive/khaki and KPI 3/4 as light-blue — this is the rendered look of `--acc-strong` vs `--info` in light mode; token values are correct, no fix needed

## A2. Quota·24h — per-bar colors

- vCPU bar: prototype uses default (no `color` arg) → `var(--acc)` [OK — current passes no color]
- Memory bar: prototype uses default → `var(--acc)` [OK — current passes no color]
- Secret 访问 bar: prototype passes `color="var(--magenta)"` — current passes `style={{ '--tln-progress-color': 'var(--magenta)' }}` but `.fill` in the component uses `var(--acc)` hardcoded; the CSS var `--tln-progress-color` is NOT consumed anywhere in `@talon-sandbox/react` styles → **COLOR NOT APPLIED** [MUST FIX]
- 失败 bar: prototype passes `color="var(--err)"` — same problem: `--tln-progress-color` is not a real CSS variable that `.fill` reads → **COLOR NOT APPLIED** [MUST FIX]

## B. Sparkline rendering

- Current `fillOpacity={0.08}`: very subtle fill, nearly invisible
- Prototype `TlnSparkline` uses `opacity={0.14}` on the area path — already 75% higher than current
- User screenshot shows "prominent filled area (~25-30% opacity)" — significantly more visible than both
- **Fix**: bump to `0.20` (matches screenshot emphasis without being too heavy in dark mode)
- Prototype stroke: `strokeWidth={1.2}` — current: `strokeWidth="1.5"` [minor, SKIP — thicker is fine]

## C. Card padding, sizes, typography

- KPI digit `font-size: 28px` in both prototype and current — **match**
- `font-weight: 600` — **match**
- `.dash-metric .top .micro` font-size `10.5px`, letter-spacing `0.1em` — **match** (current uses 0.1em same as prototype)
- `.dash-metric .spark`: `height: 36px; margin-top: -6px;` — **match**
- Card padding: prototype uses `padding: 'var(--pad-card)'` on the card div (padded=false + explicit style); current uses `Card` component with default padding — functionally equivalent via `--pad-card` token — **match**
- `.dash-metric` gap: `14px` in both — **match**

## D. Layout grid

- `.dash-grid`: `repeat(4,1fr)`, `gap: 14px` — **match**
- `.dash-2col`: `1.4fr 1fr`, `gap: 14px`, `margin-top: 14px` — **match**
- Breakpoints: `1200px` for grid, `1100px` for 2col — **match**

## E. States overview

- `states-bar` height: prototype `8px`, current `8px` — **match** (fixed in prior commit)
- `states-bar` `border-radius`: prototype `4px`, current `3px` — **minor gap** [WILL FIX]
- `states-bar` background: prototype `var(--bg-3)`, current `var(--bg-2)` — **gap** [WILL FIX — bg-3 is darker/more visible fallback stripe]
- Legend grid: `repeat(4,1fr)` gap `8px 16px` — **match**
- Legend `.item` font-size: both `11.5px` — **match**

## F. Light mode (screenshot cross-check)

- KPI delta badge `.neut` uses `var(--fg-2)` / `var(--bg-3)` — matches prototype CSS
- Activity dot colors by kind — **match**
- ProgressBar `.fill` background falls through to `var(--acc)` for vCPU/Memory — correct
- ProgressBar `.fill` for Secret/Failure shows `var(--acc)` instead of magenta/red — **visual regression** (finding A2 above)

## Summary of findings to fix

| # | Finding | Severity |
|---|---------|----------|
| F1 | Sparkline fillOpacity 0.08 → 0.20 | HIGH |
| F2 | ProgressBar Secret 访问 — magenta color not applied | HIGH |
| F3 | ProgressBar 失败 — red color not applied | HIGH |
| F4 | states-bar border-radius 3px → 4px | LOW |
| F5 | states-bar background bg-2 → bg-3 | LOW |
