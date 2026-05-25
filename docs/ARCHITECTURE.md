# talon-sandbox-console — Architecture

## Overview

React 18 + Vite 5 + TypeScript 5 SaaS console for the Talon agent sandbox platform.
Authentication: JWT cookie (primary) + Bearer token fallback.
Router: `react-router-dom` v6 HashRouter.
State: Zustand (`src/store.ts`) for auth/session, `@tanstack/react-query` v5 for server state.

---

## Layer Map

```
src/
├── api/              Pure HTTP functions — no React, no hooks, no mock data
│   ├── client.ts     apiGet / apiPost / apiDelete / API_BASE / ApiError  (DO NOT MODIFY)
│   ├── types.ts      All backend DTOs (snake_case, matches Go JSON tags exactly)
│   ├── auth.ts       Auth endpoints  (DO NOT MODIFY)
│   ├── sandboxes.ts  /v1/sandboxes
│   ├── secrets.ts    /v1/secrets  (rotateSecret uses raw fetch — no apiPatch in client)
│   ├── workers.ts    /v1/admin/workers
│   ├── tenants.ts    /v1/admin/tenants
│   ├── recordings.ts /v1/recordings
│   ├── audit.ts      /v1/audit/events + SSE stream helper
│   └── dashboard.ts  /v1/metrics/dashboard
│
├── hooks/            React-query hooks wrapping api/ functions
│   ├── useSandboxes.ts   useQuery (10s refetch), useCreateSandbox, useDeleteSandbox
│   ├── useSandbox.ts     useQuery (5s refetch, enabled guard)
│   ├── useSecrets.ts     useQuery, useCreateSecret, useRotateSecret
│   ├── useWorkers.ts     useQuery (15s refetch)
│   ├── useTenants.ts     useQuery, useTenantDetail, useCreateTenant, useSuspendTenant
│   ├── useRecordings.ts  useQuery, useStartRecording, useStopRecording
│   ├── useAudit.ts       useAuditEvents (query) + useAuditStream (SSE, exp-backoff)
│   ├── useDashboard.ts   useQuery (30s refetch)
│   └── index.ts          barrel
│
├── components/       Shared UI atoms — composable, props-only, no business logic
│   ├── PageHeader.tsx    Wrapper over @talon-sandbox/react PageHeader
│   ├── StatCard.tsx      KPI card: animated count-up + inline SVG sparkline
│   ├── DataTable.tsx     Generic typed table (Column<T>) with skeleton loading
│   ├── EmptyState.tsx    loading / empty / error unified display
│   ├── Drawer.tsx        Wrapper over @talon-sandbox/react Drawer (default width 480)
│   ├── StatusPill.tsx    Sandbox/worker/tenant state pill (full state set incl. stopped/destroyed)
│   ├── ConfirmDialog.tsx Destructive action confirmation (wraps @talon-sandbox/react Dialog)
│   ├── CodeBlock.tsx     Wrapper over @talon-sandbox/react CodeBlock + optional label
│   ├── Toast.tsx         Re-exports toast / ToastViewport from @talon-sandbox/react
│   ├── Sparkline.tsx     SVG sparkline (standalone, also embedded in StatCard)
│   └── index.ts          barrel
│
├── i18n/
│   ├── strings.ts        Re-export shim (backward compat) → strings/index.ts
│   ├── strings/          Namespace files (one per page area)
│   │   ├── index.ts      Merges all namespaces into STRINGS record
│   │   ├── shell.ts      brand, sidebar, topbar, nav
│   │   ├── common.ts     shared action labels
│   │   ├── tweaks.ts     theme/density/language panel
│   │   ├── cmdk.ts       command palette
│   │   ├── dashboard.ts  overview page
│   │   ├── sandboxes.ts  sandbox list + create + detail tabs
│   │   ├── login.ts      authentication page
│   │   ├── secrets.ts    secrets management
│   │   ├── audit.ts      audit log
│   │   ├── workers.ts    worker nodes
│   │   ├── tenants.ts    workspaces admin
│   │   ├── recordings.ts session recordings
│   │   └── terminal.ts   PTY terminal
│   └── useT.ts           Custom hook — watches data-lang attribute on <html>
│
├── pages/            Page components — OWNED BY SIBLING AGENTS B / C / D
│   └── *.tsx         DO NOT touch from the foundation branch
│
├── layouts/
│   └── Shell.tsx     Authenticated shell layout  (DO NOT MODIFY)
│
├── store.ts          Zustand auth store: useApp / Me / setAuth / logout  (DO NOT MODIFY)
└── App.tsx           HashRouter + QueryClientProvider + Boot (only QueryClientProvider added)
```

---

## Data Flow

```
Page component
  └── useXxx()   (src/hooks/)
        └── useQuery / useMutation  (@tanstack/react-query)
              └── xxxApi()   (src/api/)
                    └── apiGet / apiPost / apiDelete  (src/api/client.ts)
                          └── fetch → backend /v1/...
```

For SSE (audit stream):

```
useAuditStream(onEvent, tenantId?)
  └── EventSource → /v1/audit/events/stream
        ├── onopen  → setConnected(true), reset backoff
        ├── onerror → close, schedule reconnect (exp-backoff: 1s→30s)
        └── 'audit' event → onEvent(parsed)
```

---

## Key Conventions

### Types
- All DTO types live in `src/api/types.ts`.
- Field names match Go handler JSON tags exactly (snake_case).
- `SandboxState` in `api/types.ts` extends the library's union with `'stopped' | 'destroyed'`.
- No `any`, no `@ts-ignore`, no `as never`.

### QueryClient (App.tsx)
```ts
new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } })
```
Individual hooks override `staleTime` / `refetchInterval` as needed.

### Query Keys
| Hook | Key |
|------|-----|
| useSandboxes | `['sandboxes']` |
| useSandbox(id) | `['sandboxes', id]` |
| useSecrets | `['secrets']` |
| useWorkers | `['workers']` |
| useTenants | `['tenants']` |
| useTenantDetail(id) | `['tenants', id]` |
| useRecordings(opts) | `['recordings', opts]` |
| useAuditEvents(params) | `['audit', params]` |
| useDashboard(tenantId?) | `['dashboard', tenantId]` |

Mutations invalidate their parent list key on success (e.g. `useCreateSandbox` invalidates `['sandboxes']`).

### rotateSecret special case
`client.ts` has no `apiPatch`. `rotateSecret` in `src/api/secrets.ts` uses raw `fetch()` with a
manual `Authorization: Bearer` header mirroring the client.ts pattern. If `apiPatch` is ever added
to `client.ts`, migrate `rotateSecret` to use it.

### i18n
- `useT()` returns `(key: string) => string` — resolves from `STRINGS[key][lang]`.
- `lang` is read from `document.documentElement.dataset.lang` (set by TweaksPanel).
- Never inline raw Chinese/English in components — always use `useT()`.
- Add new keys to the appropriate namespace file in `src/i18n/strings/`.

### Component rules
- Every file ≤ 200 lines.
- No business logic in `src/components/` — props-only.
- Use `@talon-sandbox/react` primitives (Button, Card, Badge, etc.) as the base layer.
- Inline styles use CSS custom properties (`var(--fg-1)`, `var(--acc)`, etc.) for theme support.

---

## Backend Gaps (as of 2026-05-25)

These fields are declared in `src/api/types.ts` but may be absent from backend responses
depending on the handler version. Pages should treat them as optional:

| DTO | Field | Note |
|-----|-------|------|
| `SecretDTO` | `last_rotated_at`, `used_by_count` | Not in initial handler |
| `TenantDTO` (list) | `active_sandboxes` | May be 0 if backend doesn't compute |
| `SandboxDTO` | `idle_timeout_seconds`, `pids_limit` | Optional in Go struct |
| `WorkerDTO` | `uptime_sec`, `last_error`, `region` | Added in worker v2 |

---

## What Sibling Agents Need to Do

Each page in `src/pages/` currently imports from the deleted `src/mock/data.ts`.
The sibling agents (B, C, D) must:

1. Remove all `import ... from '../mock/data'` lines.
2. Replace mock data with the appropriate hook from `src/hooks/`:
   - `PageDashboard` → `useDashboard()`
   - `PageSandboxes` → `useSandboxes()`
   - `PageSandboxDetail` → `useSandbox(id)`
   - `PageSecrets` → `useSecrets()`
   - `PageWorkers` → `useWorkers()`
   - `PageTenants` → `useTenants()` + `useTenantDetail(id)`
   - `PageAudit` → `useAuditEvents(params)` + `useAuditStream(onEvent)`
   - `PageRecordings` → `useRecordings(opts)`
   - `PageTerminal` → `useSandbox(id)` for metadata; `sandboxPtyUrl(id)` for WebSocket URL
   - `PageRecording` → `useRecordings()` for metadata + `@talon-sandbox/react` RecordingPlayer
3. Use `EmptyState` for loading/error/empty states.
4. Use `StatusPill` for state rendering.
5. Use `ConfirmDialog` for destructive confirmations (kill sandbox, rotate secret, suspend tenant).
6. Use `DataTable` for list pages (or `@talon-sandbox/react` Table — same Column<T> interface).
7. i18n: import keys from `src/i18n/strings/` namespace files, use `useT()` for all text.
