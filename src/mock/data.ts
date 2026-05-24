/* Static mock data — used until real API endpoints are ready.
 * TODO: replace each usage with apiGet calls when endpoints are available.
 */

const now = Date.now();
const ago = (sec: number): string => new Date(now - sec * 1000).toISOString();

export function relTime(sec: number): string {
  if (sec < 60) return sec + 's ago';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

export type SandboxState =
  | 'running' | 'pulling-image' | 'provisioning' | 'idle'
  | 'paused' | 'terminating' | 'failed' | 'evicted';

export interface MockSandbox {
  id: string;
  name: string;
  image: string;
  tenant: string;
  state: SandboxState;
  createdAt: string;
  ageSec: number;
  cpu?: number; cpuLimit?: number;
  mem?: number; memLimit?: number;
  disk?: number; diskLimit?: number;
  egressKBs?: number;
  worker?: string;
  region?: string;
  pullProgress?: number;
  failureReason?: string;
  ports?: { port: number; proto: string; label: string; exposed: boolean; url?: string }[];
  processes?: { pid: number; name: string; cmd: string; cpu: string; mem: string; user: string }[];
  network?: { policy: string; allowed: string[]; blocked: number };
  secrets?: string[];
  task?: string;
}

export const MOCK_SANDBOXES: MockSandbox[] = [
  {
    id: 'sb_42a1', name: 'next-dev', image: 'node:20-bookworm', tenant: 'acme · prod',
    state: 'running', createdAt: ago(724), ageSec: 724,
    cpu: 1.24, cpuLimit: 2, mem: 1542, memLimit: 4096, disk: 2.9, diskLimit: 12, egressKBs: 1742,
    worker: 'wkr-eu-01', region: 'eu-fra-1',
    ports: [
      { port: 5173, proto: 'http', label: 'vite dev', exposed: true, url: 'https://sb-42a1-5173.preview.talon.dev' },
      { port: 5174, proto: 'ws', label: 'hmr', exposed: true },
      { port: 9229, proto: 'tcp', label: 'node insp', exposed: false },
    ],
    processes: [
      { pid: 4128, name: 'node', cmd: 'node /workspace/node_modules/vite/bin/vite.js', cpu: '14%', mem: '512 MiB', user: 'node' },
      { pid: 4135, name: 'esbuild', cmd: 'esbuild --service=0.21.4', cpu: '3%', mem: '128 MiB', user: 'node' },
      { pid: 4012, name: 'shell', cmd: '/bin/bash --login', cpu: '0%', mem: '4 MiB', user: 'node' },
      { pid: 4001, name: 'init', cmd: '/sbin/talon-init', cpu: '0%', mem: '2 MiB', user: 'root' },
    ],
    network: { policy: 'allowlist', allowed: ['api.acme.dev', 'registry.npmjs.org', '*.github.com'], blocked: 12 },
    secrets: ['GITHUB_TOKEN', 'STRIPE_API_KEY'],
    task: 'Building Next.js dashboard · agent: Claude Sonnet 4.5',
  },
  {
    id: 'sb_9c0e', name: 'data-analysis', image: 'python:3.12-slim', tenant: 'acme · prod',
    state: 'running', createdAt: ago(134), ageSec: 134,
    cpu: 3.42, cpuLimit: 4, mem: 5210, memLimit: 8192, disk: 1.8, diskLimit: 8, egressKBs: 84,
    worker: 'wkr-us-04', region: 'us-iad-1',
    ports: [{ port: 8888, proto: 'http', label: 'jupyter', exposed: true }],
    task: 'Running pandas analysis on Q4 sales data',
  },
  {
    id: 'sb_71f3', name: 'code-review-217', image: 'ubuntu:24.04', tenant: 'acme · staging',
    state: 'pulling-image', createdAt: ago(8), ageSec: 8, pullProgress: 0.34,
    task: 'Cloning github.com/acme/api · running lint',
  },
  {
    id: 'sb_5b8d', name: 'failed-build', image: 'custom-ai:latest', tenant: 'labs',
    state: 'failed', createdAt: ago(221), ageSec: 221,
    failureReason: 'Image pull failed · ECR access denied',
    task: 'Training tinyllama on toy dataset',
  },
  {
    id: 'sb_3a07', name: 'idle-shell', image: 'node:20-bookworm', tenant: 'acme · prod',
    state: 'idle', createdAt: ago(3724), ageSec: 3724,
  },
  {
    id: 'sb_8d12', name: 'web-scrape', image: 'python:3.12-slim', tenant: 'labs',
    state: 'provisioning', createdAt: ago(3), ageSec: 3, task: 'Allocating worker…',
  },
  {
    id: 'sb_4c5f', name: 'pdf-extract', image: 'python:3.12-slim', tenant: 'acme · prod',
    state: 'terminating', createdAt: ago(1820), ageSec: 1820,
  },
  {
    id: 'sb_1e93', name: 'old-session', image: 'ubuntu:22.04', tenant: 'labs',
    state: 'evicted', createdAt: ago(86400 * 3), ageSec: 86400 * 3,
  },
];

export interface MockWorker {
  id: string; region: string; state: string;
  cpu: number; mem: number; disk: number;
  sandboxes: number; capacity: number; uptimeSec: number;
  lastError?: string;
}

export const MOCK_WORKERS: MockWorker[] = [
  { id: 'wkr-eu-01', region: 'eu-fra-1', state: 'healthy',   cpu: 28, mem: 42, disk: 18, sandboxes: 14, capacity: 24, uptimeSec: 86400 * 7 + 4321 },
  { id: 'wkr-eu-02', region: 'eu-fra-1', state: 'healthy',   cpu: 51, mem: 64, disk: 22, sandboxes: 19, capacity: 24, uptimeSec: 86400 * 7 + 4400 },
  { id: 'wkr-eu-03', region: 'eu-fra-1', state: 'draining',  cpu: 12, mem: 24, disk: 8,  sandboxes: 4,  capacity: 24, uptimeSec: 86400 * 14 },
  { id: 'wkr-us-04', region: 'us-iad-1', state: 'healthy',   cpu: 72, mem: 81, disk: 34, sandboxes: 22, capacity: 24, uptimeSec: 86400 * 2 + 1024 },
  { id: 'wkr-us-05', region: 'us-iad-1', state: 'healthy',   cpu: 34, mem: 48, disk: 14, sandboxes: 11, capacity: 24, uptimeSec: 86400 * 2 + 1100 },
  { id: 'wkr-us-06', region: 'us-iad-1', state: 'unhealthy', cpu: 96, mem: 94, disk: 78, sandboxes: 23, capacity: 24, uptimeSec: 3214, lastError: 'OOMKilled · scheduler will drain' },
  { id: 'wkr-ap-07', region: 'ap-tyo-1', state: 'healthy',   cpu: 18, mem: 22, disk: 6,  sandboxes: 8,  capacity: 24, uptimeSec: 86400 * 12 },
  { id: 'wkr-ap-08', region: 'ap-tyo-1', state: 'healthy',   cpu: 41, mem: 52, disk: 16, sandboxes: 13, capacity: 24, uptimeSec: 86400 * 12 + 50 },
];

export interface MockTenant {
  id: string; name: string; plan: string;
  members: number; sandboxesActive: number; sandboxesAllTime: number;
  quota: { vCPU: number; vCPUUsed: number; memGB: number; memGBUsed: number; diskGB: number; diskGBUsed: number };
  createdAt: string;
  members_list: { email: string; role: string; joined: string }[];
  suspended?: boolean;
  suspendReason?: string;
}

export const MOCK_TENANTS: MockTenant[] = [
  {
    id: 'acme', name: 'Acme · Inc.', plan: 'Enterprise',
    members: 28, sandboxesActive: 18, sandboxesAllTime: 4128,
    quota: { vCPU: 48, vCPUUsed: 14.8, memGB: 96, memGBUsed: 42, diskGB: 200, diskGBUsed: 87 },
    createdAt: ago(86400 * 312),
    members_list: [
      { email: 'ada@acme.dev', role: 'admin', joined: ago(86400 * 312) },
      { email: 'grace@acme.dev', role: 'admin', joined: ago(86400 * 270) },
      { email: 'linus@acme.dev', role: 'member', joined: ago(86400 * 180) },
      { email: 'maya@acme.dev', role: 'member', joined: ago(86400 * 90) },
      { email: 'agent@acme.dev', role: 'agent', joined: ago(86400 * 12) },
    ],
  },
  {
    id: 'labs', name: 'Talon Labs', plan: 'Team',
    members: 4, sandboxesActive: 3, sandboxesAllTime: 612,
    quota: { vCPU: 16, vCPUUsed: 8.2, memGB: 32, memGBUsed: 14, diskGB: 80, diskGBUsed: 22 },
    createdAt: ago(86400 * 92),
    members_list: [
      { email: 'jamie@labs.dev', role: 'admin', joined: ago(86400 * 92) },
      { email: 'rin@labs.dev', role: 'member', joined: ago(86400 * 70) },
    ],
  },
  {
    id: 'studios', name: 'Studios', plan: 'Team',
    members: 6, sandboxesActive: 0, sandboxesAllTime: 41,
    quota: { vCPU: 16, vCPUUsed: 0, memGB: 32, memGBUsed: 0, diskGB: 80, diskGBUsed: 4 },
    createdAt: ago(86400 * 28),
    members_list: [],
  },
  {
    id: 'demo', name: 'Demo · Trial', plan: 'Free',
    members: 1, sandboxesActive: 0, sandboxesAllTime: 3,
    quota: { vCPU: 2, vCPUUsed: 0, memGB: 4, memGBUsed: 0, diskGB: 8, diskGBUsed: 0.5 },
    createdAt: ago(86400 * 2),
    suspended: true, suspendReason: 'Email not verified',
    members_list: [],
  },
];

export interface MockSecret {
  id: string; name: string; scope: string;
  lastRotated: string; lastUsed: string;
  createdBy: string; usageCount: number; sandboxes: number;
  rotateDue?: boolean;
}

export const MOCK_SECRETS: MockSecret[] = [
  { id: 'sec_a1', name: 'GITHUB_TOKEN',      scope: 'tenant',             lastRotated: ago(86400 * 14), lastUsed: ago(34),      createdBy: 'ada@acme.dev',   usageCount: 1284,  sandboxes: 12 },
  { id: 'sec_a2', name: 'STRIPE_API_KEY',    scope: 'tenant',             lastRotated: ago(86400 * 92), lastUsed: ago(120),     createdBy: 'grace@acme.dev', usageCount: 4112,  sandboxes: 7, rotateDue: true },
  { id: 'sec_a3', name: 'OPENAI_API_KEY',    scope: 'tenant',             lastRotated: ago(86400 * 3),  lastUsed: ago(8),       createdBy: 'agent@acme.dev', usageCount: 21408, sandboxes: 18 },
  { id: 'sec_a4', name: 'AWS_ACCESS_KEY_ID', scope: 'tenant',             lastRotated: ago(86400 * 41), lastUsed: ago(86400),   createdBy: 'linus@acme.dev', usageCount: 412,   sandboxes: 3 },
  { id: 'sec_a5', name: 'DATABASE_URL',      scope: 'sandbox · sb_42a1',  lastRotated: ago(86400),      lastUsed: ago(12),      createdBy: 'ada@acme.dev',   usageCount: 84,    sandboxes: 1 },
  { id: 'sec_a6', name: 'SENTRY_DSN',        scope: 'tenant',             lastRotated: ago(86400 * 180),lastUsed: ago(86400*4), createdBy: 'grace@acme.dev', usageCount: 12,    sandboxes: 2, rotateDue: true },
];

export interface MockAuditEvent {
  id: string; type: string; actor: string; actorKind: string;
  target: string; tenant: string; at: string; result: 'ok' | 'fail';
  meta?: string;
}

export const MOCK_AUDIT: MockAuditEvent[] = [
  { id: 'ev_001', type: 'sandbox.create',     actor: 'agent@acme.dev', actorKind: 'agent',   target: 'sb_42a1',            tenant: 'acme', at: ago(724),         result: 'ok',   meta: 'image=node:20-bookworm cpu=2 mem=4GiB' },
  { id: 'ev_002', type: 'pty.attach',         actor: 'ada@acme.dev',   actorKind: 'user',    target: 'sb_42a1',            tenant: 'acme', at: ago(710),         result: 'ok',   meta: 'shell=/bin/bash cols=80 rows=24' },
  { id: 'ev_003', type: 'secret.access',      actor: 'sb_42a1',         actorKind: 'sandbox', target: 'GITHUB_TOKEN',       tenant: 'acme', at: ago(680),         result: 'ok' },
  { id: 'ev_004', type: 'port.expose',        actor: 'ada@acme.dev',   actorKind: 'user',    target: 'sb_42a1:5173',       tenant: 'acme', at: ago(660),         result: 'ok',   meta: 'public=true' },
  { id: 'ev_005', type: 'sandbox.create',     actor: 'agent@acme.dev', actorKind: 'agent',   target: 'sb_5b8d',            tenant: 'labs', at: ago(221),         result: 'fail', meta: 'image pull failed · ECR access denied' },
  { id: 'ev_006', type: 'image.pull',         actor: 'system',          actorKind: 'system',  target: 'custom-ai:latest',   tenant: 'labs', at: ago(220),         result: 'fail', meta: 'registry.acme.io · 403 Forbidden' },
  { id: 'ev_007', type: 'secret.create',      actor: 'agent@acme.dev', actorKind: 'agent',   target: 'OPENAI_API_KEY',     tenant: 'acme', at: ago(86400*3+24),  result: 'ok' },
  { id: 'ev_008', type: 'sandbox.kill',       actor: 'grace@acme.dev', actorKind: 'user',    target: 'sb_3a07',            tenant: 'acme', at: ago(3724),        result: 'ok',   meta: 'reason=idle-timeout' },
  { id: 'ev_009', type: 'tenant.quota.update',actor: 'ada@acme.dev',   actorKind: 'user',    target: 'acme',               tenant: 'acme', at: ago(86400+4321),  result: 'ok',   meta: 'vCPU 32→48' },
  { id: 'ev_010', type: 'auth.login',         actor: 'grace@acme.dev', actorKind: 'user',    target: '—',                  tenant: 'acme', at: ago(86400),       result: 'ok',   meta: 'method=password ip=10.0.4.12' },
  { id: 'ev_011', type: 'auth.login',         actor: '—',               actorKind: 'unknown', target: '—',                  tenant: '—',    at: ago(86400*2+200), result: 'fail', meta: 'method=apikey ip=193.244.21.5 · 5 failures' },
  { id: 'ev_012', type: 'pty.detach',         actor: 'ada@acme.dev',   actorKind: 'user',    target: 'sb_42a1',            tenant: 'acme', at: ago(540),         result: 'ok' },
  { id: 'ev_013', type: 'sandbox.create',     actor: 'agent@acme.dev', actorKind: 'agent',   target: 'sb_9c0e',            tenant: 'acme', at: ago(134),         result: 'ok',   meta: 'image=python:3.12-slim' },
  { id: 'ev_014', type: 'file.write',         actor: 'sb_9c0e',         actorKind: 'sandbox', target: '/workspace/analysis.py', tenant: 'acme', at: ago(120),    result: 'ok',   meta: 'bytes=4128' },
  { id: 'ev_015', type: 'image.pull',         actor: 'system',          actorKind: 'system',  target: 'ubuntu:24.04',       tenant: 'acme', at: ago(8),          result: 'ok',   meta: '34% · 218 MiB / 642 MiB' },
];

export interface MockRecording {
  id: string; sandboxId: string; sandboxName: string; title: string;
  startedAt: string; durationSec: number; frames: number; sizeKB: number;
  agent: string; steps: number;
}

export const MOCK_RECORDINGS: MockRecording[] = [
  { id: 'rec_001', sandboxId: 'sb_42a1', sandboxName: 'next-dev',       title: 'Next.js dashboard build',      startedAt: ago(720), durationSec: 458, frames: 1284, sizeKB: 612, agent: 'Claude Sonnet 4.5', steps: 14 },
  { id: 'rec_002', sandboxId: 'sb_9c0e', sandboxName: 'data-analysis',  title: 'Q4 sales data exploration',    startedAt: ago(130), durationSec: 134, frames: 412,  sizeKB: 240, agent: 'GPT-5',            steps: 8 },
  { id: 'rec_003', sandboxId: 'sb_5b8d', sandboxName: 'failed-build',   title: 'tinyllama training (failed)',  startedAt: ago(220), durationSec: 84,  frames: 124,  sizeKB: 96,  agent: 'Codex CLI',        steps: 3 },
];

export const MOCK_METRICS = {
  sandboxesActive: 18,
  sandboxesActive_delta_24h: '+3',
  vCPU: 14.8, vCPUTotal: 48,
  mem: 42, memTotal: 96,
  egressMBs: 4.2, egressMBs_delta_24h: '-12%',
  secretsAccessed_24h: 1284,
  imagePullsToday: 41,
  failures_24h: 2,
  statesByCount: {
    'running': 8, 'idle': 4, 'paused': 1, 'provisioning': 1,
    'pulling-image': 2, 'terminating': 1, 'failed': 1, 'evicted': 0,
  } as Record<SandboxState, number>,
  cpuSeries:    Array.from({ length: 60 }, (_, i) => 14 + Math.sin(i / 4) * 6 + Math.cos(i / 9) * 3 + Math.random() * 2),
  memSeries:    Array.from({ length: 60 }, (_, i) => 42 + Math.sin(i / 5) * 4 + Math.random() * 2),
  egressSeries: Array.from({ length: 60 }, (_, i) => 1.4 + Math.sin(i / 6) * 0.6 + Math.random() * 0.4),
};

export const MOCK_RECENT = [
  { at: ago(8),   text: 'sb_71f3 · pulling image · ubuntu:24.04 · 34%', kind: 'info' },
  { at: ago(34),  text: 'secret OPENAI_API_KEY · accessed by sb_42a1',  kind: 'ok' },
  { at: ago(54),  text: 'sb_8d12 · provisioning · allocating worker',   kind: 'warn' },
  { at: ago(134), text: 'sb_9c0e · created by agent@acme.dev',          kind: 'ok' },
  { at: ago(221), text: 'sb_5b8d · failed · image pull denied',         kind: 'err' },
  { at: ago(540), text: 'sb_42a1 · pty detached by ada@acme.dev',       kind: 'dim' },
];
