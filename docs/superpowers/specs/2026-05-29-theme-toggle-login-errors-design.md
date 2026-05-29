# 主题切换图标 + 登录错误友好化 — 设计

日期: 2026-05-29
范围: talon-sandbox-console

## 背景

两个独立但相关的 UI 缺口:

1. **登录失败原文直出**。API key 登录失败时,页面直接显示后端原始报文,如
   `API 401: {"error":"unauthorized"}`。对用户不友好。
2. **主题无显式切换入口**。主题系统(暗/亮)其实已完整存在于
   [store.ts](../../../src/store.ts) 的 `setTweak('mode', ...)`,持久化到
   `localStorage` 的 `tln:v2:mode`,通过 `<html data-mode>` 生效。但只有 dev-only 的
   `TweaksPanel` 能切。需要在登录页右上角和 Layout 顶栏暴露一个 sun/moon 图标。

核心机制(切换 + 持久化 + 应用)已存在,本次**不重建**,只新增暴露入口与图标。

## 改动一:登录错误友好化

### 错误来源统一

当前错误来自两处,格式不一致:
- [client.ts](../../../src/api/client.ts) 的 `ApiError`(status + body),`apiGet/apiPost` 走这条。
- [auth.ts:51](../../../src/api/auth.ts) `apiGetWithToken` 里手写的
  `throw new Error(\`API ${status}: ...\`)`,**API key 登录正是走这条**。

改动:`apiGetWithToken` 改抛 `ApiError`,让全链路错误类型统一。

### 错误映射函数

新建 `src/api/errors.ts`,导出:

```ts
type LoginCtx = 'email' | 'apikey';
export function loginErrorKey(err: unknown, ctx: LoginCtx): string
```

返回 i18n key(不直接返回文案,保持 i18n 一致)。映射规则:

| 场景 | 判定 | i18n key |
|------|------|----------|
| API key 无效/过期 | `ApiError` status 401 且 ctx=apikey | `login.err.invalidKey` |
| 验证码错误/过期 | `ApiError` status 401\|400 且 ctx=email | `login.err.invalidCode` |
| 请求过于频繁 | status 429 | `login.err.rateLimited` |
| 服务器错误 | status >= 500 | `login.err.server` |
| 网络断开 | err 是 `TypeError`(fetch reject) | `login.err.network` |
| 其他未知 | 兜底 | `login.err.generic` |

(邮箱格式/未填 走本地校验,沿用现有 `setErr(t('login.email') + ' required')`,改为
`login.err.emailRequired`。)

401 判定**按当前 tab 区分**,不解析后端 error 字段——简单可靠,不依赖后端报文格式稳定。

### 登录页接入

[PageLogin.tsx](../../../src/pages/PageLogin.tsx) 三处 `setErr(ex instanceof Error ? ex.message : ...)`
(sendCode、submit 的 catch)改为 `setErr(t(loginErrorKey(ex, tab)))`。
sendCode 的本地校验改用 `login.err.emailRequired`。

## 改动二:主题切换组件

### 图标

[TlnIcon.tsx](../../../src/icons/TlnIcon.tsx) `PATHS` 新增 `sun` / `moon` 两个
Lucide 风格 16px stroke path,与现有 52 个图标同风格。

### ThemeToggle 共享组件

新建 `src/components/ThemeToggle.tsx`。理由:登录页和顶栏都要用,做成组件避免两处各自
实现(符合「跨页重复模式升级到组件」纪律)。

```tsx
export function ThemeToggle({ className }: { className?: string })
```

- 读 `useApp(s => s.mode)` 与 `setTweak`。
- 点击:`setTweak('mode', mode === 'dark' ? 'light' : 'dark')`。
- 显示:当前 dark 显示 sun(点了变亮)、当前 light 显示 moon(点了变暗)。
- `title` / `aria-label` 用 i18n `theme.toggle.toLight` / `theme.toggle.toDark`。
- 不自带定位,样式由调用方给(顶栏复用 `.ic-btn`,登录页用 fixed 容器)。

### 登录页接入

[PageLogin.tsx](../../../src/pages/PageLogin.tsx) 在 `LoginLayout` 内顶层加一个
fixed 右上角容器包 `<ThemeToggle>`。新增极小的 CSS(`.login-theme-toggle`,
`position: fixed; top; right; z-index`)到 PageLogin.css。

### 顶栏接入

[Shell.tsx](../../../src/layouts/Shell.tsx) `.topbar-actions` 内,bell/info/settings
之前插入 `<ThemeToggle className="ic-btn" />`,复用现有 `.ic-btn` 样式。

## 改动三:i18n

[login.ts](../../../src/i18n/strings/login.ts) 新增 7 条错误文案。
新建或复用 strings 文件加 2 条 toggle 文案(放 common 或新建 theme.ts)。

文案(中/英)见 PR 描述与下表:

| key | zh | en |
|-----|----|----|
| login.err.invalidKey | API key 无效或已过期,请检查后重试 | Invalid or expired API key. Check it and try again. |
| login.err.invalidCode | 验证码错误或已过期,请重新获取 | Code is incorrect or expired. Request a new one. |
| login.err.rateLimited | 操作太频繁,请稍后再试 | Too many attempts. Please wait a moment. |
| login.err.server | 服务器开小差了,请稍后重试 | Server error. Please try again later. |
| login.err.network | 无法连接服务器,请检查网络 | Can't reach the server. Check your connection. |
| login.err.generic | 登录失败,请重试 | Sign-in failed. Please try again. |
| login.err.emailRequired | 请输入邮箱地址 | Enter your email address. |
| theme.toggle.toLight | 切换到亮色 | Switch to light |
| theme.toggle.toDark | 切换到暗色 | Switch to dark |

## 测试 / 验收

- API key 填错 → 显示「API key 无效或已过期」,不再有 JSON。
- 验证码填错 → 显示「验证码错误或已过期」。
- 断网 → 「无法连接服务器」。
- 登录页右上角点 sun/moon → 整页明暗切换,刷新后保持(localStorage)。
- 顶栏图标点击 → 同上,与 TweaksPanel 状态一致。
- 中英文切换下文案都正确。

## 非目标 (YAGNI)

- 不做 prefers-color-scheme 自动跟随系统(现状默认 dark,保持)。
- 不动 9 种主题色(theme),只动 mode(暗/亮)。
- 不解析后端 error 字段做细分。
