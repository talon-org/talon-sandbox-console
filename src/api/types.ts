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
  prefs?: string;        // 偏好原始 JSON 串 {"lang":..,"theme":..}；空时省略
  preview_suffix?: string;
  quota?: MeQuota;       // 当前租户配额上限(创建 sandbox 时限定可选最大值);0=不限
}

/** 当前租户资源配额上限(来自 /v1/auth/me)。0 表示不限。 */
export interface MeQuota {
  vcpu: number;          // 最大 vCPU(核)
  mem_gb: number;        // 最大内存(GiB)
  disk_gb: number;       // 最大磁盘(GiB)
  max_sandboxes: number; // 最大并发 sandbox 数
}

/** 用户偏好（解析自 MeResponse.prefs）。 */
export interface UserPrefs {
  lang?: 'en' | 'zh';
  theme?: 'light' | 'dark' | 'system';
}

/** PATCH /v1/auth/me 请求体。两字段都可选 = 部分更新。 */
export interface UpdateMeRequest {
  name?: string;
  prefs?: UserPrefs;
}

/** GET /v1/tenant —— owner 视角的「我的组织/空间」。 */
export interface WorkspaceDTO {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: number;   // Unix seconds
  member_count: number;
}

/** PATCH /v1/tenant 请求体。owner 改组织名。 */
export interface UpdateWorkspaceRequest {
  name?: string;
}

// ── Baseimages ────────────────────────────────────────────────────────────────

/** Baseimage 从 GET /v1/images. dto.go ImageDTO 的 console 侧契约 */
export interface ImageDTO {
  id: string;
  name: string;
  url: string;
  sha256: string;
  os: string;            // "linux"
  arch: string;          // "amd64" / "arm64"
  source: 'builtin' | 'admin';
  is_default: boolean;
  description?: string;
  created_at: number;    // unix epoch sec
}

export interface ImageListResponse {
  images: ImageDTO[];
}

/** POST /v1/admin/images 请求体. dto.go CreateImageRequest */
export interface CreateImageRequest {
  name: string;          // 必填,全局唯一(同时是 worker 缓存目录 key)
  url: string;           // 必填,必须 https,公网域名
  sha256: string;        // 必填,64 位小写 hex
  os?: string;           // 可选,默认 linux
  arch?: string;         // 可选,默认 amd64
  description?: string;  // 可选
  is_default?: boolean;  // 可选,默认 false
}

/** POST /v1/admin/images/probe 响应. dto.go ProbeImageResponse
 * 服务端代理读 <url>.sha256 + 从 url 解析 arch(绕开浏览器跨域 CORS)。 */
export interface ProbeImageResponse {
  sha256: string;
  arch?: string;
}

/** 镜像异步准备进度阶段. image_progress_handlers.go 的 stage 枚举 */
export type ImageStage =
  | 'unknown'
  | 'pending'
  | 'downloading'
  | 'verifying'
  | 'extracting'
  | 'ready'
  | 'failed';

/** GET /v1/images/{id}/status. dto.go ImageStatusDTO */
export interface ImageStatusDTO {
  image_id: string;
  stage: ImageStage;
  bytes_downloaded: number;
  bytes_total: number;        // -1 = 服务端未返 Content-Length(进度未知)
  extracted_entries: number;
  started_at?: string;        // RFC3339;空表示未开始
  updated_at?: string;        // RFC3339
  err?: string;               // 仅 stage === 'failed' 非空(非 admin 被脱敏)
}

// ── Sandboxes ─────────────────────────────────────────────────────────────────

export type SandboxState =
  | 'created' | 'running' | 'pulling-image' | 'provisioning' | 'idle'
  | 'paused' | 'terminating' | 'failed' | 'evicted' | 'stopped' | 'destroyed'
  // 后端还会返回这些(reserving=调度占位 / exited=进程退出 / killed=被杀 /
  // lost=失联 / unknown=未知),前端必须全覆盖,否则 StatusPill 渲染会崩。
  | 'reserving' | 'exited' | 'killed' | 'lost' | 'unknown';

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
  // G2 (v30)：sandbox 扩展字段
  name?: string;                       // 用户自定义名称；空 = 未命名
  task?: string;                       // 当前任务描述（自由文本）
  network_allowed_hosts?: string[];    // allowlist 模式下允许访问的主机列表
  worker_id?: string;                  // 承载此 sandbox 的 worker id
  tenant_id?: string;                  // 所属租户 id（管理员视角可见）
  // 来源追踪（后端 omitempty 扩展字段；旧记录 / 未采集时可能全缺失）
  created_by?: string;                 // 创建者标识：JWT user_id 或 api_key_id
  created_by_type?: 'jwt' | 'api_key'; // 创建者类型：用户登录态 or API Key
  api_key_id?: string;                 // 经 API Key 创建时的 key id；JWT 创建则空
  created_from?: SandboxOrigin;        // 创建渠道：web-console / sdk-* / cli / api
  remote_ip?: string;                  // 创建请求来源 IP
  user_agent?: string;                 // 创建请求 User-Agent（SDK 自报 / 浏览器 UA）
}

/** sandbox 创建渠道枚举（created_from）。后端取值固定如下，未知值前端兜底展示原串。 */
export type SandboxOrigin =
  | 'web-console'
  | 'sdk-python' | 'sdk-go' | 'sdk-typescript' | 'sdk-rust' | 'sdk-dotnet'
  | 'cli' | 'api';

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
  // Used with network="allowlist" to whitelist outbound hosts (supports * wildcard).
  // Field name mirrors backend dto.CreateRequest; backend uses DisallowUnknownFields
  // so any alias will be rejected with 400.
  network_allowed_hosts?: string[];
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
  // G5 (v30)：secrets 扩展字段
  scope?: 'tenant' | 'sandbox';   // 派生字段；undefined = tenant（旧记录兼容）
  last_used_at?: number;           // Unix seconds; 0 / absent = never used
  created_by?: string;             // JWT user_id；空 = API Key / 旧记录
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

/** POST /v1/admin/workers/invite response (G6) */
export interface WorkerInviteResponse {
  token: string;      // 明文单次令牌，需立即展示给管理员
  expires_at: string; // RFC3339
}

// ── Processes ─────────────────────────────────────────────────────────────────

/** Single process from GET /v1/sandboxes/{id}/processes */
export interface ProcessDTO {
  id: string;
  sandbox_id: string;
  command: string[];
  pid: number;
  state: string;       // running / exited / killed / failed
  exit_code: number;   // -1 = 信号终止
  started_at: number;  // Unix seconds
  exited_at: number;   // Unix seconds; 0 = 尚未退出
  expose_ports?: number[];
  host_ports?: Record<number, number>;
  // G1 (v30)：每进程资源用率（worker 每 5s 采样）
  cpu_pct?: number;    // 0-100；旧 worker 不填
  mem_mb?: number;     // 物理内存 MB；旧 worker 不填
}

/** GET /v1/sandboxes/{id}/processes response */
export interface ProcessListResponse {
  processes: ProcessDTO[];
}

// ── Tenants / Workspaces ──────────────────────────────────────────────────────

/** Single tenant from GET /v1/admin/tenants list */
export interface TenantDTO {
  id: string;
  name: string;
  created_at: number;   // Unix seconds
  quota_max_sandboxes: number;
  active_sandboxes: number;
  /** 套餐 code，指向 plans 表（超管可自定义，如 free/team/starter/enterprise）。
   *  列表响应扩展字段；旧响应可能缺失。 */
  plan?: string;
  /** 套餐显示名（plans 表 name）；列表端点扩展，缺失时前端回退用 plan code。 */
  plan_name?: string;
  member_count?: number;                    // G4 (v30)：该租户的用户数（列表端点扩展）
  /** 套餐配额上限，0 表示不限；列表端点扩展字段，旧响应可能缺失 */
  quota?: TenantQuotaDTO;
  /** 当前活跃 sandbox 聚合用量；列表端点扩展字段，旧响应可能缺失 */
  usage?: TenantUsageDTO;
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
  plan: string;         // 套餐 code，指向 plans 表（超管可自定义）
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
  plan?: string;        // 套餐 code，指向 plans 表；省略时后端落默认套餐
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
  outcome?: string;   // "success" | "failure" | ""；前端据此染色
  target?: string;    // 事件作用对象（sandbox_id / secret_id / 邮箱等）
}

export interface DashboardSandbox {
  id: string;
  name: string;
  image: string;
  status: string;
  tenant: string;
  created_at?: string;   // RFC3339；后端 T10 扩展字段，用于计算 age 列
  cpu_millis?: number;   // 1/1000 vCPU；0/缺省 = worker 默认
  memory_bytes?: number; // 内存上限 byte；0/缺省 = worker 默认
  network_policy?: string; // offline | restricted-egress | full-egress | ""
}

/** GET /v1/metrics/dashboard response (T10) */
export interface DashboardResponse {
  summary: DashboardSummary;
  states_by_count: Record<string, number>;
  quota_24h: DashboardQuota24h;
  recent_activity: DashboardActivity[];
  running_sandboxes: DashboardSandbox[];
}

// ── Exposed Ports (Spec 50) ───────────────────────────────────────────────────

/** POST /v1/sandboxes/{id}/expose 请求体 */
export interface ExposeRequest {
  port: number;
  sign?: boolean;        // 是否签发带 token 的 signed URL
  ttl?: string;          // 如 "1h"，仅 sign=true 时有效
  subdomain?: string;    // 自定义子域，空 = 自动生成
}

/** POST /v1/sandboxes/{id}/expose 响应体 */
export interface ExposeResponse {
  port: number;
  url: string;
  signed: boolean;
  expires_at: string;    // RFC3339 或空字符串
}

/** GET /v1/sandboxes/{id}/expose 的单条端口记录 */
export interface ExposedPortDTO {
  port: number;
  url: string;
  signed?: boolean;
  expires_at?: string;   // RFC3339，仅 signed 时有值
  created_at?: string;   // RFC3339，仅 explicit 时有值
  source: string;        // "explicit" | "dynamic"
}

/** GET /v1/sandboxes/{id}/expose 响应体 */
export interface ExposedPortListResponse {
  ports: ExposedPortDTO[];
}

// ── Files (Spec 35) ───────────────────────────────────────────────────────────

/** fs-list 单条目录项 */
export interface FSEntry {
  name: string;
  size: number;       // bytes
  mod_time: number;   // Unix 秒
  is_dir: boolean;
}

/** GET /v1/sandboxes/{id}/fs-list/{path} 响应体 */
export interface FSListResponse {
  entries: FSEntry[];
  total: number;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

/** GET /v1/api-keys 列表中的单条记录 */
export interface ApiKeyDTO {
  id: string;
  label: string;
  /** 掩码，如 ask_1xaE…uOWk；列表中永远不返回明文 */
  masked: string;
  /** true = 可调 reveal 端点取完整 key；false = 旧 key 不可恢复 */
  can_reveal: boolean;
  created_at: number;   // Unix 秒
  last_used?: number;   // Unix 秒；0 / absent = 从未使用
}

/** GET /v1/api-keys 响应体 */
export interface ApiKeyListResponse {
  keys: ApiKeyDTO[];
}

/** POST /v1/api-keys 请求体 */
export interface CreateApiKeyRequest {
  label: string;
}

/** POST /v1/api-keys 响应体（明文 api_key 只此一次） */
export interface CreateApiKeyResponse {
  id: string;
  label: string;
  api_key: string;     // 明文
  created_at: number;  // Unix 秒
}

/** GET /v1/api-keys/{id}/reveal 响应体 */
export interface RevealApiKeyResponse {
  api_key: string;     // 完整明文
}

// ── Plans（套餐管理，超管专用）──────────────────────────────────────────────────

/** 单条套餐，来自 GET /v1/admin/plans */
export interface PlanDTO {
  code: string;               // 套餐唯一标识，如 "free" / "team" / "enterprise"
  name: string;               // 显示名称
  quota_max_sandboxes: number;
  quota_vcpu: number;
  quota_mem_gb: number;
  quota_disk_gb: number;
  is_default: boolean;
  is_active: boolean;
  // 计费定价（migrate_v37）
  price_cents: number;        // 单价，最小货币单位（分）；0 = 免费
  currency: string;           // ISO 4217 货币码小写（usd / cny）；免费档可空
  billing_interval: string;   // month / year；空 = 免费档不计费
  stripe_price_id: string;    // Stripe Price ID；空 = 未接 Stripe
}

/** GET /v1/admin/plans 响应体 */
export interface PlanListResponse {
  plans: PlanDTO[];
}

/** POST /v1/admin/plans 请求体（新建或编辑，不含 is_default） */
export interface UpsertPlanRequest {
  code: string;
  name: string;
  quota_max_sandboxes: number;
  quota_vcpu: number;
  quota_mem_gb: number;
  quota_disk_gb: number;
  is_active: boolean;
  // 计费定价（migrate_v37）
  price_cents: number;
  currency: string;
  billing_interval: string;
  stripe_price_id: string;
}

/** PATCH /v1/admin/plans/{code} 请求体（仅设默认） */
export interface SetDefaultPlanRequest {
  set_default: true;
}

// ── Billing（租户侧计费：用量 / 订阅 / 可选套餐 / 升降级）─────────────────────────
// 与超管 /v1/admin/plans 区分：以下走租户可读端点 /v1/usage、/v1/billing/*、/v1/plans。

/** 面向租户的套餐展示视图（GET /v1/plans，仅 active，不含 stripe_price_id） */
export interface PublicPlanDTO {
  code: string;
  name: string;
  quota_max_sandboxes: number;
  quota_vcpu: number;
  quota_mem_gb: number;
  quota_disk_gb: number;
  price_cents: number;
  currency: string;
  billing_interval: string;   // month / year / ''（免费）
}

export interface PublicPlanListResponse {
  plans: PublicPlanDTO[];
}

/** 租户订阅状态（GET /v1/billing/subscription） */
export interface SubscriptionDTO {
  provider: string;            // stripe / manual
  plan_code: string;
  status: string;              // active | past_due | canceled | none
  current_period_end: number;  // Unix 秒；0 = 无
}

/** 单日用量（GET /v1/usage 的 days[] / total） */
export interface UsageDayDTO {
  date: string;                // YYYY-MM-DD（total 留空）
  cpu_milli_seconds: number;
  memory_byte_seconds: number;
  disk_byte_seconds: number;
  sandbox_seconds: number;
  request_count: number;
}

export interface UsageResponse {
  since: string;
  until: string;
  days: UsageDayDTO[];
  total: UsageDayDTO;
}

/** POST /v1/billing/upgrade-plan 请求体 */
export interface UpgradePlanRequest {
  plan_code: string;
  success_url?: string;
  cancel_url?: string;
}

/** POST /v1/billing/upgrade-plan 响应：免费档 applied=true；付费档返回 checkout_url */
export interface UpgradePlanResponse {
  applied: boolean;
  checkout_url?: string;
  plan_code: string;
}

// ── Members & Invitations (自助团队成员管理) ────────────────────────────────────
// 与 sandbox-api 的 /v1/tenants/{tenant_id}/members、/invitations 契约对齐。
// 注意：这是租户内自助端点，区别于超管的 /v1/admin/tenants/{id}（后者 members 内嵌在 detail）。

export type MemberRole = 'owner' | 'admin' | 'developer';

/** 单个成员（GET /v1/tenants/{id}/members） */
export interface MemberDTO {
  id: string;
  email: string;
  name?: string;
  role: MemberRole;
  status?: string;       // 例如 active；后端可能不返回
  joined_at: number;     // Unix 秒
}

export interface MemberListResponse {
  members: MemberDTO[];
}

/** PATCH /v1/tenants/{id}/members/{user_id} 请求体 */
export interface UpdateMemberRoleRequest {
  role: MemberRole;
}

/** 单个待处理邀请（GET / POST /v1/tenants/{id}/invitations） */
export interface InvitationDTO {
  id: string;
  email: string;
  role: MemberRole;
  status: string;        // pending / accepted / revoked / expired
  created_at: number;    // Unix 秒
  expires_at: number;    // Unix 秒
  /** 仅在后端未配置邮件发送时返回，需前端展示让用户手动复制 */
  accept_url?: string;
}

export interface InvitationListResponse {
  invitations: InvitationDTO[];
}

/** POST /v1/tenants/{id}/invitations 请求体 */
export interface CreateInvitationRequest {
  email: string;
  role: MemberRole;
}

/** POST /v1/invitations/accept 请求体（公开端点，无需登录） */
export interface AcceptInvitationRequest {
  token: string;
  name?: string;
}

/** POST /v1/invitations/accept 响应 */
export interface AcceptInvitationResponse {
  email: string;
  tenant_id: string;
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

// --- 平台配置中心(Spec 52)---

/** 一个配置项的脱敏展示。secret 项不含 value,只回 masked + set。 */
export interface PlatformSettingItem {
  key: string;
  value?: string;     // 非 secret 项明文值
  is_secret: boolean;
  set: boolean;       // 是否已配置(DB 或 env 有有效值)
  masked?: string;    // secret 项脱敏摘要,如 "····7c64"
  source: 'db' | 'env' | 'unset';
  updated_at?: string;
  updated_by?: string;
}

export interface PlatformSettingsResponse {
  settings: PlatformSettingItem[];
}

/** 一次配置写入项。value 为空串 → 清除该项(回落 env)。 */
export interface PlatformSettingChange {
  key: string;
  value: string;
}

export interface UpdatePlatformSettingsRequest {
  settings: PlatformSettingChange[];
}
