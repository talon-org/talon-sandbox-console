# Architecture Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild talon-sandbox-console's foundation layer — api clients, react-query hooks, shared UI components, and i18n namespace split — so sibling agents B/C/D can rewrite pages on top of a clean, typed, mock-free architecture.

**Architecture:** HTTP API layer (`src/api/`) contains pure functions wrapping `apiGet/apiPost/apiDelete`. React-query hooks (`src/hooks/`) wrap those functions and own all cache invalidation. UI components (`src/components/`) are pure-prop composable atoms with no business logic. Pages are left intentionally broken where they import mock data.

**Tech Stack:** React 18, Vite 5, TypeScript 5, @tanstack/react-query v5, zustand, existing `@talon-sandbox/react` component library.

---

## Pre-flight: understand the repo

Before starting any task, read these files once:
- `/Users/dark/WebstormProjects/talon-sandbox-console/src/api/client.ts` — `apiGet`, `apiPost`, `apiDelete` signatures
- `/Users/dark/WebstormProjects/talon-sandbox-console/src/api/auth.ts` — existing auth wrappers (do NOT modify)
- `/Users/dark/WebstormProjects/talon-sandbox-console/src/store.ts` — `Me` type, `useApp` shape
- `/Users/dark/WebstormProjects/talon-sandbox-console/src/i18n/strings.ts` — existing STRINGS dict (full content, ~305 lines)

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `src/api/types.ts` | All backend DTOs (snake_case, match Go handler JSON tags exactly) |
| `src/api/sandboxes.ts` | GET /v1/sandboxes, POST /v1/sandboxes, GET /v1/sandboxes/{id}, DELETE /v1/sandboxes/{id} |
| `src/api/secrets.ts` | GET /v1/secrets, POST /v1/secrets, PATCH /v1/secrets/{id} |
| `src/api/workers.ts` | GET /v1/admin/workers |
| `src/api/tenants.ts` | GET /v1/admin/tenants, GET /v1/admin/tenants/{id}, POST /v1/admin/tenants, DELETE /v1/admin/tenants/{id} |
| `src/api/recordings.ts` | GET /v1/recordings, POST /v1/sandboxes/{id}/recordings/start, POST .../stop |
| `src/api/audit.ts` | GET /v1/audit/events, SSE helper for /v1/audit/events/stream |
| `src/api/dashboard.ts` | GET /v1/metrics/dashboard |
| `src/hooks/useSandboxes.ts` | `useSandboxes()`, `useCreateSandbox()`, `useDeleteSandbox()` |
| `src/hooks/useSandbox.ts` | `useSandbox(id)` |
| `src/hooks/useSecrets.ts` | `useSecrets()`, `useCreateSecret()`, `useRotateSecret()` |
| `src/hooks/useWorkers.ts` | `useWorkers()` |
| `src/hooks/useTenants.ts` | `useTenants()`, `useTenantDetail(id)`, `useCreateTenant()`, `useSuspendTenant()` |
| `src/hooks/useRecordings.ts` | `useRecordings(opts)`, `useStartRecording()`, `useStopRecording()` |
| `src/hooks/useAudit.ts` | `useAuditEvents(query)`, `useAuditStream(onEvent)` |
| `src/hooks/useDashboard.ts` | `useDashboard(tenantId?)` |
| `src/hooks/index.ts` | Barrel re-export |
| `src/components/PageHeader.tsx` | Title + eyebrow/breadcrumb + actions slot |
| `src/components/StatCard.tsx` | KPI card with optional sparkline + delta badge |
| `src/components/DataTable.tsx` | Generic typed table: columns config + rows data |
| `src/components/EmptyState.tsx` | Loading / empty / error unified state component |
| `src/components/Drawer.tsx` | Slide-in right panel wrapping @talon-sandbox Drawer |
| `src/components/StatusPill.tsx` | Sandbox/worker state badge with color token lookup |
| `src/components/ConfirmDialog.tsx` | Destructive action confirmation dialog |
| `src/components/CodeBlock.tsx` | Mono code display with optional copy button |
| `src/components/Toast.tsx` | Toast notification + `useToast` hook |
| `src/components/index.ts` | Barrel re-export |
| `src/i18n/strings/common.ts` | common.* + app.* + sidebar.* + topbar.* + tweaks.* + cmdk.* |
| `src/i18n/strings/nav.ts` | nav.* |
| `src/i18n/strings/login.ts` | login.* |
| `src/i18n/strings/dashboard.ts` | dash.* |
| `src/i18n/strings/sandboxes.ts` | sbx.* + detail.* |
| `src/i18n/strings/workspaces.ts` | tenants.* |
| `src/i18n/strings/secrets.ts` | secrets.* |
| `src/i18n/strings/workers.ts` | workers.* |
| `src/i18n/strings/recordings.ts` | recordings.* |
| `src/i18n/strings/audit.ts` | audit.* |
| `src/i18n/strings/terminal.ts` | term.* |
| `src/i18n/strings/index.ts` | Merges all namespace exports into `STRINGS` |
| `docs/ARCHITECTURE.md` | Layered model + component catalog + i18n convention + add-a-page guide |

### Modified files

| File | What changes |
|---|---|
| `src/App.tsx` | Wrap root with `QueryClientProvider` |
| `src/i18n/strings.ts` | Replace dict body with re-export from `./strings/index` |
| `src/mock/data.ts` | DELETE (remove file) |
| `package.json` | Add `@tanstack/react-query` |

### Intentionally broken (do NOT fix)
`src/pages/*.tsx` imports of `../mock/data` will become broken import errors after `src/mock/data.ts` is deleted. Leave them. Sibling agents B/C/D own these files.

---

## Task 1: Create branch + install react-query

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git checkout -b feat/architecture-foundation
```

Expected: `Switched to a new branch 'feat/architecture-foundation'`

- [ ] **Step 2: Install @tanstack/react-query v5**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
pnpm add @tanstack/react-query
```

Expected: package.json now lists `"@tanstack/react-query": "^5.x.x"` in dependencies.

- [ ] **Step 3: Verify typecheck still passes (baseline)**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run typecheck
```

Expected: exits 0 (baseline before we touch anything).

- [ ] **Step 4: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add package.json pnpm-lock.yaml
git commit -m "deps: add @tanstack/react-query v5"
```

---

## Task 2: Define all backend DTOs in `src/api/types.ts`

**Files:**
- Create: `src/api/types.ts`

The types below are derived directly from Go handler JSON tags in `/Users/dark/WebstormProjects/agent-sandbox-platform/internal/api/dto/dto.go` and `/Users/dark/WebstormProjects/agent-sandbox-platform/internal/api/http/admin_handlers.go`. Use snake_case field names exactly as in Go `json:"..."` tags.

- [ ] **Step 1: Create `src/api/types.ts`**

```typescript
/* src/api/types.ts
 * Backend DTOs — field names must match Go handler JSON tags exactly.
 * Source of truth: internal/api/dto/dto.go + internal/api/http/*_handlers.go
 * No mock data. No 'any'. No @ts-ignore.
 */

// ── Auth ─────────────────────────────────────────────────────────────────────

/** Response from GET /v1/auth/me */
export interface MeResponse {
  tenant_id: string;
  role: string;
  id?: string;
  email?: string;
  name?: string;
  created_at?: number;   // Unix seconds
  preview_suffix?: string;
}

// ── Sandboxes ─────────────────────────────────────────────────────────────────

export type SandboxState =
  | 'running' | 'pulling-image' | 'provisioning' | 'idle'
  | 'paused' | 'terminating' | 'failed' | 'evicted' | 'stopped' | 'destroyed';

export interface SecretBindingDTO {
  secret_id: string;
  name: string;
  mount_type: string;
  target: string;
}

/** Single sandbox from GET /v1/sandboxes or GET /v1/sandboxes/{id} */
export interface SandboxDTO {
  id: string;
  state: SandboxState;
  profile: string;
  image_id?: string;
  cpu_millis?: number;
  memory_bytes?: number;
  pids_limit?: number;
  idle_timeout_seconds?: number;
  ttl_seconds?: number;
  last_active_at?: number;   // Unix seconds; 0 = not reported
  created_at?: number;       // Unix seconds
  network_policy?: string;
  secrets?: SecretBindingDTO[];
}

/** GET /v1/sandboxes response */
export interface SandboxListResponse {
  sandboxes: SandboxDTO[];
}

/** POST /v1/sandboxes request body (v2 style) */
export interface CreateSandboxRequest {
  profile?: string;
  image_id?: string;
  resources?: {
    cpu?: number;    // float cores
    memory?: string; // "4GiB"
    disk?: string;   // "20GiB"
  };
  timeout?: string;  // "30m"
  ttl?: string;      // "6h"
  network?: string;  // "allowlist" | "open" | "sealed"
  env?: Record<string, string>;
  secrets?: Array<{ secret_id: string; mount_type: 'env' | 'file'; target: string }>;
}

// ── Secrets ────────────────────────────────────────────────────────────────────

/** Single secret (value never returned) */
export interface SecretDTO {
  id: string;
  name: string;
  created_at: number;  // Unix seconds
  expires_at?: number;
  revoked?: boolean;
  used_by_count: number;
  last_rotated_at?: number;  // Unix seconds; 0 / absent = never rotated
}

/** GET /v1/secrets response */
export interface SecretListResponse {
  secrets: SecretDTO[];
}

/** POST /v1/secrets request */
export interface CreateSecretRequest {
  name: string;
  value: string;
  ttl_seconds?: number;  // 0 = never expire
}

/** PATCH /v1/secrets/{id} request (T9) */
export interface RotateSecretRequest {
  rotated_at?: string;  // RFC3339; omit = server uses now
}

// ── Workers ────────────────────────────────────────────────────────────────────

/** Single worker from GET /v1/admin/workers */
export interface WorkerDTO {
  id: string;
  grpc_addr: string;
  preview_addr: string;
  last_heartbeat: number;   // Unix seconds
  registered_at: number;    // Unix seconds
  live: boolean;
  sandbox_count: number;
  current_sandboxes: number;
  max_sandboxes: number;
  // T2 fields
  cpu_pct: number;
  mem_pct: number;
  disk_pct: number;
  sandboxes: number;    // alias of sandbox_count
  capacity: number;     // alias of max_sandboxes
  uptime_sec: number;
  last_error: string;
  region: string;
  status: 'healthy' | 'draining' | 'unhealthy';
}

/** GET /v1/admin/workers response */
export interface WorkerListResponse {
  workers: WorkerDTO[];
}

// ── Tenants / Workspaces ──────────────────────────────────────────────────────

/** Single tenant from GET /v1/admin/tenants list */
export interface TenantDTO {
  id: string;
  name: string;
  created_at: number;   // Unix seconds
  quota_max_sandboxes: number;
  active_sandboxes: number;
}

/** GET /v1/admin/tenants response */
export interface TenantListResponse {
  tenants: TenantDTO[];
}

export interface TenantQuotaDTO {
  vcpu: number;
  mem_gb: number;
  disk_gb: number;
}

export interface TenantUsageDTO {
  vcpu: number;
  mem_gb: number;
  disk_gb: number;
}

export interface TenantMemberDTO {
  id: string;
  email: string;
  name?: string;
  role: string;
  joined_at: number;   // Unix seconds
}

export interface TenantSecurityDTO {
  kms_key_arn?: string;
  rotation_period_days: number;
  network_policy: string;
  two_factor: boolean;
}

/** GET /v1/admin/tenants/{id} response (T4) */
export interface TenantDetailDTO {
  id: string;
  name: string;
  plan: 'free' | 'team' | 'enterprise';
  created_at: number;   // Unix seconds
  status: 'active' | 'suspended';
  quota: TenantQuotaDTO;
  usage: TenantUsageDTO;
  members: TenantMemberDTO[];
  security: TenantSecurityDTO;
}

/** POST /v1/admin/tenants request (T5) */
export interface CreateTenantRequest {
  id: string;
  name: string;
  plan?: 'free' | 'team' | 'enterprise';
  quota?: TenantQuotaDTO;
}

// ── Recordings ────────────────────────────────────────────────────────────────

/** Single recording from GET /v1/recordings (T7) */
export interface RecordingDTO {
  id: string;
  sandbox_id: string;
  title?: string;
  agent?: string;
  started_at?: string;    // RFC3339
  stopped_at?: string;    // RFC3339; absent = active
  duration_sec: number;
  steps: number;
  size_kb: number;
  frames: number;
}

/** GET /v1/recordings response (T7) */
export interface RecordingPageResponse {
  items: RecordingDTO[];
  next_cursor?: string;
}

/** POST /v1/sandboxes/{id}/recordings/start response (T8) */
export interface StartRecordingResponse {
  recording_id: string;
}

/** POST /v1/sandboxes/{id}/recordings/stop response (T8) */
export interface StopRecordingResponse {
  recording_id: string;
  duration_sec: number;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

/** Single audit event from GET /v1/audit/events */
export interface AuditEventDTO {
  id: string;
  tenant_id?: string;
  event_type: string;
  outcome: string;
  actor?: string;
  target?: string;
  reason?: string;
  remote_ip?: string;
  extra?: Record<string, string>;
  at: number;   // Unix seconds
}

/** GET /v1/audit/events response */
export interface AuditEventsResponse {
  events: AuditEventDTO[];
}

/** SSE event payload from GET /v1/audit/events/stream (T11) */
export interface AuditStreamEvent {
  ts: string;       // RFC3339
  kind: string;
  actor: string;
  target: string;
  tenant_id?: string;
  reason?: string;
  extra?: Record<string, string>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface MetricSeriesPoint {
  ts: number;      // Unix seconds
  value: number;
}

export interface MetricCard {
  current: number;
  limit?: number;
  delta_24h?: number;
  delta_24h_pct?: number;
  series: MetricSeriesPoint[];
}

export interface DashboardSummary {
  active_sandboxes: MetricCard;
  vcpu: MetricCard;
  memory_gib: MetricCard;
  egress_mbps: MetricCard;
}

export interface QuotaUsage {
  used: number;
  limit: number;
}

export interface DashboardQuota24h {
  vcpu: QuotaUsage;
  memory_gib: QuotaUsage;
  secrets_reads: QuotaUsage;
  failures: QuotaUsage;
}

export interface DashboardActivity {
  ts: string;      // RFC3339
  kind: string;
  actor: string;
  summary: string;
}

export interface DashboardSandbox {
  id: string;
  name: string;
  image: string;
  status: string;
  tenant: string;
}

/** GET /v1/metrics/dashboard response (T10) */
export interface DashboardResponse {
  summary: DashboardSummary;
  states_by_count: Record<string, number>;
  quota_24h: DashboardQuota24h;
  recent_activity: DashboardActivity[];
  running_sandboxes: DashboardSandbox[];
}

// ── Query params ──────────────────────────────────────────────────────────────

export interface AuditQueryParams {
  event_type?: string;
  outcome?: string;
  target?: string;
  since?: number;
  until?: number;
  limit?: number;
}

export interface RecordingQueryParams {
  tenant_id?: string;
  sandbox_id?: string;
  agent?: string;
  since?: string;   // RFC3339
  limit?: number;
  cursor?: string;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run typecheck
```

Expected: exits 0. If not, fix the type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add src/api/types.ts
git commit -m "feat(api): add shared DTO types matching backend JSON shapes"
```

---

## Task 3: API client modules

**Files:**
- Create: `src/api/sandboxes.ts`, `src/api/secrets.ts`, `src/api/workers.ts`, `src/api/tenants.ts`, `src/api/recordings.ts`, `src/api/audit.ts`, `src/api/dashboard.ts`

- [ ] **Step 1: Create `src/api/sandboxes.ts`**

```typescript
/* src/api/sandboxes.ts — pure HTTP functions, no React */
import { apiGet, apiPost, apiDelete, API_BASE } from './client';
import { useApp } from '../store';
import type {
  SandboxDTO, SandboxListResponse, CreateSandboxRequest,
} from './types';

export async function listSandboxes(signal?: AbortSignal): Promise<SandboxListResponse> {
  return apiGet<SandboxListResponse>('/v1/sandboxes', signal);
}

export async function getSandbox(id: string, signal?: AbortSignal): Promise<SandboxDTO> {
  return apiGet<SandboxDTO>(`/v1/sandboxes/${id}`, signal);
}

export async function createSandbox(
  req: CreateSandboxRequest,
  signal?: AbortSignal,
): Promise<SandboxDTO> {
  return apiPost<SandboxDTO>('/v1/sandboxes', req, signal);
}

export async function deleteSandbox(id: string, signal?: AbortSignal): Promise<void> {
  return apiDelete(`/v1/sandboxes/${id}`, signal);
}

/** WebSocket URL for PTY connection */
export function sandboxPtyUrl(id: string): string {
  const token = useApp.getState().authToken;
  const base = (import.meta.env['VITE_API_BASE'] as string | undefined) ?? '/api';
  // Convert http(s) base to ws(s); if relative path, use current host.
  const wsBase = base.startsWith('http')
    ? base.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${base}`;
  const params = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${wsBase}/v1/sandboxes/${id}/pty${params}`;
}
```

- [ ] **Step 2: Create `src/api/secrets.ts`**

```typescript
/* src/api/secrets.ts — pure HTTP functions, no React */
import { apiGet, apiPost } from './client';
import type {
  SecretListResponse, SecretDTO,
  CreateSecretRequest, RotateSecretRequest,
} from './types';

export async function listSecrets(signal?: AbortSignal): Promise<SecretListResponse> {
  return apiGet<SecretListResponse>('/v1/secrets', signal);
}

export async function createSecret(
  req: CreateSecretRequest,
  signal?: AbortSignal,
): Promise<SecretDTO> {
  return apiPost<SecretDTO>('/v1/secrets', req, signal);
}

/** PATCH /v1/secrets/{id} — marks last_rotated_at, does NOT change value */
export async function rotateSecret(
  id: string,
  req?: RotateSecretRequest,
  signal?: AbortSignal,
): Promise<SecretDTO> {
  return apiPost<SecretDTO>(`/v1/secrets/${id}`, req ?? {}, signal);
}
```

Note: `rotateSecret` uses `apiPost` because the `client.ts` does not expose `apiPatch`. The backend uses `PATCH /v1/secrets/{id}` — add `apiPatch` to client.ts or replicate the fetch inline. Use the inline approach to avoid touching client.ts semantics:

```typescript
/* src/api/secrets.ts — corrected rotateSecret using fetch directly */
import { API_BASE, ApiError } from './client';
import { useApp } from '../store';
import type {
  SecretListResponse, SecretDTO,
  CreateSecretRequest, RotateSecretRequest,
} from './types';
import { apiGet, apiPost } from './client';

export async function listSecrets(signal?: AbortSignal): Promise<SecretListResponse> {
  return apiGet<SecretListResponse>('/v1/secrets', signal);
}

export async function createSecret(
  req: CreateSecretRequest,
  signal?: AbortSignal,
): Promise<SecretDTO> {
  return apiPost<SecretDTO>('/v1/secrets', req, signal);
}

/** PATCH /v1/secrets/{id} — marks last_rotated_at only (value unchanged) */
export async function rotateSecret(
  id: string,
  req?: RotateSecretRequest,
  signal?: AbortSignal,
): Promise<SecretDTO> {
  const token = useApp.getState().authToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/v1/secrets/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: JSON.stringify(req ?? {}),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401) useApp.getState().logout();
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<SecretDTO>;
}
```

- [ ] **Step 3: Create `src/api/workers.ts`**

```typescript
/* src/api/workers.ts — pure HTTP functions, no React */
import { apiGet } from './client';
import type { WorkerListResponse } from './types';

export async function listWorkers(signal?: AbortSignal): Promise<WorkerListResponse> {
  return apiGet<WorkerListResponse>('/v1/admin/workers', signal);
}
```

- [ ] **Step 4: Create `src/api/tenants.ts`**

```typescript
/* src/api/tenants.ts — pure HTTP functions, no React
 * API path: /v1/admin/tenants (backend convention)
 * UI label: "Workspaces" (SPEC-pages.md naming convention)
 */
import { apiGet, apiPost, apiDelete } from './client';
import type {
  TenantListResponse, TenantDetailDTO,
  CreateTenantRequest,
} from './types';

export async function listTenants(signal?: AbortSignal): Promise<TenantListResponse> {
  return apiGet<TenantListResponse>('/v1/admin/tenants', signal);
}

export async function getTenantDetail(
  id: string,
  signal?: AbortSignal,
): Promise<TenantDetailDTO> {
  return apiGet<TenantDetailDTO>(`/v1/admin/tenants/${id}`, signal);
}

export async function createTenant(
  req: CreateTenantRequest,
  signal?: AbortSignal,
): Promise<TenantDetailDTO> {
  return apiPost<TenantDetailDTO>('/v1/admin/tenants', req, signal);
}

/** DELETE /v1/admin/tenants/{id} semantically SUSPENDS (not hard-delete) */
export async function suspendTenant(id: string, signal?: AbortSignal): Promise<void> {
  return apiDelete(`/v1/admin/tenants/${id}`, signal);
}
```

- [ ] **Step 5: Create `src/api/recordings.ts`**

```typescript
/* src/api/recordings.ts — pure HTTP functions, no React */
import { apiGet, apiPost } from './client';
import type {
  RecordingPageResponse, StartRecordingResponse,
  StopRecordingResponse, RecordingQueryParams,
} from './types';

function buildRecordingParams(opts: RecordingQueryParams): string {
  const p = new URLSearchParams();
  if (opts.tenant_id) p.set('tenant_id', opts.tenant_id);
  if (opts.sandbox_id) p.set('sandbox_id', opts.sandbox_id);
  if (opts.agent) p.set('agent', opts.agent);
  if (opts.since) p.set('since', opts.since);
  if (opts.limit) p.set('limit', String(opts.limit));
  if (opts.cursor) p.set('cursor', opts.cursor);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function listRecordings(
  opts: RecordingQueryParams = {},
  signal?: AbortSignal,
): Promise<RecordingPageResponse> {
  return apiGet<RecordingPageResponse>(`/v1/recordings${buildRecordingParams(opts)}`, signal);
}

export async function startRecording(
  sandboxId: string,
  opts?: { title?: string; agent?: string },
  signal?: AbortSignal,
): Promise<StartRecordingResponse> {
  return apiPost<StartRecordingResponse>(
    `/v1/sandboxes/${sandboxId}/recordings/start`,
    opts ?? {},
    signal,
  );
}

export async function stopRecording(
  sandboxId: string,
  signal?: AbortSignal,
): Promise<StopRecordingResponse> {
  return apiPost<StopRecordingResponse>(
    `/v1/sandboxes/${sandboxId}/recordings/stop`,
    {},
    signal,
  );
}
```

- [ ] **Step 6: Create `src/api/audit.ts`**

```typescript
/* src/api/audit.ts — pure HTTP functions + SSE helper, no React */
import { apiGet, API_BASE } from './client';
import { useApp } from '../store';
import type { AuditEventsResponse, AuditQueryParams, AuditStreamEvent } from './types';

function buildAuditParams(q: AuditQueryParams): string {
  const p = new URLSearchParams();
  if (q.event_type) p.set('event_type', q.event_type);
  if (q.outcome) p.set('outcome', q.outcome);
  if (q.target) p.set('target', q.target);
  if (q.since !== undefined) p.set('since', String(q.since));
  if (q.until !== undefined) p.set('until', String(q.until));
  if (q.limit !== undefined) p.set('limit', String(q.limit));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function listAuditEvents(
  params: AuditQueryParams = {},
  signal?: AbortSignal,
): Promise<AuditEventsResponse> {
  return apiGet<AuditEventsResponse>(`/v1/audit/events${buildAuditParams(params)}`, signal);
}

export type AuditStreamEventCallback = (event: AuditStreamEvent) => void;

/**
 * Opens an EventSource to /v1/audit/events/stream.
 * Returns a cleanup function that closes the connection.
 * Caller owns reconnect logic; use useAuditStream hook for managed connection.
 */
export function openAuditStream(
  onEvent: AuditStreamEventCallback,
  tenantId?: string,
): () => void {
  const token = useApp.getState().authToken;
  const params = new URLSearchParams();
  if (tenantId) params.set('tenant_id', tenantId);
  if (token) params.set('token', token);
  const paramStr = params.toString();
  const url = `${API_BASE}/v1/audit/events/stream${paramStr ? `?${paramStr}` : ''}`;

  const es = new EventSource(url, { withCredentials: true });

  es.addEventListener('audit', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data as string) as AuditStreamEvent;
      onEvent(data);
    } catch {
      // Malformed event — ignore
    }
  });

  return () => es.close();
}
```

- [ ] **Step 7: Create `src/api/dashboard.ts`**

```typescript
/* src/api/dashboard.ts — pure HTTP functions, no React */
import { apiGet } from './client';
import type { DashboardResponse } from './types';

export async function getDashboard(
  tenantId?: string,
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  const params = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
  return apiGet<DashboardResponse>(`/v1/metrics/dashboard${params}`, signal);
}
```

- [ ] **Step 8: Typecheck**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run typecheck
```

Expected: exits 0. Fix any type errors before continuing.

- [ ] **Step 9: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add src/api/sandboxes.ts src/api/secrets.ts src/api/workers.ts \
        src/api/tenants.ts src/api/recordings.ts src/api/audit.ts \
        src/api/dashboard.ts
git commit -m "feat(api): add HTTP client modules for all endpoints"
```

---

## Task 4: React-query hooks

**Files:**
- Create: `src/hooks/useSandboxes.ts`, `src/hooks/useSandbox.ts`, `src/hooks/useSecrets.ts`, `src/hooks/useWorkers.ts`, `src/hooks/useTenants.ts`, `src/hooks/useRecordings.ts`, `src/hooks/useAudit.ts`, `src/hooks/useDashboard.ts`, `src/hooks/index.ts`

- [ ] **Step 1: Create `src/hooks/useSandboxes.ts`**

```typescript
/* src/hooks/useSandboxes.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSandboxes, createSandbox, deleteSandbox } from '../api/sandboxes';
import type { CreateSandboxRequest, SandboxListResponse } from '../api/types';

export const SANDBOXES_KEY = ['sandboxes'] as const;

export function useSandboxes() {
  return useQuery<SandboxListResponse>({
    queryKey: SANDBOXES_KEY,
    queryFn: ({ signal }) => listSandboxes(signal),
    refetchInterval: 10_000,
  });
}

export function useCreateSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSandboxRequest) => createSandbox(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SANDBOXES_KEY }),
  });
}

export function useDeleteSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSandbox(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SANDBOXES_KEY }),
  });
}
```

- [ ] **Step 2: Create `src/hooks/useSandbox.ts`**

```typescript
/* src/hooks/useSandbox.ts */
import { useQuery } from '@tanstack/react-query';
import { getSandbox } from '../api/sandboxes';
import type { SandboxDTO } from '../api/types';

export function useSandbox(id: string) {
  return useQuery<SandboxDTO>({
    queryKey: ['sandboxes', id],
    queryFn: ({ signal }) => getSandbox(id, signal),
    enabled: id.length > 0,
    refetchInterval: 5_000,
  });
}
```

- [ ] **Step 3: Create `src/hooks/useSecrets.ts`**

```typescript
/* src/hooks/useSecrets.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSecrets, createSecret, rotateSecret } from '../api/secrets';
import type { CreateSecretRequest, RotateSecretRequest, SecretListResponse } from '../api/types';

export const SECRETS_KEY = ['secrets'] as const;

export function useSecrets() {
  return useQuery<SecretListResponse>({
    queryKey: SECRETS_KEY,
    queryFn: ({ signal }) => listSecrets(signal),
  });
}

export function useCreateSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSecretRequest) => createSecret(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SECRETS_KEY }),
  });
}

export function useRotateSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req?: RotateSecretRequest }) =>
      rotateSecret(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SECRETS_KEY }),
  });
}
```

- [ ] **Step 4: Create `src/hooks/useWorkers.ts`**

```typescript
/* src/hooks/useWorkers.ts */
import { useQuery } from '@tanstack/react-query';
import { listWorkers } from '../api/workers';
import type { WorkerListResponse } from '../api/types';

export const WORKERS_KEY = ['workers'] as const;

export function useWorkers() {
  return useQuery<WorkerListResponse>({
    queryKey: WORKERS_KEY,
    queryFn: ({ signal }) => listWorkers(signal),
    refetchInterval: 15_000,
  });
}
```

- [ ] **Step 5: Create `src/hooks/useTenants.ts`**

```typescript
/* src/hooks/useTenants.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTenants, getTenantDetail, createTenant, suspendTenant,
} from '../api/tenants';
import type {
  TenantListResponse, TenantDetailDTO, CreateTenantRequest,
} from '../api/types';

export const TENANTS_KEY = ['tenants'] as const;

export function useTenants() {
  return useQuery<TenantListResponse>({
    queryKey: TENANTS_KEY,
    queryFn: ({ signal }) => listTenants(signal),
  });
}

export function useTenantDetail(id: string) {
  return useQuery<TenantDetailDTO>({
    queryKey: ['tenants', id],
    queryFn: ({ signal }) => getTenantDetail(id, signal),
    enabled: id.length > 0,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateTenantRequest) => createTenant(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

export function useSuspendTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suspendTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}
```

- [ ] **Step 6: Create `src/hooks/useRecordings.ts`**

```typescript
/* src/hooks/useRecordings.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listRecordings, startRecording, stopRecording } from '../api/recordings';
import type { RecordingPageResponse, RecordingQueryParams } from '../api/types';

export const RECORDINGS_KEY = ['recordings'] as const;

export function useRecordings(opts: RecordingQueryParams = {}) {
  return useQuery<RecordingPageResponse>({
    queryKey: [...RECORDINGS_KEY, opts],
    queryFn: ({ signal }) => listRecordings(opts, signal),
  });
}

export function useStartRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sandboxId,
      title,
      agent,
    }: {
      sandboxId: string;
      title?: string;
      agent?: string;
    }) => startRecording(sandboxId, { title, agent }),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECORDINGS_KEY }),
  });
}

export function useStopRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sandboxId: string) => stopRecording(sandboxId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECORDINGS_KEY }),
  });
}
```

- [ ] **Step 7: Create `src/hooks/useAudit.ts`**

The `useAuditStream` hook manages an SSE connection with exponential backoff reconnect:

```typescript
/* src/hooks/useAudit.ts */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { listAuditEvents, openAuditStream } from '../api/audit';
import type {
  AuditEventsResponse, AuditQueryParams, AuditStreamEvent,
} from '../api/types';

export const AUDIT_KEY = ['audit'] as const;

export function useAuditEvents(params: AuditQueryParams = {}) {
  return useQuery<AuditEventsResponse>({
    queryKey: [...AUDIT_KEY, params],
    queryFn: ({ signal }) => listAuditEvents(params, signal),
  });
}

interface AuditStreamResult {
  connected: boolean;
  lastEvent: AuditStreamEvent | null;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

/**
 * Subscribes to the audit SSE stream with automatic exponential-backoff reconnect.
 * @param onEvent - called for each incoming audit event
 * @param tenantId - optional tenant filter (admin only)
 */
export function useAuditStream(
  onEvent: (event: AuditStreamEvent) => void,
  tenantId?: string,
): AuditStreamResult {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AuditStreamEvent | null>(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // Stable callback ref so the reconnect loop does not need onEvent as dependency
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const cleanup = openAuditStream((ev) => {
      if (!mountedRef.current) return;
      backoffRef.current = BASE_BACKOFF_MS; // reset on successful message
      setConnected(true);
      setLastEvent(ev);
      onEventRef.current(ev);
    }, tenantId);
    cleanupRef.current = cleanup;

    // EventSource does not expose readyState change as an event in a cross-browser
    // way; we set connected=true on first message and false on error/close via
    // polling the close. Instead: wrap openAuditStream to detect close.
    // For simplicity, we poll by checking the ES readyState is not tracked here —
    // connected state is set to true on first event received.
    // Error/close: openAuditStream returns close fn; we use onerror via wrapped ES.
  }, [tenantId]);

  useEffect(() => {
    mountedRef.current = true;

    function scheduleReconnect() {
      if (!mountedRef.current) return;
      setConnected(false);
      const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    }

    // Wrap openAuditStream so we can detect ES error events for reconnect.
    // We duplicate the EventSource creation here to add onerror/onopen handlers.
    // This overrides the simpler openAuditStream for the hook case.
    const { API_BASE: base } = { API_BASE: (import.meta.env['VITE_API_BASE'] as string | undefined) ?? '/api' };
    const { useApp } = require('../store') as typeof import('../store');
    const token = useApp.getState().authToken;
    const params = new URLSearchParams();
    if (tenantId) params.set('tenant_id', tenantId);
    if (token) params.set('token', token);
    const paramStr = params.toString();
    const url = `${base}/v1/audit/events/stream${paramStr ? `?${paramStr}` : ''}`;

    const es = new EventSource(url, { withCredentials: true });

    es.onopen = () => {
      if (mountedRef.current) {
        backoffRef.current = BASE_BACKOFF_MS;
        setConnected(true);
      }
    };

    es.onerror = () => {
      es.close();
      if (mountedRef.current) scheduleReconnect();
    };

    es.addEventListener('audit', (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data as string) as AuditStreamEvent;
        setLastEvent(data);
        onEventRef.current(data);
      } catch {
        // ignore malformed
      }
    });

    return () => {
      mountedRef.current = false;
      es.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // Intentionally only re-run on tenantId change; onEvent is stable via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return { connected, lastEvent };
}
```

Note: The `require` in `useEffect` is not ideal. Rewrite the import using a top-level import since we are already in the file. The `useApp` store import should be at the top of the file:

```typescript
/* src/hooks/useAudit.ts — FINAL version */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { listAuditEvents } from '../api/audit';
import { API_BASE } from '../api/client';
import { useApp } from '../store';
import type {
  AuditEventsResponse, AuditQueryParams, AuditStreamEvent,
} from '../api/types';

export const AUDIT_KEY = ['audit'] as const;

export function useAuditEvents(params: AuditQueryParams = {}) {
  return useQuery<AuditEventsResponse>({
    queryKey: [...AUDIT_KEY, params],
    queryFn: ({ signal }) => listAuditEvents(params, signal),
  });
}

interface AuditStreamResult {
  connected: boolean;
  lastEvent: AuditStreamEvent | null;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export function useAuditStream(
  onEvent: (event: AuditStreamEvent) => void,
  tenantId?: string,
): AuditStreamResult {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AuditStreamEvent | null>(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    mountedRef.current = true;

    function openConnection() {
      const token = useApp.getState().authToken;
      const params = new URLSearchParams();
      if (tenantId) params.set('tenant_id', tenantId);
      if (token) params.set('token', token);
      const paramStr = params.toString();
      const url = `${API_BASE}/v1/audit/events/stream${paramStr ? `?${paramStr}` : ''}`;
      const es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        if (!mountedRef.current) return;
        backoffRef.current = BASE_BACKOFF_MS;
        setConnected(true);
      };

      es.onerror = () => {
        es.close();
        if (!mountedRef.current) return;
        setConnected(false);
        const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) openConnection();
        }, delay);
      };

      es.addEventListener('audit', (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data as string) as AuditStreamEvent;
          setLastEvent(data);
          onEventRef.current(data);
        } catch {
          // ignore malformed events
        }
      });

      return es;
    }

    const es = openConnection();

    return () => {
      mountedRef.current = false;
      es.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return { connected, lastEvent };
}
```

- [ ] **Step 8: Create `src/hooks/useDashboard.ts`**

```typescript
/* src/hooks/useDashboard.ts */
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard';
import type { DashboardResponse } from '../api/types';

export const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboard(tenantId?: string) {
  return useQuery<DashboardResponse>({
    queryKey: [...DASHBOARD_KEY, tenantId],
    queryFn: ({ signal }) => getDashboard(tenantId, signal),
    refetchInterval: 30_000,
  });
}
```

- [ ] **Step 9: Create `src/hooks/index.ts`**

```typescript
/* src/hooks/index.ts — barrel */
export * from './useSandboxes';
export * from './useSandbox';
export * from './useSecrets';
export * from './useWorkers';
export * from './useTenants';
export * from './useRecordings';
export * from './useAudit';
export * from './useDashboard';
```

- [ ] **Step 10: Typecheck**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run typecheck
```

Expected: exits 0. Fix any errors.

- [ ] **Step 11: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add src/hooks/
git commit -m "feat(hooks): add react-query hooks wrapping all API modules"
```

---

## Task 5: Shared UI components

**Files:**
- Create: `src/components/PageHeader.tsx`, `src/components/StatCard.tsx`, `src/components/DataTable.tsx`, `src/components/EmptyState.tsx`, `src/components/Drawer.tsx`, `src/components/StatusPill.tsx`, `src/components/ConfirmDialog.tsx`, `src/components/CodeBlock.tsx`, `src/components/Toast.tsx`, `src/components/index.ts`

- [ ] **Step 1: Create `src/components/PageHeader.tsx`**

```typescript
/* src/components/PageHeader.tsx
 * Title + eyebrow/breadcrumb + optional num badge + actions slot.
 * Delegates to @talon-sandbox/react PageHeader for base styles.
 * Usage:
 *   <PageHeader eyebrow="workspace" title="Sandboxes" num="18 / 24"
 *     actions={<Button>New</Button>} />
 */
import { PageHeader as TlnPageHeader } from '@talon-sandbox/react';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  num?: string;
  desc?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, num, desc, actions }: PageHeaderProps) {
  return (
    <TlnPageHeader
      eyebrow={eyebrow}
      title={title}
      num={num}
      desc={desc}
      actions={actions}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/StatCard.tsx`**

```typescript
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
          {unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg-3)', marginLeft: 4 }}>{unit}</span>}
          {ofVal !== undefined && (
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg-3)' }}> / {ofVal}</span>
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
```

- [ ] **Step 3: Create `src/components/DataTable.tsx`**

```typescript
/* src/components/DataTable.tsx
 * Generic typed table. Pass columns config and rows.
 * Used by Sandboxes, Secrets, Workers, Tenants, Recordings, Audit pages.
 * Usage:
 *   <DataTable<SandboxDTO>
 *     columns={[{ key: 'id', header: 'ID', render: r => r.id }]}
 *     rows={sandboxes}
 *     rowKey={r => r.id}
 *     onRowClick={r => nav('/sandboxes/' + r.id)}
 *   />
 */
interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  gridTemplate?: string; // CSS grid-template-columns
  className?: string;
  emptySlot?: React.ReactNode;
}

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, gridTemplate, className, emptySlot,
}: DataTableProps<T>) {
  const colTemplate = gridTemplate ?? `repeat(${columns.length}, 1fr)`;
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: colTemplate,
    alignItems: 'center',
  };

  return (
    <div className={`tln-tbl${className ? ` ${className}` : ''}`} role="table">
      {/* header */}
      <div className="tln-tbl-head" style={rowStyle} role="row">
        {columns.map((col) => (
          <div key={col.key} role="columnheader">
            {col.header}
          </div>
        ))}
      </div>

      {/* rows */}
      {rows.map((row) => {
        const key = rowKey(row);
        return (
          <div
            key={key}
            className={`tln-tbl-row${onRowClick ? '' : ' no-click'}`}
            style={rowStyle}
            role="row"
            tabIndex={onRowClick ? 0 : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={
              onRowClick
                ? (e) => { if (e.key === 'Enter') onRowClick(row); }
                : undefined
            }
            aria-label={onRowClick ? `Open row ${key}` : undefined}
          >
            {columns.map((col) => (
              <div key={col.key} role="cell">
                {col.render(row)}
              </div>
            ))}
          </div>
        );
      })}

      {rows.length === 0 && emptySlot && (
        <div style={{ padding: 32 }}>{emptySlot}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/EmptyState.tsx`**

```typescript
/* src/components/EmptyState.tsx
 * Unified loading / empty / error state.
 * Usage:
 *   <EmptyState loading />
 *   <EmptyState error="Failed to load" />
 *   <EmptyState icon={<TlnIcon name="box" />} title="No sandboxes" description="..." action={<Button>New</Button>} />
 */
import { EmptyState as TlnEmpty } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';

interface EmptyStateProps {
  loading?: boolean;
  error?: string;
  icon?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  loading, error, icon, eyebrow, title, description, action,
}: EmptyStateProps) {
  const t = useT();

  if (loading) {
    return (
      <div
        role="status"
        aria-label={t('common.loading')}
        style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}
      >
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{ padding: 48, textAlign: 'center', color: 'var(--err)' }}
      >
        {error}
      </div>
    );
  }

  return (
    <TlnEmpty
      icon={icon}
      eyebrow={eyebrow}
      title={title ?? t('common.empty')}
      description={description}
      action={action}
    />
  );
}
```

- [ ] **Step 5: Create `src/components/Drawer.tsx`**

```typescript
/* src/components/Drawer.tsx
 * Slide-in right panel. Thin wrapper around @talon-sandbox/react Drawer.
 * Usage:
 *   <Drawer open={open} onClose={() => setOpen(false)} title="New sandbox" width={580}>
 *     {children}
 *   </Drawer>
 */
import { Drawer as TlnDrawer } from '@talon-sandbox/react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, title, width = 520, children }: DrawerProps) {
  return (
    <TlnDrawer open={open} onClose={onClose} side="right" width={width} title={title}>
      {children}
    </TlnDrawer>
  );
}
```

- [ ] **Step 6: Create `src/components/StatusPill.tsx`**

```typescript
/* src/components/StatusPill.tsx
 * State badge with color token lookup.
 * Usage:
 *   <StatusPill state="running" />
 *   <StatusPill state="healthy" kind="worker" />
 */
import { Badge } from '@talon-sandbox/react';
import type { SandboxState } from '../api/types';

type WorkerStatus = 'healthy' | 'draining' | 'unhealthy';

const SANDBOX_COLORS: Record<SandboxState, string> = {
  running:        'var(--ok)',
  'pulling-image':'var(--warn)',
  provisioning:   'var(--warn)',
  terminating:    'var(--warn)',
  idle:           'var(--fg-3)',
  paused:         'var(--fg-4, var(--fg-3))',
  failed:         'var(--err)',
  evicted:        'var(--fg-4, var(--fg-3))',
  stopped:        'var(--fg-3)',
  destroyed:      'var(--fg-4, var(--fg-3))',
};

const SANDBOX_VARIANT: Record<SandboxState, 'success' | 'warning' | 'danger' | 'neutral'> = {
  running:        'success',
  'pulling-image':'warning',
  provisioning:   'warning',
  terminating:    'warning',
  idle:           'warning',
  paused:         'neutral',
  failed:         'danger',
  evicted:        'neutral',
  stopped:        'neutral',
  destroyed:      'neutral',
};

const WORKER_VARIANT: Record<WorkerStatus, 'success' | 'warning' | 'danger'> = {
  healthy:   'success',
  draining:  'warning',
  unhealthy: 'danger',
};

interface StatusPillProps {
  state: SandboxState | WorkerStatus;
  kind?: 'sandbox' | 'worker';
}

export function StatusPill({ state, kind = 'sandbox' }: StatusPillProps) {
  if (kind === 'worker') {
    const s = state as WorkerStatus;
    return (
      <Badge variant={WORKER_VARIANT[s] ?? 'neutral'}>
        {state}
      </Badge>
    );
  }
  const s = state as SandboxState;
  return (
    <Badge variant={SANDBOX_VARIANT[s] ?? 'neutral'} dot={s === 'running'}>
      {state}
    </Badge>
  );
}

/** Returns the CSS color variable for a sandbox state (for dot indicators) */
export function sandboxStateColor(state: SandboxState): string {
  return SANDBOX_COLORS[state] ?? 'var(--fg-3)';
}
```

- [ ] **Step 7: Create `src/components/ConfirmDialog.tsx`**

```typescript
/* src/components/ConfirmDialog.tsx
 * Destructive action confirmation dialog.
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleDelete}
 *     title="Terminate sandbox?"
 *     body="This will stop all processes…"
 *     confirmLabel="Terminate"
 *     danger
 *   />
 */
import { Dialog, Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel, loading, danger,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {body && <p style={{ margin: '8px 0 16px', color: 'var(--fg-2)' }}>{body}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
        >
          {confirmLabel ?? t('common.delete')}
        </Button>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 8: Create `src/components/CodeBlock.tsx`**

```typescript
/* src/components/CodeBlock.tsx
 * Monospace code display with optional copy button.
 * Usage:
 *   <CodeBlock code="import talon_sdk" language="python" />
 */
import { useState } from 'react';
import { useT } from '../i18n/useT';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  style?: React.CSSProperties;
}

export function CodeBlock({ code, language, showCopy = true, style }: CodeBlockProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-1)',
        borderRadius: 'var(--r-2, 6px)',
        padding: '12px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {language && (
        <div style={{ fontSize: 10, color: 'var(--fg-4)', marginBottom: 8, textTransform: 'uppercase' }}>
          {language}
        </div>
      )}
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {code}
      </pre>
      {showCopy && (
        <button
          onClick={handleCopy}
          aria-label={t('common.copy')}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--r-1, 4px)',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 11,
            color: copied ? 'var(--ok)' : 'var(--fg-3)',
          }}
        >
          {copied ? 'Copied' : t('common.copy')}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create `src/components/Toast.tsx`**

```typescript
/* src/components/Toast.tsx
 * Re-exports toast from @talon-sandbox/react and provides useToast hook.
 * Usage:
 *   import { useToast } from '../components/Toast';
 *   const { success, error } = useToast();
 *   success('Sandbox created');
 */
import { toast } from '@talon-sandbox/react';

export function useToast() {
  return {
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    info: (msg: string) => toast(msg),
  };
}

// Re-export raw toast for components that need it directly
export { toast };
```

- [ ] **Step 10: Create `src/components/index.ts`**

```typescript
/* src/components/index.ts — barrel */
export * from './PageHeader';
export * from './StatCard';
export * from './DataTable';
export * from './EmptyState';
export * from './Drawer';
export * from './StatusPill';
export * from './ConfirmDialog';
export * from './CodeBlock';
export * from './Toast';
```

- [ ] **Step 11: Typecheck**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run typecheck
```

Expected: exits 0. Fix errors before continuing.

- [ ] **Step 12: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add src/components/
git commit -m "feat(components): add composable UI atoms (PageHeader, DataTable, StatusPill, etc.)"
```

---

## Task 6: i18n namespace split

**Files:**
- Create: `src/i18n/strings/` directory with 11 namespace files + `index.ts`
- Modify: `src/i18n/strings.ts` (replace body with re-export)

The current `src/i18n/strings.ts` has ~305 lines. Split by key prefix. Every key from the original file must end up in exactly one namespace file.

- [ ] **Step 1: Create `src/i18n/strings/common.ts`**

Contains keys: `app.*`, `sidebar.*`, `topbar.*`, `common.*`, `tweaks.*`, `cmdk.*`.

```typescript
/* src/i18n/strings/common.ts */
export const STRINGS_COMMON: Record<string, { en: string; zh: string }> = {
  'app.subtitle':             { en: 'agent sandbox runtime', zh: 'agent 沙箱运行时' },
  'sidebar.workspace':        { en: 'Workspace', zh: '工作区' },
  'sidebar.admin':            { en: 'Admin', zh: '管理' },
  'sidebar.newSandbox':       { en: 'New sandbox', zh: '新建 sandbox' },
  'topbar.cmdk_placeholder':  { en: 'Jump to sandbox, secret, or action…', zh: '跳转到 sandbox、secret 或动作…' },
  'topbar.notifications':     { en: 'Notifications', zh: '通知' },
  'topbar.help':              { en: 'Help', zh: '帮助' },
  'topbar.settings':          { en: 'Settings', zh: '设置' },
  'common.new':               { en: 'New', zh: '新建' },
  'common.cancel':            { en: 'Cancel', zh: '取消' },
  'common.save':              { en: 'Save', zh: '保存' },
  'common.refresh':           { en: 'Refresh', zh: '刷新' },
  'common.export':            { en: 'Export', zh: '导出' },
  'common.filter':            { en: 'Filter', zh: '筛选' },
  'common.search':            { en: 'Search', zh: '搜索' },
  'common.viewAll':           { en: 'View all', zh: '查看全部' },
  'common.back':              { en: 'Back', zh: '返回' },
  'common.delete':            { en: 'Delete', zh: '删除' },
  'common.kill':              { en: 'Kill', zh: '终止' },
  'common.restart':           { en: 'Restart', zh: '重启' },
  'common.pause':             { en: 'Pause', zh: '暂停' },
  'common.terminal':          { en: 'Terminal', zh: '终端' },
  'common.copy':              { en: 'Copy', zh: '复制' },
  'common.signOut':           { en: 'Sign out', zh: '退出登录' },
  'common.signIn':            { en: 'Sign in', zh: '登录' },
  'common.continue':          { en: 'Continue', zh: '继续' },
  'common.loading':           { en: 'Loading…', zh: '加载中…' },
  'common.empty':             { en: 'No data', zh: '暂无数据' },
  'common.comingSoon':        { en: 'Coming soon', zh: '即将上线' },
  'tweaks.title':             { en: 'Tweaks', zh: '调试' },
  'tweaks.theme':             { en: 'Theme', zh: '主题' },
  'tweaks.mode':              { en: 'Mode', zh: '模式' },
  'tweaks.density':           { en: 'Density', zh: '密度' },
  'tweaks.font':              { en: 'Font', zh: '字体' },
  'tweaks.lang':              { en: 'Language', zh: '语言' },
  'tweaks.dark':              { en: 'Dark', zh: '深色' },
  'tweaks.light':             { en: 'Light', zh: '浅色' },
  'tweaks.compact':           { en: 'Tight', zh: '紧凑' },
  'tweaks.standard':          { en: 'Std', zh: '标准' },
  'tweaks.relaxed':           { en: 'Wide', zh: '宽松' },
  'cmdk.placeholder':         { en: 'Jump to sandbox, secret, action…', zh: '跳转到 sandbox、凭据、动作…' },
  'cmdk.empty':               { en: 'No match', zh: '没有匹配' },
  'cmdk.group.nav':           { en: 'Navigation', zh: '导航' },
  'cmdk.group.actions':       { en: 'Actions', zh: '动作' },
  'cmdk.group.sandboxes':     { en: 'Sandboxes', zh: '沙箱' },
  'cmdk.group.recordings':    { en: 'Recordings', zh: '录像' },
  'cmdk.nav.dashboard':       { en: 'Dashboard', zh: '仪表盘' },
  'cmdk.nav.sandboxes':       { en: 'Sandboxes', zh: '沙箱' },
  'cmdk.nav.recordings':      { en: 'Recordings', zh: '录像' },
  'cmdk.nav.secrets':         { en: 'Secrets', zh: '凭据' },
  'cmdk.nav.audit':           { en: 'Audit', zh: '审计' },
  'cmdk.nav.workers':         { en: 'Workers', zh: '节点' },
  'cmdk.nav.tenants':         { en: 'Workspaces', zh: '空间' },
  'cmdk.action.newSandbox':   { en: 'New sandbox', zh: '新建 sandbox' },
  'cmdk.action.newSecret':    { en: 'New secret', zh: '新建凭据' },
  'cmdk.action.signOut':      { en: 'Sign out', zh: '退出登录' },
  'cmdk.foot.select':         { en: '↑↓ select', zh: '↑↓ 选择' },
  'cmdk.foot.open':           { en: '↩ open', zh: '↩ 打开' },
  'cmdk.foot.close':          { en: 'esc close', zh: 'esc 关闭' },
};
```

- [ ] **Step 2: Create `src/i18n/strings/nav.ts`**

```typescript
/* src/i18n/strings/nav.ts */
export const STRINGS_NAV: Record<string, { en: string; zh: string }> = {
  'nav.dashboard':   { en: 'Dashboard', zh: '仪表盘' },
  'nav.sandboxes':   { en: 'Sandboxes', zh: '沙箱' },
  'nav.recordings':  { en: 'Recordings', zh: '录像' },
  'nav.secrets':     { en: 'Secrets', zh: '凭据' },
  'nav.audit':       { en: 'Audit', zh: '审计' },
  'nav.workers':     { en: 'Workers', zh: '节点' },
  'nav.tenants':     { en: 'Workspaces', zh: '空间' },
};
```

- [ ] **Step 3: Create `src/i18n/strings/login.ts`**

```typescript
/* src/i18n/strings/login.ts */
export const STRINGS_LOGIN: Record<string, { en: string; zh: string }> = {
  'login.title':         { en: 'Sign in to Talon', zh: '登录 Talon' },
  'login.sub':           { en: "We'll email you a one-time code. Or use an API key for service accounts.", zh: '我们会发送一次性验证码到你的邮箱,服务账户可用 API key。' },
  'login.tab.email':     { en: 'Email code', zh: '邮箱验证码' },
  'login.tab.apikey':    { en: 'API key', zh: 'API key' },
  'login.email':         { en: 'Email', zh: '邮箱' },
  'login.code':          { en: 'Verification code', zh: '验证码' },
  'login.codeHint':      { en: '6 digits · expires in 10 min', zh: '6 位数字 · 10 分钟内有效' },
  'login.sendCode':      { en: 'Send code', zh: '发送验证码' },
  'login.resendIn':      { en: 'Resend in {s}s', zh: '{s}秒后可重发' },
  'login.resend':        { en: 'Resend code', zh: '重新发送' },
  'login.codeSent':      { en: 'Code sent. Check your inbox.', zh: '验证码已发送,请查收邮件。' },
  'login.apikey':        { en: 'API key', zh: 'API key' },
  'login.apikey.hint':   { en: 'format: ask_… · scope inherited from the key', zh: '格式: ask_… · 权限继承自 key' },
  'login.signing':       { en: 'Signing in…', zh: '登录中…' },
  'login.sending':       { en: 'Sending…', zh: '发送中…' },
  'login.useKey':        { en: 'Use key', zh: '使用 key' },
  'login.continueWith':  { en: 'or continue with', zh: '或使用' },
  'login.github':        { en: 'Sign in with GitHub', zh: '使用 GitHub 登录' },
  'login.google':        { en: 'Sign in with Google', zh: '使用 Google 登录' },
  'login.requestAccess': { en: "Don't have an account? Request access", zh: '没有账号？申请试用' },
  'login.tagline.l1':    { en: 'The on-demand computer', zh: '为 AI agent 准备的' },
  'login.tagline.acc':   { en: 'on-demand', zh: '随用随启' },
  'login.tagline.l2':    { en: 'your agent runs on.', zh: '的计算机。' },
  'login.subDesc':       { en: 'Spin up an isolated sandbox in <90ms. Stream the PTY back to your model. Watch it install packages, run code, and expose preview URLs — all under a network policy you control.', zh: '90 毫秒拉起隔离 sandbox。把 PTY 流回模型,看它写代码、装依赖、暴露 preview URL —— 全部在你设定的网络策略下。' },
  'login.activeSb':      { en: 'active sandboxes', zh: '活跃 sandbox' },
  'login.coldStart':     { en: 'avg cold-start', zh: '平均冷启动' },
  'login.regions':       { en: 'regions', zh: '区域' },
  'login.code.header':   { en: 'Quick start · python', zh: '快速上手 · python' },
  'login.signInBtn':     { en: 'Sign in', zh: '登录' },
};
```

- [ ] **Step 4: Create `src/i18n/strings/dashboard.ts`**

```typescript
/* src/i18n/strings/dashboard.ts */
export const STRINGS_DASHBOARD: Record<string, { en: string; zh: string }> = {
  'dash.eyebrow':        { en: 'overview', zh: '概览' },
  'dash.welcome':        { en: 'Welcome back,', zh: '欢迎回来,' },
  'dash.desc':           { en: "Here's what's running across Acme · prod right now.", zh: '当前 Acme · prod 下的运行状态。' },
  'dash.newSandbox':     { en: 'New sandbox', zh: '新建 sandbox' },
  'dash.metric.active':  { en: 'Sandboxes active', zh: '运行中 sandbox' },
  'dash.metric.cpu':     { en: 'vCPU usage', zh: 'vCPU 占用' },
  'dash.metric.mem':     { en: 'Memory', zh: '内存' },
  'dash.metric.egress':  { en: 'Egress', zh: '出站流量' },
  'dash.sandboxStates':  { en: 'Sandbox states', zh: 'Sandbox 状态总览' },
  'dash.lastRefresh':    { en: 'last refresh · just now', zh: '刚刚更新' },
  'dash.quota24h':       { en: 'Quota · 24h', zh: '配额 · 24h' },
  'dash.recentActivity': { en: 'Recent activity', zh: '最近活动' },
  'dash.runningNow':     { en: 'Running now', zh: '运行中' },
  'dash.secretsAccessed':{ en: 'Secrets accessed · 24h', zh: 'Secret 访问 · 24h' },
  'dash.failures24h':    { en: 'Failures · 24h', zh: '失败 · 24h' },
  'dash.viewAll':        { en: 'All', zh: '全部' },
};
```

- [ ] **Step 5: Create `src/i18n/strings/sandboxes.ts`**

Contains keys: `sbx.*` and `detail.*`

```typescript
/* src/i18n/strings/sandboxes.ts */
export const STRINGS_SANDBOXES: Record<string, { en: string; zh: string }> = {
  'sbx.eyebrow':           { en: 'workspace', zh: '工作区' },
  'sbx.title':             { en: 'Sandboxes', zh: '沙箱' },
  'sbx.newSandbox':        { en: 'New sandbox', zh: '新建 sandbox' },
  'sbx.filterAll':         { en: 'All', zh: '全部' },
  'sbx.filterActive':      { en: 'Active', zh: '活跃' },
  'sbx.filterRunning':     { en: 'Running', zh: '运行中' },
  'sbx.filterPulling':     { en: 'Pulling', zh: '拉取中' },
  'sbx.filterIdle':        { en: 'Idle', zh: '空闲' },
  'sbx.filterFailed':      { en: 'Failed', zh: '失败' },
  'sbx.colSandbox':        { en: 'Sandbox', zh: 'Sandbox' },
  'sbx.colImage':          { en: 'Image', zh: '镜像' },
  'sbx.colTenant':         { en: 'Workspace', zh: '空间' },
  'sbx.colAge':            { en: 'Age', zh: '运行时长' },
  'sbx.colResources':      { en: 'Resources', zh: '资源' },
  'sbx.colStatus':         { en: 'Status', zh: '状态' },
  'sbx.searchPlaceholder': { en: 'Filter by id / name / image…', zh: '按 id / 名称 / 镜像 过滤…' },
  'sbx.create.title':      { en: 'New sandbox', zh: '新建 sandbox' },
  'sbx.create.launch':     { en: 'Launch', zh: '启动' },
  'sbx.create.basics':     { en: 'Basics', zh: '基本信息' },
  'sbx.create.resources':  { en: 'Resources', zh: '资源' },
  'sbx.create.network':    { en: 'Network policy', zh: '网络策略' },
  'sbx.create.secrets':    { en: 'Secrets', zh: '凭据' },
  'sbx.create.env':        { en: 'Environment variables', zh: '环境变量' },
  'sbx.create.estimate':   { en: 'Estimated cost', zh: '预估费用' },
  'sbx.empty.head':        { en: 'No sandboxes match', zh: '没有 sandbox 匹配这些条件' },
  'sbx.empty.desc':        { en: 'Try clearing filters, or create a new sandbox.', zh: '试试清除过滤器，或创建一个新 sandbox。' },
  'sbx.kill.title':        { en: 'Terminate sandbox?', zh: '终止 sandbox？' },
  'sbx.kill.body':         { en: 'This will stop all processes, release the worker, and end all PTY sessions. Files and recordings are preserved.', zh: '终止将停止所有进程、释放 worker、结束所有 PTY 会话。文件系统状态与录像会保留。' },
  'sbx.kill.confirm':      { en: 'Terminate sandbox', zh: '终止 sandbox' },
  'detail.tab.overview':   { en: 'Overview', zh: '概览' },
  'detail.tab.processes':  { en: 'Processes', zh: '进程' },
  'detail.tab.ports':      { en: 'Ports', zh: '端口' },
  'detail.tab.files':      { en: 'Files', zh: '文件' },
  'detail.tab.network':    { en: 'Network', zh: '网络' },
  'detail.tab.audit':      { en: 'Audit', zh: '审计' },
  'detail.task':           { en: 'Current task', zh: '当前任务' },
  'detail.openShell':      { en: 'Open shell', zh: '打开 shell' },
  'detail.resources':      { en: 'Resource usage', zh: '资源使用' },
  'detail.realtime':       { en: 'Last 60s · live', zh: '最近 60s · 实时' },
  'detail.mountedSecrets': { en: 'Mounted secrets', zh: '挂载的凭据' },
  'detail.manage':         { en: 'Manage', zh: '管理' },
  'detail.noPorts':        { en: 'No ports exposed', zh: '未暴露任何端口' },
  'detail.noSecrets':      { en: 'None', zh: '无' },
  'detail.exposePort':     { en: 'Expose port', zh: '暴露端口' },
  'detail.networkPolicy':  { en: 'Network policy', zh: '网络策略' },
  'detail.recentBlocked':  { en: 'Recently blocked', zh: '最近拦截的请求' },
};
```

- [ ] **Step 6: Create remaining namespace files**

Create `src/i18n/strings/workspaces.ts` (keys: `tenants.*`):

```typescript
export const STRINGS_WORKSPACES: Record<string, { en: string; zh: string }> = {
  'tenants.eyebrow':              { en: 'admin', zh: '管理' },
  'tenants.title':                { en: 'Workspaces', zh: '空间' },
  'tenants.desc':                 { en: 'Each workspace has isolated sandboxes, quotas, and a workspace-scoped KMS key. Cross-workspace access is denied at the API gateway.', zh: '每个空间独立的 sandbox / 配额 / KMS key。跨空间访问在 API 网关层就被拒绝。' },
  'tenants.exportCsv':            { en: 'Export CSV', zh: '导出 CSV' },
  'tenants.new':                  { en: 'New workspace', zh: '新建空间' },
  'tenants.colName':              { en: 'Workspace', zh: '空间' },
  'tenants.colPlan':              { en: 'Plan', zh: '套餐' },
  'tenants.colMembers':           { en: 'Members', zh: '成员' },
  'tenants.colSandboxes':         { en: 'Sandboxes', zh: 'Sandbox' },
  'tenants.colQuota':             { en: 'Quota · vCPU · Mem · Disk', zh: '配额使用 · vCPU · 内存 · 磁盘' },
  'tenants.colCreated':           { en: 'Created', zh: '创建' },
  'tenants.suspended':            { en: 'Suspended', zh: '已暂停' },
  'tenants.drawer.titlePrefix':   { en: 'Workspace', zh: '空间' },
  'tenants.drawer.quota':         { en: 'Quota', zh: '配额' },
  'tenants.drawer.members':       { en: 'Members', zh: '成员' },
  'tenants.drawer.security':      { en: 'Security', zh: '安全' },
  'tenants.drawer.invite':        { en: 'Invite', zh: '邀请' },
  'tenants.drawer.suspend':       { en: 'Suspend', zh: '暂停' },
  'tenants.drawer.save':          { en: 'Save changes', zh: '保存修改' },
  'tenants.drawer.noMembers':     { en: 'No members · invite to begin', zh: '暂无成员 · 邀请以开始' },
  'tenants.quota.note':           { en: 'Quota changes take effect immediately. Active sandboxes within the new limit are not terminated.', zh: '配额变更立即生效。如果活跃 sandbox 仍在新限制内,不会被终止。' },
};
```

Create `src/i18n/strings/secrets.ts` (keys: `secrets.*`):

```typescript
export const STRINGS_SECRETS: Record<string, { en: string; zh: string }> = {
  'secrets.eyebrow':              { en: 'workspace · secrets', zh: '工作区 · 凭据' },
  'secrets.title':                { en: 'Secrets', zh: '凭据' },
  'secrets.desc':                 { en: 'Encrypted at rest with KMS. Mounted as env vars in sandbox processes — never written to disk.', zh: 'KMS 加密静态存储。以环境变量注入 sandbox 进程——绝不落盘。' },
  'secrets.total':                { en: 'Total secrets', zh: '凭据总数' },
  'secrets.accessed24h':          { en: 'Accessed · 24h', zh: '访问 · 24h' },
  'secrets.rotateDue':            { en: 'Rotation due', zh: '到期需轮换' },
  'secrets.encryption':           { en: 'Encryption', zh: '加密方式' },
  'secrets.encryptionNote':       { en: 'AES-256-GCM · workspace key', zh: 'AES-256-GCM · 空间密钥' },
  'secrets.allCurrent':           { en: 'All current', zh: '全部最新' },
  'secrets.checkNow':             { en: 'Check now', zh: '建议检查' },
  'secrets.filterAll':            { en: 'All', zh: '全部' },
  'secrets.filterTenant':         { en: 'Workspace scope', zh: '空间范围' },
  'secrets.scopeTenant':          { en: 'Workspace · acme', zh: '空间 · acme' },
  'secrets.filterSandbox':        { en: 'Sandbox scope', zh: 'Sandbox 范围' },
  'secrets.filterRotate':         { en: 'Rotation due', zh: '待轮换' },
  'secrets.colName':              { en: 'Name · Scope', zh: '名称 · 范围' },
  'secrets.colRotated':           { en: 'Last rotated', zh: '上次轮换' },
  'secrets.colUsed':              { en: 'Last used', zh: '上次使用' },
  'secrets.colUsage30d':          { en: 'Usage · 30d', zh: '使用次数 · 30d' },
  'secrets.colSandboxes':         { en: 'Sandboxes', zh: 'Sandbox' },
  'secrets.colCreatedBy':         { en: 'Created by', zh: '创建者' },
  'secrets.view':                 { en: 'View', zh: '查看' },
  'secrets.rotate':               { en: 'Rotate', zh: '轮换' },
  'secrets.rotateTitle':          { en: 'Rotate secret?', zh: '轮换凭据？' },
  'secrets.rotateBody':           { en: 'Rotating generates a new key version. Running sandboxes continue using the old value until next fetch (≤ 60s).', zh: '轮换会生成一个新的密钥版本。运行中的 sandbox 仍会使用旧值，直到下一次拉取(≤ 60s)。旧版本在过渡期后被销毁。' },
  'secrets.rotateConfirm':        { en: 'Rotate now', zh: '立即轮换' },
  'secrets.create.title':         { en: 'New secret', zh: '新建凭据' },
  'secrets.create.identity':      { en: 'Identity', zh: '身份' },
  'secrets.create.nameHint':      { en: 'UPPERCASE_UNDERSCORE · must start with letter', zh: '大写下划线命名 · 首字符必须是字母' },
  'secrets.create.scopeHint':     { en: 'Workspace secrets are available to all sandboxes. Sandbox scope binds to one sandbox.', zh: '空间凭据可被该空间下所有 sandbox 使用。sandbox 范围只绑定一个 sandbox。' },
  'secrets.create.value':         { en: 'Secret value', zh: '凭据值' },
  'secrets.create.valueHint':     { en: 'Pasted values are not logged. Trailing newlines are trimmed.', zh: '粘贴的值不会被记录。末尾换行会被修剪。' },
  'secrets.create.rotation':      { en: 'Rotation policy', zh: '轮换策略' },
  'secrets.create.autoRotate':    { en: 'Auto-rotate every 90 days', zh: '每 90 天自动轮换' },
  'secrets.create.autoRotateDesc':{ en: 'Talon auto-rotates and notifies your team. Sandboxes fetch the new value within 60s.', zh: 'Talon 会自动轮换并通知你的团队。Sandbox 在 60s 内拉取新值。' },
  'secrets.empty.head':           { en: 'No secrets in this scope', zh: '该范围下没有凭据' },
  'secrets.empty.desc':           { en: 'Try a different filter, or create a new secret.', zh: '试试不同的过滤器，或创建一个新凭据。' },
};
```

Create `src/i18n/strings/workers.ts` (keys: `workers.*`):

```typescript
export const STRINGS_WORKERS: Record<string, { en: string; zh: string }> = {
  'workers.eyebrow':        { en: 'admin', zh: '管理' },
  'workers.title':          { en: 'Workers', zh: '节点' },
  'workers.desc':           { en: "Worker nodes run the actual sandbox microVMs. Drain a node before maintenance — Talon's scheduler stops sending new work.", zh: 'Worker 节点运行实际的 sandbox 微 VM。维护前先 drain 节点——Talon 调度器会停止派发新任务。' },
  'workers.sync':           { en: 'Sync', zh: '同步' },
  'workers.join':           { en: 'Join node', zh: '加入节点' },
  'workers.healthy':        { en: 'Healthy', zh: '健康' },
  'workers.draining':       { en: 'Draining', zh: '渡出中' },
  'workers.unhealthy':      { en: 'Unhealthy', zh: '不健康' },
  'workers.capacity':       { en: 'Sandbox / Capacity', zh: 'Sandbox / 容量' },
  'workers.drain':          { en: 'Drain · Restart', zh: 'Drain · 重启' },
  'workers.nodes':          { en: 'nodes', zh: '个节点' },
  'workers.regions':        { en: 'regions', zh: '个区域' },
  'workers.colWorker':      { en: 'Worker', zh: 'Worker' },
  'workers.colStatus':      { en: 'Status', zh: '状态' },
  'workers.colLoad':        { en: 'Load · CPU · MEM · DSK', zh: '负载 · CPU · 内存 · 磁盘' },
  'workers.colSandboxes':   { en: 'Sandboxes', zh: 'Sandbox' },
  'workers.colUptime':      { en: 'Uptime', zh: '运行时间' },
  'workers.needsAttention': { en: 'Needs attention', zh: '需要关注' },
  'workers.gracefulExit':   { en: 'Graceful exit', zh: '优雅退出' },
};
```

Create `src/i18n/strings/recordings.ts` (keys: `recordings.*`):

```typescript
export const STRINGS_RECORDINGS: Record<string, { en: string; zh: string }> = {
  'recordings.eyebrow':     { en: 'workspace', zh: '工作区' },
  'recordings.title':       { en: 'Recordings', zh: '录像' },
  'recordings.desc':        { en: 'Every agent shell session can be recorded to a tamper-evident log. Replay with the same speed it ran.', zh: '每个 agent shell 会话都可以录制成防篡改日志,按原速回放。' },
  'recordings.colTitle':    { en: 'Recording', zh: '录像' },
  'recordings.colSandbox':  { en: 'Sandbox', zh: 'Sandbox' },
  'recordings.colAgent':    { en: 'Agent', zh: 'Agent' },
  'recordings.colStarted':  { en: 'Started', zh: '启动' },
  'recordings.colDuration': { en: 'Duration', zh: '时长' },
  'recordings.colSteps':    { en: 'Steps', zh: '步骤' },
};
```

Create `src/i18n/strings/audit.ts` (keys: `audit.*`):

```typescript
export const STRINGS_AUDIT: Record<string, { en: string; zh: string }> = {
  'audit.eyebrow':           { en: 'workspace · audit', zh: '工作区 · 审计' },
  'audit.title':             { en: 'Audit log', zh: '审计日志' },
  'audit.desc':              { en: 'Every privileged action is recorded with cryptographic chain integrity.', zh: '每一次特权操作都记录在链式校验的日志里。' },
  'audit.live':              { en: '● Live · showing last 200 events', zh: '● 末尾是实时流 · 显示最近 200 条事件。' },
  'audit.filterAll':         { en: 'All', zh: '全部' },
  'audit.filterSandbox':     { en: 'Sandbox', zh: 'Sandbox' },
  'audit.filterSecret':      { en: 'Secrets', zh: '凭据' },
  'audit.filterAuth':        { en: 'Auth', zh: '认证' },
  'audit.filterPty':         { en: 'PTY', zh: 'PTY' },
  'audit.filterImage':       { en: 'Image', zh: '镜像' },
  'audit.colTime':           { en: 'Time', zh: '时间' },
  'audit.colEvent':          { en: 'Event', zh: '事件' },
  'audit.colActor':          { en: 'Actor', zh: '发起者' },
  'audit.colTarget':         { en: 'Target', zh: '目标' },
  'audit.colResult':         { en: 'Result', zh: '结果' },
  'audit.colMeta':           { en: 'Meta', zh: '元信息' },
  'audit.advFilter':         { en: 'Advanced filter', zh: '高级过滤' },
  'audit.exportCsv':         { en: 'Export CSV', zh: '导出 CSV' },
  'audit.searchPlaceholder': { en: 'Search type · actor · target · meta…', zh: '搜索类型 · 发起者 · 目标 · 元信息…' },
  'audit.empty.head':        { en: 'No matching events', zh: '没有事件匹配当前过滤器' },
};
```

Create `src/i18n/strings/terminal.ts` (keys: `term.*`):

```typescript
export const STRINGS_TERMINAL: Record<string, { en: string; zh: string }> = {
  'term.back':       { en: 'Back', zh: '返回' },
  'term.shell':      { en: 'Main shell', zh: '主 shell' },
  'term.recording':  { en: 'Recording', zh: '录制中' },
  'term.record':     { en: 'Record', zh: '录制' },
  'term.newShell':   { en: 'New shell', zh: '新开 shell' },
  'term.detach':     { en: 'Detach', zh: '脱离' },
  'term.connected':  { en: '● Connected', zh: '● 已连接' },
};
```

- [ ] **Step 7: Create `src/i18n/strings/index.ts`**

```typescript
/* src/i18n/strings/index.ts
 * Merges all namespace dictionaries into the single STRINGS export.
 * The shape is identical to the old src/i18n/strings.ts so useT() needs no changes.
 */
import { STRINGS_COMMON } from './common';
import { STRINGS_NAV } from './nav';
import { STRINGS_LOGIN } from './login';
import { STRINGS_DASHBOARD } from './dashboard';
import { STRINGS_SANDBOXES } from './sandboxes';
import { STRINGS_WORKSPACES } from './workspaces';
import { STRINGS_SECRETS } from './secrets';
import { STRINGS_WORKERS } from './workers';
import { STRINGS_RECORDINGS } from './recordings';
import { STRINGS_AUDIT } from './audit';
import { STRINGS_TERMINAL } from './terminal';

export type LangKey = 'en' | 'zh';

export const STRINGS: Record<string, { en: string; zh: string }> = {
  ...STRINGS_COMMON,
  ...STRINGS_NAV,
  ...STRINGS_LOGIN,
  ...STRINGS_DASHBOARD,
  ...STRINGS_SANDBOXES,
  ...STRINGS_WORKSPACES,
  ...STRINGS_SECRETS,
  ...STRINGS_WORKERS,
  ...STRINGS_RECORDINGS,
  ...STRINGS_AUDIT,
  ...STRINGS_TERMINAL,
};
```

- [ ] **Step 8: Update `src/i18n/strings.ts` to re-export**

Replace the entire content of `src/i18n/strings.ts` with:

```typescript
/* src/i18n/strings.ts
 * Re-exports from the namespaced split. Import path unchanged for consumers.
 * Do NOT add keys here — add them to the appropriate namespace file under strings/.
 */
export type { LangKey } from './strings/index';
export { STRINGS } from './strings/index';
```

- [ ] **Step 9: Typecheck**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run typecheck
```

Expected: exits 0. The `useT.ts` imports `STRINGS` from `./strings` — this import still resolves to `strings.ts` which now re-exports from `strings/index.ts`. If you see a circular import error, check the import path in `useT.ts` and adjust if needed. (`useT.ts` imports from `./strings`, which means `./strings.ts` — the re-export file — which imports from `./strings/index` — no circle since index does not import from `strings.ts`.)

- [ ] **Step 10: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add src/i18n/strings/ src/i18n/strings.ts
git commit -m "refactor(i18n): split strings.ts into namespaced modules (common/nav/login/dashboard/sandboxes/workspaces/secrets/workers/recordings/audit/terminal)"
```

---

## Task 7: Wire QueryClientProvider + delete mock data

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/mock/data.ts`

- [ ] **Step 1: Add QueryClientProvider to `src/App.tsx`**

Read the current `src/App.tsx` first, then add the import and wrapper. The change is minimal — only adds 3 lines:

Add at top of imports:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
```

Add after the imports and before the `function RequireAuth` line:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
    },
  },
});
```

Wrap the return of the `App` default export's `<HashRouter>` with `<QueryClientProvider client={queryClient}>`:

```typescript
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Boot />
        <Routes>
          {/* ... unchanged routes ... */}
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
```

Do NOT change any other logic in `App.tsx`.

- [ ] **Step 2: Delete `src/mock/data.ts`**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
rm src/mock/data.ts
```

Note: All `src/pages/*.tsx` files that import from `../mock/data` will now have broken imports. This is expected and correct — sibling agents B/C/D will fix these. Do NOT attempt to fix them.

- [ ] **Step 3: Typecheck (expect page errors, not framework errors)**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run typecheck 2>&1 | head -40
```

Expected output: errors all reference `src/pages/*.tsx` files with "Cannot find module '../mock/data'". Errors in `src/api/`, `src/hooks/`, `src/components/`, `src/i18n/` must be zero.

If there are errors outside of `src/pages/`, fix them before continuing.

- [ ] **Step 4: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add src/App.tsx
git rm src/mock/data.ts
git commit -m "feat(app): wire QueryClientProvider; delete mock data"
```

---

## Task 8: Write `docs/ARCHITECTURE.md`

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Create `docs/ARCHITECTURE.md`**

```markdown
# Talon Sandbox Console — Architecture

## Layered Model

```
Backend API
    │
    ▼
src/api/*.ts          — Pure async functions. No React, no hooks, no state.
    │                   Each file = one resource domain (sandboxes, secrets, …).
    │                   Return typed DTOs from src/api/types.ts.
    │
    ▼
src/hooks/*.ts        — React-query wrappers. Own cache keys + invalidation.
    │                   Each hook calls exactly one API module function.
    │                   No business logic. No side effects beyond cache.
    │
    ▼
src/components/*.ts   — Composable UI atoms. Props-only interface.
    │                   No API calls. No zustand reads (except useT for i18n).
    │                   Each file ≤ 200 lines.
    │
    ▼
src/pages/*.tsx       — Business pages. Compose hooks + components + CSS.
                        Own page-level state (filters, search, drawer open, etc.).
```

## Component Catalog

| Component | Description |
|---|---|
| `PageHeader` | Title + eyebrow/breadcrumb + optional `num` badge + `actions` slot. Delegates to @talon-sandbox/react PageHeader. |
| `StatCard` | KPI metric card: animated count-up, optional sparkline, delta badge, limit display. |
| `DataTable<T>` | Generic typed table. Pass `columns` config + `rows` + `rowKey`. Handles click, keyboard nav, empty slot. |
| `EmptyState` | Unified loading / empty / error component. Shows spinner text, error alert, or @talon-sandbox EmptyState. |
| `Drawer` | Slide-in right panel. Thin prop adapter over @talon-sandbox Drawer. |
| `StatusPill` | Sandbox or worker status badge with color token lookup. Variant auto-derived from state string. |
| `ConfirmDialog` | Destructive action confirmation. Props: title, body, confirmLabel, danger, loading, onConfirm. |
| `CodeBlock` | Monospace code with optional language label and clipboard copy button. |
| `Toast` / `useToast` | Re-exports @talon-sandbox/react toast. `useToast()` returns `{ success, error, info }`. |

## i18n Namespace Convention

All UI strings live in `src/i18n/strings/`. One file per page domain:

| File | Key prefix | Domain |
|---|---|---|
| `common.ts` | `common.*`, `app.*`, `sidebar.*`, `topbar.*`, `tweaks.*`, `cmdk.*` | Global chrome |
| `nav.ts` | `nav.*` | Navigation labels |
| `login.ts` | `login.*` | Login page |
| `dashboard.ts` | `dash.*` | Dashboard |
| `sandboxes.ts` | `sbx.*`, `detail.*` | Sandboxes + detail |
| `workspaces.ts` | `tenants.*` | Workspace/tenant admin |
| `secrets.ts` | `secrets.*` | Secrets management |
| `workers.ts` | `workers.*` | Worker nodes admin |
| `recordings.ts` | `recordings.*` | Recording list + playback |
| `audit.ts` | `audit.*` | Audit log |
| `terminal.ts` | `term.*` | Terminal page |

To add a new string: add to the relevant namespace file. `src/i18n/strings/index.ts` auto-merges. Consumer usage unchanged:

```tsx
const t = useT();
t('common.cancel')  // → "Cancel" or "取消"
```

## How to Add a New Page (5 steps)

1. **Define DTOs** — Add response/request types to `src/api/types.ts` matching Go handler JSON tags exactly.

2. **Write API module** — Create `src/api/myfeature.ts` with pure `async function` wrappers calling `apiGet`/`apiPost`/`apiDelete`.

3. **Write hooks** — Create `src/hooks/useMyFeature.ts` using `useQuery` / `useMutation` from react-query. Export from `src/hooks/index.ts`.

4. **Add i18n strings** — Create `src/i18n/strings/myfeature.ts` and import + spread it in `src/i18n/strings/index.ts`.

5. **Build page** — Create `src/pages/PageMyFeature.tsx`. Import hooks from `src/hooks`, components from `src/components`, strings via `useT()`. Add route to `src/App.tsx`.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git add docs/ARCHITECTURE.md
git commit -m "docs: add ARCHITECTURE.md — layered model, component catalog, add-page guide"
```

---

## Task 9: Build verification

- [ ] **Step 1: Run build**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npm run build 2>&1 | tail -30
```

Expected: Build will have TypeScript errors from `src/pages/*.tsx` because mock data is deleted. This is acceptable — the build target for the foundation is that `src/api/`, `src/hooks/`, `src/components/`, and `src/i18n/` contain zero errors. Page errors are owned by sibling agents.

To verify foundation-only, run:

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
npx tsc --noEmit 2>&1 | grep -v "src/pages/" | head -40
```

Expected: zero lines (no errors outside pages/).

- [ ] **Step 2: Commit final report tag**

```bash
cd /Users/dark/WebstormProjects/talon-sandbox-console
git log --oneline -10
```

Record the SHAs for the final report.

---

## Deliverables Summary

After all tasks complete:

1. Branch `feat/architecture-foundation` exists with commits for each logical unit.
2. Foundation files (`src/api/`, `src/hooks/`, `src/components/`, `src/i18n/strings/`) typecheck clean.
3. `src/pages/*.tsx` have broken mock imports — this is intentional.
4. `docs/ARCHITECTURE.md` documents the layer model.
5. Report to product lead: branch name, SHAs, file counts, backend gaps found.

### Backend gaps discovered during DTO mapping

| Gap | Detail | Severity |
|---|---|---|
| `SecretDTO` missing `scope`, `last_used_at`, `created_by`, `usage_30d`, `sandbox_count` | Go `secretToDTO` only returns `id`, `name`, `created_at`, `expires_at`, `revoked`, `used_by_count`, `last_rotated_at`. The Secrets page prototype needs scope/last_used/created_by/usage_30d/sandboxes columns — these don't exist in backend yet. | P1 — page B/C/D will need shim or backend patch |
| `GET /v1/admin/tenants` list DTO minimal | Only returns `id`, `name`, `created_at`, `quota_max_sandboxes`, `active_sandboxes`. Tenants page needs `plan`, `status`, `members` count, `quota.vcpu/mem_gb/disk_gb`. Use `GET /v1/admin/tenants/{id}` for detail drawer — detail endpoint (T4) has full DTO. | P1 — pages must call detail endpoint per tenant or platform patches list DTO |
| `SandboxDTO.name` field missing | `toDTO()` only maps `id`, `state`, `profile`, `image_id` from worker. No `name` field returned. Sandbox list shows `name` column. | P1 — platform must add name to central table / DTO |
| `DashboardSandbox.name` field empty | Backend struct has `Name` field but handler assigns `sb.ImageID` to `Image`, not `Name`. `Name` column is empty in all running_sandboxes rows. | P0 — platform handler bug |
| SSE endpoint path mismatch | `PLATFORM-PATCHES.md` says `/v1/audit/stream`; actual handler is `GET /v1/audit/events/stream`. Console hooks use `/v1/audit/events/stream` (correct). Docs need update. | low |
| `rotateSecret` uses PATCH but `client.ts` only has `apiGet/apiPost/apiDelete` | Implemented inline with direct `fetch()`. Consider adding `apiPatch` to client.ts. | low |

### What siblings B/C/D need to do

- **All pages**: Replace `import { ... } from '../mock/data'` with hooks from `src/hooks` and types from `src/api/types`.
- **PageSandboxes**: Use `useSandboxes()`, `useCreateSandbox()`, `useDeleteSandbox()`. The `MOCK_TENANTS` usage in the create drawer needs to be replaced with `useTenants()` to populate the workspace dropdown.
- **PageSecrets**: Use `useSecrets()`, `useCreateSecret()`, `useRotateSecret()`. Note: `SecretDTO` does not have `scope`, `last_used_at`, `created_by` — page will need to handle missing columns gracefully.
- **PageDashboard**: Use `useDashboard()`. `MOCK_METRICS` and `MOCK_RECENT` are gone — all data from `DashboardResponse`.
- **PageWorkers**: Use `useWorkers()`. `MOCK_WORKERS` is gone.
- **PageTenants**: Use `useTenants()` for list, `useTenantDetail(id)` for drawer. `MOCK_TENANTS` is gone.
- **PageRecordings**: Use `useRecordings()`. `MOCK_RECORDINGS` is gone.
- **PageAudit**: Use `useAuditEvents()` + `useAuditStream()`. `MOCK_AUDIT` is gone.
- **PageSandboxDetail**: Use `useSandbox(id)`. `MOCK_SANDBOXES` is gone.
- **Sparkline in pages**: `Sparkline` component already exists at `src/components/Sparkline.tsx` (not touched). Pages can continue to use it directly.
