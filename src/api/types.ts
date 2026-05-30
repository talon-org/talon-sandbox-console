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
  // G2 (v30)：sandbox 扩展字段
  name?: string;                       // 用户自定义名称；空 = 未命名
  task?: string;                       // 当前任务描述（自由文本）
  network_allowed_hosts?: string[];    // allowlist 模式下允许访问的主机列表
  worker_id?: string;                  // 承载此 sandbox 的 worker id
  tenant_id?: string;                  // 所属租户 id（管理员视角可见）
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
  plan?: 'free' | 'team' | 'enterprise';   // backend-gaps G4：列表响应已扩展此字段
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
  created_at?: string;   // RFC3339；后端 T10 扩展字段，用于计算 age 列
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
}

/** PATCH /v1/admin/plans/{code} 请求体（仅设默认） */
export interface SetDefaultPlanRequest {
  set_default: true;
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
