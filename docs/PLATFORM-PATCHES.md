# Platform API patches required by talon-sandbox-console

> Ground truth for the `platform-patcher` teammate.
> All 12 tickets are **真做** (decided by product owner) — no "Coming soon" stubs.
> Work happens in `/Users/dark/WebstormProjects/agent-sandbox-platform`.

## Conventions

- Branch: `feat/console-api-patches` from `main`, single PR back to main when done.
- Commit author: `darkmice <dark.lijin@gmail.com>`.
- Run `go test ./...` and `go vet ./...` clean before each commit.
- Add unit tests in `internal/api/http/*_test.go` alongside each handler.
- All new DTO fields use `snake_case` JSON tags (project convention).
- Audit log every state-changing endpoint via `o.Audit.Emit(...)`.
- Keep `/v1/admin/*` behind admin role check (`chainAdmin`).
- **Do NOT** touch sandbox-worker, only sandbox-api.

## Ground truth for fields

When in doubt about DTO field names, read the prototype:
- Workers list: `.design-source/project/app/page-workers.jsx` (cpu/mem/disk %, capacity, lastError)
- Process list: `.design-source/project/app/page-sandbox-detail.jsx` "Tab: 进程"
- Tenant detail: `.design-source/project/app/page-tenants.jsx` (TenantDrawer)
- Recording list: `.design-source/project/app/page-recording.jsx` (.rec-row columns)
- Dashboard metrics: `.design-source/project/app/page-dashboard.jsx`

## Tickets

### T1 — `GET /v1/auth/me` DTO completeness (XS)

Add fields if missing: `id`, `email`, `name`, `role`, `tenant_id`, `created_at`.
Current handler: `internal/api/http/auth.go` (function `(*authHandler).me`).
Confirm `Me` struct has all 6 fields; if `email`/`name`/`role` missing, add column or join from users table.

### T2 — `GET /v1/admin/workers` DTO enrichment (S)

Current returns minimal worker info. Add per-worker:
- `cpu_pct`, `mem_pct`, `disk_pct` (last-known utilisation %, 0-100 float)
- `sandboxes` (active sandbox count)
- `capacity` (max sandboxes for this worker)
- `uptime_sec` (seconds since worker registered)
- `last_error` (string, "" if healthy)
- `region` (e.g. "cn-east-1")
- `status` enum: `healthy` | `draining` | `unhealthy`

Source: worker heartbeat table + sandbox-routes join. Add fields to existing heartbeat handler so worker pushes utilisation on every heartbeat.

### T3 — `GET /v1/sandboxes/{id}/processes` per-process metrics (S)

Add fields per process:
- `cpu_pct` (float, current %)
- `mem_mb` (uint, current MB)

Worker side: poll `/proc/{pid}/stat` + `statm` for each managed pid every 5s, cache, return on demand. Existing handler at `internal/api/http/processes.go`.

### T4 — `GET /v1/admin/tenants/{id}` single tenant detail with members (M)

New endpoint. Returns:
```json
{
  "id": "acme",
  "name": "Acme Inc",
  "plan": "team",        // free | team | enterprise
  "created_at": "...",
  "status": "active",    // active | suspended
  "quota": { "vcpu": 32, "mem_gb": 64, "disk_gb": 256 },
  "usage": { "vcpu": 14.8, "mem_gb": 42, "disk_gb": 120 },
  "members": [
    { "id": "u_1", "email": "...", "name": "...", "role": "admin" | "member" | "agent", "joined_at": "..." }
  ],
  "security": {
    "kms_key_arn": "arn:aws:kms:...",
    "rotation_period_days": 90,
    "network_policy": "open" | "allowlist" | "deny-all",
    "two_factor": true
  }
}
```
Admin only. Add to router under `GET /v1/admin/tenants/{id}` with `chainAdmin`.

### T5 — `POST /v1/admin/tenants` create tenant (M)

Body:
```json
{ "id": "acme", "name": "Acme Inc", "plan": "team",
  "quota": {"vcpu": 32, "mem_gb": 64, "disk_gb": 256} }
```
Returns the created tenant object (same DTO as T4).

Validation:
- `id` must match `^[a-z][a-z0-9_-]{2,30}$`, unique.
- `plan` in {`free`, `team`, `enterprise`}; default quotas per plan if `quota` omitted.

Audit-log emit on success.

### T6 — `DELETE /v1/admin/tenants/{id}` suspend tenant (L)

**Semantic: suspend, not delete.** Sets `status = "suspended"`. Side effects:
1. Stop all running sandboxes owned by this tenant (call existing stop handler internally).
2. Invalidate active JWT sessions for users in this tenant (add to JWT denylist table; auth middleware checks).
3. Return 204.

There is no hard-delete in this milestone. If user actually wants to delete data, they must contact ops (separate runbook). Add a 7-day timer service that hard-deletes any tenant in suspended status for 7+ days — out of scope for this ticket, file as a follow-up issue.

Audit emit: `tenant.suspend` with `target_id={id}`, `actor={requester}`.

### T7 — `GET /v1/recordings` global list (M)

Cross-sandbox recording list with pagination. Query params:
- `?tenant_id=`, `?sandbox_id=`, `?agent=`, `?since=`, `?limit=` (default 50, max 200), `?cursor=`

Returns:
```json
{
  "items": [{
    "id": "rec_001",
    "sandbox_id": "sbx_xyz",
    "title": "...",
    "agent": "claude-3.7",
    "started_at": "...",
    "duration_sec": 412,
    "steps": 18,
    "size_kb": 234,
    "frames": 1240
  }],
  "next_cursor": "..."
}
```

Index by `started_at desc`. The existing `/v1/sandboxes/{id}/recordings` already lists per-sandbox; this one aggregates across all sandboxes the requester has access to (auth filter by tenant).

### T8 — Recording start/stop endpoints (M)

- `POST /v1/sandboxes/{id}/recordings/start` → returns `{ "recording_id": "rec_xxx" }`. Creates a recording row + tells worker to start streaming PTY/agent events to frame storage.
- `POST /v1/sandboxes/{id}/recordings/stop` → returns `{ "recording_id": "rec_xxx", "duration_sec": ... }`. Tells worker to flush + finalize.

If start called while recording active: return 409 with current recording_id.
If stop called with no active recording: 404.

### T9 — `PATCH /v1/secrets/{id}` rotate timestamp (S)

Body `{ "rotated_at": "ISO8601" }` (defaults to now if omitted).
Updates `secrets.last_rotated_at` only. **Value is not touched** — user is responsible for actually rotating the upstream credential out-of-band. This endpoint is just bookkeeping.

Returns updated secret DTO (without `value`, never expose value over API after creation).

Audit emit: `secret.rotate_marked`.

### T10 — `GET /v1/metrics/dashboard` JSON aggregate (L)

For the Dashboard 4 metric cards + states bar + quota. Query: `?tenant_id=` (admin can omit, member implicit own tenant).

Response:
```json
{
  "summary": {
    "active_sandboxes":   { "current": 18, "delta_24h": 3, "series": [...] /* 30 points, 5min interval */ },
    "vcpu":               { "current": 14.8, "limit": 48, "delta_24h": 2.1, "series": [...] },
    "memory_gib":         { "current": 42, "limit": 96, "delta_24h": 1.4, "series": [...] },
    "egress_mbps":        { "current": 4.2, "delta_24h_pct": -12, "series": [...] }
  },
  "states_by_count": {
    "running": 12, "pulling-image": 2, "provisioning": 1, "idle": 3,
    "paused": 0, "failed": 0, "terminating": 0, "evicted": 0
  },
  "quota_24h": {
    "vcpu":         { "used": 14.8, "limit": 48 },
    "memory_gib":   { "used": 42,   "limit": 96 },
    "secrets_reads":{ "used": 1240, "limit": 10000 },
    "failures":     { "used": 3,    "limit": 50 }
  },
  "recent_activity": [
    { "ts": "...", "kind": "sandbox.create" | "secret.read" | ..., "actor": "...", "summary": "..." }
  ],
  "running_sandboxes": [
    { "id": "sbx_a", "name": "...", "image": "...", "status": "running", "tenant": "acme" }
  ]
}
```

Implementation: query Prometheus HTTP API (`prom.Querier`) for series + current values; query sandbox-routes for state-by-count; query audit log for recent_activity (last 20).

Add `prom_url` to platform config (default `http://localhost:9090`). If prom unreachable, fall back to current values from sandbox-routes + return empty `series` arrays (graceful degradation).

### T11 — `GET /v1/audit/events/stream` SSE real-time (L)

Server-Sent Events endpoint. Auth required, optional `?tenant_id=` (admin only filter).

Stream format:
```
event: audit
data: {"id":"...", "ts":"...", "kind":"sandbox.create", "actor":"...", "target":"...", ...}

```

Implementation:
- Add a fan-out hub in `internal/api/audit/` that the existing `audit.Emit` writes into.
- HTTP handler hijacks the connection, sets `Content-Type: text/event-stream`, registers a subscriber, flushes events as they arrive.
- Keep-alive `: ping\n\n` every 15s.
- Auth filter: subscriber only receives events its tenant can see (members) or all events (admin).
- Connection limit: 100 concurrent subscribers per process (reject 503 above).

Also keep existing `GET /v1/audit/events` (paginated list) — console uses both (list for initial page, SSE for live updates).

### T12 — Preview URL suffix exposed in /v1/auth/me (XS)

The preview URL format is `{sandboxID}-{port}.preview.example.com` where `example.com` is configured at deploy time. Console needs to know the suffix to render port previews.

Add to `/v1/auth/me` response:
```json
{ "preview_suffix": "preview.sandbox.talon.net.cn" }
```

Source: read existing config option used by `previewSubdomainMiddleware`.

## Acceptance checklist (per ticket)

- [ ] Handler implemented
- [ ] Audit log emit (state-changing tickets only)
- [ ] Unit tests covering happy path + 401 + 403 + validation errors
- [ ] Updated `internal/api/http/router_test.go` route table if new route
- [ ] `go test ./internal/...` and `go vet ./...` clean
- [ ] OpenAPI spec updated (if `internal/api/openapi.yaml` exists — verify path)

## Deliverable

Single PR `feat/console-api-patches` containing all 12 tickets, one commit per ticket. PR description references this file.
