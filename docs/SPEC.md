# Talon Sandbox Console — 实现规约

> **Ground truth.** 由 explorer subagent 阅读 `talon-sandbox-ui/.design-source/project/app/` 全部 11 页原型 + shell + ui + i18n + icons + data 后产出。
>
> teammate **不允许偏离此规约**。任何"原型没规定的"判断必须在 PR 描述里写明,等 reviewer 确认。

---

## 全局

### 路由结构

使用 **`react-router-dom@^6` 的 `HashRouter`** (原型用 `window.location.hash` 自实现, 我们用标准库)。

| 路径 | 组件 | 模式 |
|---|---|---|
| `/login` | `PageLogin` | full-bleed (无 shell) |
| `/dashboard` | `PageDashboard` | in-shell |
| `/sandboxes` | `PageSandboxes` | in-shell |
| `/sandboxes/:id` | `PageSandboxDetail` | in-shell |
| `/sandboxes/:id/terminal` | `PageTerminal` | full-bleed |
| `/recordings` | `PageRecordings` | in-shell |
| `/recordings/:id` | `PageRecording` | full-bleed |
| `/secrets` | `PageSecrets` | in-shell |
| `/audit` | `PageAudit` | in-shell |
| `/workers` | `PageWorkers` | in-shell |
| `/tenants` | `PageTenants` | in-shell |

Full-bleed 页面 (login / terminal / recording): App 不渲染 Sidebar + TopBar, 只渲染页面内容 + `TweaksPanel` (来自 `@talon-sandbox/react`) + Toast viewport + CmdK overlay。

### 全局 Layout

`Shell.tsx`:
- `.app-shell`: `display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh`
- `<aside class="sidebar">`: 宽度 `var(--sidebar-w)`
- `<div class="main-pane">`: flex column, TopBar `height: var(--topbar-h)` + `.main-content` (overflow: auto)

**CSS 私有 tokens** (写在 `src/styles/private.css`, 不进 `@talon-sandbox/tokens`):
- `--sidebar-w: 220px`
- `--topbar-h: 48px`
- `--row-h: 44px`
- `--pad-card: 16px`
- `--ctrl-h-sm: 24px / --ctrl-h-md: 32px / --ctrl-h-lg: 40px`

### i18n

自写极简实现, **不上 i18next**:
- `src/i18n/strings.ts`: `{ key: { en, zh } }` 字典
- `src/i18n/useT.ts`: `useT()` hook, 返回 `(key) => string`, 监听 `document.documentElement[data-lang]` MutationObserver
- 默认 `zh`, 切换写 `localStorage.tln:v2:lang` + `document.documentElement.setAttribute('data-lang', lang)`
- key 总数 ~90, 见 explorer 输出 i18n.jsx 完整列表

### 主题 / Tweaks

5 维度: theme / mode / density / font / lang。完整选项见原型。

**重要决策 (我作为 lead 拍板):**
- **保留 TweaksPanel 浮层** (来自 `@talon-sandbox/react`) 但增加一个 `featureFlag` 控制可见性: 默认 closed beta 显示, public beta 前迁到 Settings 页
- 持久化 keys: `tln:v2:theme`, `tln:v2:mode`, `tln:v2:density`, `tln:v2:font`, `tln:v2:lang`
- 通过 `document.documentElement` `data-theme/data-mode/data-density/data-font/data-lang` 属性级联

### 全局 State (zustand)

```ts
type AppState = {
  authToken: string | null;
  me: { id: string; email: string; name: string; role: string; tenant_id: string } | null;
  tenantId: string;                    // 默认 me.tenant_id
  cmdkOpen: boolean;
  theme/mode/density/font/lang;        // 5 维度
};
```

登录: `POST /v1/auth/login` -> JWT cookie + `GET /v1/auth/me` 填 `me`, 失败回 `/login`。

### Icons

`src/icons/TlnIcon.tsx` console 私有 (**不进** `@talon-sandbox/react`, 避免污染组件库). 名字列表见 explorer 输出 (52 个 icon)。

`Mark` / `Wordmark` 两个品牌组件同位置。

---

## 11 页详细规约

按 explorer 输出原文照搬, 见下文。

[explorer 完整规约附后]
