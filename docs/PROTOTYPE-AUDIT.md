# Prototype Fidelity Audit — 2026-05-25

## Summary
- Pages with critical gaps: 6 (SandboxDetail, Sandboxes, Secrets, Recording, Workers, Dashboard)
- Total missing regions / fields: 14
- Total raw English leaks: 6 (rendered directly in JSX without i18n)
- Total i18n dictionary mismatches: 3 (provisioning label wrong, detail.age missing, state strings exposed raw)
- Total functional stubs rendering "Coming soon": 3 tabs (Processes, Files, Network→blocked-list)

---

## Page: Dashboard

### Missing/wrong regions
- States overview card: **present** ✅. Uses inline `.states-bar` + `.states-legend` identical to prototype.
- Quota 24h card: **present** ✅. Renders via `.quota-item` wrapper classes; visually equivalent.
- Recent activity card: **present** ✅. Footer moved: prototype put `查看全部` in the `action` slot of the card header; console uses `footer` slot. Visually the link appears at the bottom rather than the top-right of the card header. Minor but visible difference.
- Running-now card: **present** ✅. Footer: same structural shift (action → footer).

### State dictionary issues
- All 8 `SBX_STATE` keys present in `DS_STATE_ORDER` and in `state.*` i18n keys ✅.
- `state.provisioning` zh label: prototype = `调度中`; console = `配置中` (common.ts:32). **MISMATCH** — these have different meanings (scheduling vs. configuring).
- Console adds `state.stopped` and `state.destroyed` (not in prototype SBX_STATE). Intentional extension; not a bug.

### STATE_ORDER / column order
- `DS_STATE_ORDER` in `PageDashboard.tsx:82` exactly matches `STATE_ORDER` in prototype ✅.

### Raw English leaks
- `PageDashboard.tsx:327`: `<span className="age">{t(\`state.${s.status}\`)}</span>` — the running-now list's third column. Prototype showed **elapsed time** (`Math.floor(ageSec/60) + 'm'`). Console shows the translated state label instead. The **semantics are different** (time vs. label) even though it goes through i18n. Bug in intent, not just translation.

### DS component vs prototype-inline mismatch
- `StatesOverview` uses `.states-bar` (height 6px, background `var(--bg-2)`) whereas prototype specifies height 8px and `var(--bg-3)`. Minor visual difference.
- `Metric` card: prototype wraps in `TlnCard padded={false}` with inline padding. Console uses `<Card style={{ padding: 'var(--pad-card, 16px)' }}>`. Functionally equivalent.
- "刚刚更新" eyebrow: prototype places it as the card `action` prop (top-right of card head). Console uses `footer` prop (bottom of card body). The text is rendered but in a different location.

### CSS class mismatches
- `.states-bar` height: prototype 8px → console 6px (PageDashboard.css:70).
- `.run-row .dot` → renamed `.run-row .run-dot` in console. CSS matches usage ✅.

### PageHeader props
- Prototype: `eyebrow="概览"`, `title={<>欢迎回来, <span style…>{name}</>}`, `desc="当前 Acme · prod 下的运行状态。"`, `actions=(刷新, 新建 sandbox)`. No `num` prop.
- Console: matches ✅, all through i18n. `desc` uses `t('dash.desc')` which hardcodes "Acme · prod" in the zh string — acceptable.

---

## Page: Sandboxes

### Missing/wrong regions
- Filters bar: **present** ✅. Same two groups (all/active; running/pulling/idle/failed).
- Table with 7 columns: **present** ✅.
- Create drawer: extracted to `_sandboxes/CreateSandboxDrawer.tsx` ✅.

### State dictionary issues
- Filter buttons use `t('sbx.filterRunning')`, `t('sbx.filterPulling')`, etc. ✅.

### STATE_ORDER / column order
- Column order matches prototype exactly: Sandbox, Image, Tenant/Workspace, Age, Resources, Status, actions ✅.

### Raw English leaks
- `PageSandboxes.tsx:78`: `<Badge variant={stateVariant(s.state)} dot={s.state === 'running'}>{s.state}</Badge>` — renders **raw API string** (e.g. "pulling-image", "failed") directly as badge text. Should be `{t(\`state.${s.state}\`)}`.

### DS component vs prototype-inline mismatch
- Prototype uses `TlnStateBadge` which wraps state key through `SBX_STATE[state].label` (Chinese). Console uses `<Badge>` with raw `s.state` (English). Different text is rendered.
- `SandboxRow` for the status column loses all Chinese labels.
- Pull-in-progress column: prototype shows `<TlnProgress>` with actual percentage. Console shows `<ProgressBar indeterminate>` — no percentage shown (intentional? — field `pull_progress` not in DTO).

### CSS class mismatches
- None critical; `sbx-row` grid columns unchanged.

### PageHeader props
- Prototype: `num="\${active} 运行中 / \${all} 总数"` (Chinese units embedded).
- Console: `num="\${active} / \${all}"` (bare fraction, no Chinese labels). The "运行中" and "总数" units are dropped. User-visible difference.

---

## Page: SandboxDetail

### Missing/wrong regions
- Detail header: **present** but **missing tenant tag**. Prototype renders `<TlnTag>{s.tenant}</TlnTag>` next to the state badge in `.id-row`. Console has no tenant tag (PageSandboxDetail.tsx:100-103). The tenant context is invisible to the user.
- Info row: prototype has 6 items: `节点`, `区域`, `启动时间`, `运行时长`, `资源`, `磁盘`. Console has 4 items: `started`, `resources`, `profile`, `ttl`. **Missing**: node, region, uptime/age, disk. **Extra (not in prototype)**: profile, ttl (intentional given different DTO shape).
- Terminal button keyboard shortcut: prototype shows `<span className="kbd">⌘T</span>` next to terminal button. Console omits this entirely.
- Recording button: prototype shows as text `"录像"` button. Console shows icon-only — no accessible label visible.
- "Current task" card: prototype conditionally renders a full task card (`当前任务`) with agent name, start time, command count. Console has **no task card** in `TabOverview`. The entire "当前任务" section is absent.

### Tab completeness
| Tab       | Prototype content                      | Console                                |
|-----------|----------------------------------------|----------------------------------------|
| Overview  | task card + resource bars + ports card + secrets card | resource bars (TODO stubs) + ports card (empty) + secrets card ✅ |
| Processes | full proc table with real data         | renders `t('common.comingSoon')` — "即将上线" shown to user |
| Ports     | full port list                         | renders `t('common.comingSoon')` stub  |
| Files     | file tree + code preview               | renders `t('common.comingSoon')` x2    |
| Network   | policy KV + hostlist + blocked list    | policy KV (partial) + blocked list stub ("即将上线") |
| Audit     | audit table                            | audit table ✅                         |

Note: "即将上线" is the zh translation of "Coming soon" and **is visible to end users** in Processes, Files, and Network (blocked) tabs.

### State dictionary issues
- `PageSandboxDetail.tsx:102`: `<Badge>{s.state}</Badge>` — raw API string rendered. Should use `t(\`state.${s.state}\`)`.

### Raw English leaks
- `PageSandboxDetail.tsx:102`: raw `{s.state}` in badge.
- `_sandboxes/DetailTabs.tsx:74`: `{t('detail.age')}: {fmtAge(s.created_at)} · profile: {s.profile} · ttl: {s.ttl_seconds}` — the words "profile:" and "ttl:" are **hardcoded English** strings not wrapped in `t()`. Also `detail.age` key is **not defined** in any i18n string file — `t('detail.age')` will fall back to the key string itself ("detail.age").
- `_sandboxes/DetailTabs.tsx:43`: `<ResRow label="Memory"` (English) instead of `t('detail.colMem')` or similar.
- `_sandboxes/DetailTabs.tsx:43`: `<ResRow label="Disk"` (English).
- `_sandboxes/DetailTabs.tsx:43`: `<ResRow label="Egress"` (English). All three ResRow labels are hardcoded English; prototype used `内存`, `磁盘`, `出站`.

### DS component vs prototype-inline mismatch
- Audit tab: prototype renders `count` as a `{ count: auditForThis.length }` prop on the tab item (rendered as a rounded `.count` badge via `TlnTabs`). Console uses inline `<span>` inside the label string (PageSandboxDetail.tsx:85-89). Visually similar but not using the design system's tab count styling.
- `detail.policy` KV: prototype uses `.hostlist` with allow/block icons via CSS `::before`. Console uses `<KV>` component which may not produce the same visual.

### CSS class mismatches
- Prototype `.actions` class on the detail header action group. Console uses `.det-actions`. No functional issue but CSS won't match if global stylesheets target `.actions`.

---

## Page: Secrets

### Missing/wrong regions
- Summary cards (4-up): **present** ✅. CSS renamed `.card` → `.sec-sum-card`, `.n` → `.snum`, `.delta` → `.sdelta`. All functionally equivalent.
- Filter bar: **present** ✅. But scope filtering is **broken**: `PageSecrets.tsx:35` only filters on `scope === 'rotate-due'`. The `tenant` and `sandbox` tab buttons exist but clicking them has no effect (no filter logic for those values). Selecting "空间范围" shows all secrets.
- Table: **present** ✅.

### Raw English leaks
- `_secrets/SecretRow.tsx:44`: `<span className="scope-pill">{t('secrets.filterTenant')}</span>` — scope pill is **hardcoded** to "空间范围" for every row regardless of actual scope. `SecretDTO.scope` field is ignored. Users see every secret showing "Workspace scope" even sandbox-scoped secrets.
- `_secrets/SecretRow.tsx`: `colUsed` column shows "—" hardcoded; prototype showed `TLNData.rel(...)`. Intentional (no last-used timestamp in DTO)?

### State dictionary issues
- No state dictionaries on this page. N/A.

### PageHeader props
- Prototype: `eyebrow="工作区 · 凭据"`. Console: `t('secrets.eyebrow')` = `'workspace · secrets'` (en) / `'工作区 · 凭据'` (zh) ✅.
- Prototype: `desc="KMS 加密静态存储…"`. Console: `t('secrets.desc')` ✅.

---

## Page: Workers

### Missing/wrong regions
- Summary cards (4-up): **present**. Prototype uses `.wkr-summary .card` class. Console uses `.wkr-sum-card`. Renamed but functionally equivalent.
- Region group table with error strip: **present** ✅ via `RegionGroup.tsx`.
- Region head globe icon color: prototype uses `var(--teal)`, console uses `var(--info)` (RegionGroup.tsx:39). Minor visual difference.

### State dictionary issues
- Worker status labels: prototype renders `w.state` as a `TlnBadge` with inline kind logic. Console uses `<WorkerStatusBadge status={w.status} label={t(STATUS_KEY[w.status])}>` — goes through i18n ✅.
- `workers.draining` zh: `'渡出中'` (proto) vs `'渡出中'` (workers.ts:9) — same ✅.
- `workers.unhealthy` zh: `'不健康'` (proto) vs `'不健康'` (workers.ts:10) — same ✅.

### Raw English leaks
- None confirmed.

### PageHeader props
- Prototype: `num="\${total} 个节点 · \${regions} 个区域"` (Chinese units inline). Console: `t('workers.nodesOf')` + `t('workers.regionsOf')` which produce English "nodes"/"regions" in en locale. In zh locale: `'个节点'`/`'个区域'` ✅.

---

## Page: Tenants

### Missing/wrong regions
- Table: **present** ✅. 7 columns.
- Quota column: prototype shows **two** progress bars (CPU + MEM). Console shows **one** bar (sandboxes / max_sandboxes). The CPU and MEM quota bars are absent because `TenantDTO` list response doesn't include per-resource quota details (PageTenants.tsx:99-103, comment confirms). Functionally degraded but bounded by API.
- Plan column: **always shows "Free"** (PageTenants.tsx:88). Prototype rendered dynamic plan from data. Intentional gap noted by `// plan not in list DTO` comment.
- Members column: hardcoded "—" (PageTenants.tsx:91). Same intentional gap.
- TenantDrawer: **present** via `_tenants/TenantDrawer.tsx`. Quota section has vCPU, Memory, Disk bars ✅. Members section ✅. Security KV ✅. Plan segmented control ✅.

### PageHeader props
- Prototype title: `"租户"`. Console: `t('tenants.title')` = `"空间"` (zh) / `"Workspaces"` (en). The page was consciously re-labeled from "Tenants/租户" to "Workspaces/空间". Mark as intentional UX rename.

---

## Page: Audit

### Missing/wrong regions
- Filter bar: **present** ✅. Wrapped in `<FilterBar>` DS component with `<Segmented>` for range. Same 6 filter tabs as prototype.
- Table with 7 columns: **present** ✅ (time, event, actor, target, result, meta, actions).
- Live stream indicator: prototype embeds the `● Live · …` string inline in `desc`. Console uses a `<span className="aud-stream-pill">` showing real WebSocket connection status. An improvement over prototype.
- Tenant column: prototype CSS defines `.aud-row .tenant-cell` but the prototype's own `tln-tbl-head` only has 6 named divs (`时间`, `事件`, `发起者`, `目标`, `结果`, `元信息`) — no "租户" column in the actual table header. The CSS `.tenant-cell` is unused in the prototype itself. Console matches the actual 7-column structure ✅.

### Raw English leaks
- `AuditRow.tsx:28-30`: `relTime` returns `"\${n}s ago"`, `"\${n}m ago"`, `"\${n}h ago"` — hardcoded English "ago". Prototype used `TLNData.rel()` (Chinese: `"刚刚"`, `"3 分钟前"` etc.). Same issue in `PageRecordings.tsx:20-22`.
- `AuditRow.tsx:94`: `{event.outcome}` is the badge text. `outcome` values are "ok" / "err" raw strings. Should be translated.

### PageHeader props
- Console: `eyebrow`, `title`, `desc`, `actions` all through i18n ✅. Matches prototype structure.

---

## Page: Recordings (list)

### Missing/wrong regions
- Table: **present** ✅. 7 columns matching prototype exactly.
- Agent filter bar: **present** (admin only) ✅.
- Sandbox column: prototype shows `sandboxId · sandboxName` concatenated. Console shows only `r.sandbox_id`. Missing the sandbox name suffix. Minor display difference.

### Raw English leaks
- `PageRecordings.tsx:20-22`: `relTime` returns English "s ago", "m ago", "h ago" in the Started column. Prototype showed Chinese relative time.

### PageHeader props
- `num` prop: prototype `"\${n} 个会话"` (Chinese unit). Console `"\${items.length}"` (bare number). Missing "个会话" suffix.

---

## Page: Recording (playback)

### Missing/wrong regions
- The entire bespoke playback UI (`.recp-stage`, `.recp-side`, `.recp-bot`) is replaced by `<RecordingPlayer>` from `@talon-sandbox/react`. This is an intentional DS-component substitution — acceptable if `RecordingPlayer` faithfully reproduces the prototype markup/behavior.
- `EMPTY_FRAMES` array is hardcoded (`PageRecording.tsx:21`): `const EMPTY_FRAMES: RecordingFrame[] = []`. The player renders with no frames. A comment (`TODO: add GET /v1/recordings/{id}/frames`) confirms this is a **known backend gap**. The playback page is non-functional — only the chrome renders, no actual recording content.
- The sidebar "Agent Steps" panel is prototype-specific; whether `RecordingPlayer` includes this depends on the DS implementation.
- Copy-share-link and Export `.cast` actions: present in prototype header; console passes to `RecordingPlayer` via props — likely present but depends on DS component API.

### Raw English leaks
- `PageRecording.tsx:39`: `{t('recordings.loadingPlayer')}` — properly i18n'd ✅.

### PageHeader props
- No `PageHeader` on this page (full-bleed, custom chrome). Consistent with prototype.

---

## Page: Terminal

### Missing/wrong regions
- Bottom status bar: prototype shows `pid 4128 · node@9d3 · {image}` on left, `utf-8 · 80×24 · ● 已连接` on right. Console shows `{image_id}` on left, `utf-8 · {cols}×{rows} · connected/disconnected` on right. **Missing**: PID, node identifier. Likely intentional (not available from DTO).
- "主 shell" tab name: prototype hardcodes "主 shell". Console uses profile name from DTO. Intentional improvement.
- Fake shell commands: prototype embedded a full mock shell for demo. Console uses real WebSocket PTY via `TerminalBody`. Intentional improvement.

### Raw English leaks
- None — all chrome text is through `t()`.

### PageHeader props
- No `PageHeader` (full-bleed). Consistent with prototype.

---

## Page: Login

### Missing/wrong regions
- Left panel: code block, tagline, stats footer — **present** ✅.
- Right panel: the auth flow changed. Prototype: email + password (with "忘记?" link). Console: email + OTP code (send-code → 6-digit verify). This is an **intentional auth redesign** (OTP vs password). The tab labels changed from "邮箱" / "API key" to "邮箱验证码" / "API key".
- SSO buttons: GitHub + Google present ✅. The buttons are inert ("TODO: request access flow" noted in comment).
- Default email pre-fill: prototype hardcodes `ada@acme.dev`. Console hardcodes `admin@talon.dev`. Both are mock defaults; console value is more appropriate.
- The "忘记密码" link: removed because the OTP flow eliminates passwords. Intentional.

### Raw English leaks
- None; all strings through i18n ✅.

---

## Cross-page Issues

### i18n Dictionary missing keys
1. `detail.age` — used in `_sandboxes/DetailTabs.tsx:74` via `t('detail.age')`, not defined anywhere in `src/i18n/strings/`. Will render as literal string "detail.age".
2. `state.provisioning` zh label mismatch: `common.ts` has `'配置中'`; prototype has `'调度中'`. Semantically different (configuring vs. scheduling/dispatching).

### Raw state strings rendered without i18n (enumerated)
| File | Line | What |
|------|------|------|
| `PageSandboxes.tsx` | 78 | `<Badge>{s.state}</Badge>` — raw API string |
| `PageSandboxDetail.tsx` | 102 | `<Badge>{s.state}</Badge>` — raw API string |
| `_sandboxes/DetailTabs.tsx` | 185 | `<Badge>{e.outcome}</Badge>` — raw "ok"/"err" |
| `_sandboxes/DetailTabs.tsx` | 43 | ResRow labels "Memory", "Disk", "Egress" hardcoded English |
| `_sandboxes/DetailTabs.tsx` | 74 | "profile:" and "ttl:" hardcoded English prefixes |
| `AuditRow.tsx` | 28-30 | `relTime` returns "s ago", "m ago", "h ago" English |
| `PageRecordings.tsx` | 20-22 | Same `relTime` English "ago" pattern |
| `AuditRow.tsx` | ~90 | `<Badge>{event.outcome}</Badge>` — raw "ok"/"err" |

### Scope filter regression (Secrets page)
`PageSecrets.tsx` filter logic (line 35) only acts on `rotate-due`. Clicking "空间范围" or "Sandbox 范围" tabs shows all secrets unfiltered. The scope field on `SecretDTO` is not filtered against. `SecretRow.tsx:44` hardcodes scope pill label to "空间范围" for every row.

### Functional stubs visible to users
Three tabs in `PageSandboxDetail` render `t('common.comingSoon')` = "即将上线" to end users:
- Processes tab (DetailTabs.tsx:96)
- Files tab (DetailTabs.tsx:126, 131)
- Network → blocked requests section (DetailTabs.tsx:153)

### Recording playback non-functional
`PageRecording.tsx:21,70` passes `EMPTY_FRAMES` to `<RecordingPlayer>`. No recording content is ever rendered. Backend endpoint `GET /v1/recordings/{id}/frames` does not yet exist.

---

## Recommended Fix Order

### CRITICAL — visible to users, breaks labels or function
1. **`PageSandboxes.tsx:78` + `PageSandboxDetail.tsx:102`** — `<Badge>{s.state}</Badge>` renders raw English state keys ("pulling-image", "provisioning"). Replace with `t(\`state.${s.state}\`)`.
2. **`_sandboxes/DetailTabs.tsx:185`** — `<Badge>{e.outcome}</Badge>` renders raw "ok"/"err". Add outcome i18n keys and translate.
3. **`PageSecrets.tsx` scope filter broken** — tenant/sandbox scope filter tabs are non-functional. Add filter logic for `s.scope` field.
4. **`_secrets/SecretRow.tsx:44` scope pill hardcoded** — always shows "空间范围". Map actual scope field to appropriate translated label.
5. **`AuditRow.tsx:28-30` + `PageRecordings.tsx:20-22`** — `relTime` returns English "ago". Use a shared i18n-aware relative time helper, or at minimum suffix with `t('common.ago')` (key to be added).
6. **`state.provisioning` zh label**: `common.ts` has `'配置中'`; prototype has `'调度中'`. These mean different things. Align on one term — `'调度中'` matches the prototype design intent (scheduling, not configuring).

### IMPORTANT — wrong text, missing content, degraded UX
7. **`detail.age` key missing from i18n** — `DetailTabs.tsx:74` calls `t('detail.age')` which has no definition. Add key `'detail.age': { en: 'Age', zh: '运行时长' }` to `sandboxes.ts`.
8. **ResRow labels in English** — `DetailTabs.tsx:43` has `label="Memory"`, `label="Disk"`, `label="Egress"`. Use existing i18n keys `'detail.colMem'`, `'detail.disk'`, and add a key for egress.
9. **"profile:" and "ttl:" hardcoded English** — `DetailTabs.tsx:74` embeds English labels. Wrap in i18n or use existing translated keys.
10. **Detail header missing tenant tag** — prototype showed `<TlnTag>{s.tenant}</TlnTag>` in `.id-row`. Console omits it. Users cannot see which tenant a sandbox belongs to on the detail page.
11. **Detail info-row missing fields** — `node`, `region`, `uptime/age`, `disk` absent from detail meta bar. Add when API provides these fields; mark clearly with "—" placeholder in the meantime rather than omitting the labels.
12. **Running-now list shows state label, not elapsed time** — `PageDashboard.tsx:327` shows `t(\`state.${s.status}\`)` in the "age" column. Prototype showed minutes running (`NNm`). Different semantic — should show elapsed time or duration, not state.
13. **Sandbox list `num` prop loses Chinese units** — `PageSandboxes.tsx:140` renders `"\${active} / \${all}"`. Prototype: `"\${active} 运行中 / \${all} 总数"`. Add units via i18n.
14. **Recording list `num` prop loses unit** — `PageRecordings.tsx:105` renders bare count. Prototype used `"\${n} 个会话"`.

### POLISH — minor visual differences
15. **`.states-bar` height**: prototype 8px → console 6px (`PageDashboard.css:70`). Update to 8px to match design.
16. **Dashboard "刚刚更新" position**: prototype puts it in card `action` slot (top-right header). Console puts it in `footer` slot (bottom). Consider moving to header to match prototype.
17. **Dashboard / Audit "查看全部" button position**: same `action` → `footer` shift as above.
18. **Region head globe icon color**: prototype `var(--teal)`, console `var(--info)` (`RegionGroup.tsx:39`).
19. **Terminal bottom bar missing PID and node identifier** — prototype shows `pid 4128 · node@9d3`. Console shows only `image_id`. Minor but present in design.
20. **Tenants quota column shows only sandbox bar** — prototype showed CPU + MEM bars inline. Console shows only sandbox count / max. Bounded by API data availability; mark as P2 when `TenantDTO` gains quota detail.
