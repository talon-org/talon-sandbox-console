/* _sandboxes/DetailTabs.tsx — PageSandboxDetail 各 tab 的主体组件 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardTitle, CardAction, CardContent, CardFooter,
  Button, KV, Badge, ResRow,
  NumberInput, NumberInputField, NumberInputStepper,
  CheckboxField,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  FormField, FormLabel, FormControl, FormDescription, FormGrid,
  toast,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { relTime } from '../../lib/relTime';
import { EmptyState } from '../../components/EmptyState';
import { InlineEmpty } from '../../components/InlineEmpty';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useSandboxProcesses } from '../../hooks/useSandboxProcesses';
import { useSandboxPorts, useExposePort, useUnexposePort } from '../../hooks/useSandboxPorts';
import { FileBrowser } from './FileBrowser';
import type { SandboxDTO, AuditEventDTO } from '../../api/types';

// 格式化沙箱运行时长，如 "5m 30s" 或 "2h 10m"
function fmtAge(createdAt?: number): string {
  if (!createdAt) return '—';
  const sec = Math.floor(Date.now() / 1000 - createdAt);
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}

// Overview 内嵌的端口预览卡 — 显示前 3 条已暴露端口,完整列表在 TabPorts。
// 与 TabPorts 共享 react-query key,不会重复请求。
function PortsPreviewCard({ sandboxId }: { sandboxId: string }) {
  const t = useT();
  const { data, isLoading, isError } = useSandboxPorts(sandboxId);
  const ports = data?.ports ?? [];
  const preview = ports.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <TlnIcon name="network" size={14} style={{ color: 'var(--info)' }} />
          {t('detail.tab.ports')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <InlineEmpty size="sm" icon={<TlnIcon name="refresh" size={14} />}>
            {t('common.loading')}
          </InlineEmpty>
        )}
        {isError && (
          <InlineEmpty size="sm" tone="error" icon={<TlnIcon name="alert" size={14} />}>
            {t('common.loadFailed')}
          </InlineEmpty>
        )}
        {!isLoading && !isError && preview.length === 0 && (
          <InlineEmpty size="sm" icon={<TlnIcon name="network" size={14} />}>
            {t('detail.noPorts')}
          </InlineEmpty>
        )}
        {!isLoading && !isError && preview.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {preview.map(p => (
              <a key={p.port} href={p.url} target="_blank" rel="noopener noreferrer"
                 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--info)', textDecoration: 'none' }}>
                <span style={{ color: 'var(--fg-2)' }}>:{p.port}</span>
                <span style={{ color: 'var(--fg-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>
                <TlnIcon name="arrowRight" size={11} />
              </a>
            ))}
          </div>
        )}
      </CardContent>
      {ports.length > 3 && (
        <CardFooter>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
            +{ports.length - 3} {t('detail.more', 'more')}
          </span>
        </CardFooter>
      )}
    </Card>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
export function TabOverview({ s }: { s: SandboxDTO }) {
  const t   = useT();
  const nav = useNavigate();
  // 真实用量从 processes 端点聚合得到; react-query 会与 TabProcesses 共享同一 query key,
  // 不会双倍请求。失败/空时回退到 0,不显示假占比。
  const { data: procData } = useSandboxProcesses(s.id);
  const procs = procData?.processes ?? [];
  const cpuCores = (s.cpu_millis ?? 0) / 1000;
  const memGib   = (s.memory_bytes ?? 0) / (1024 ** 3);
  // CPU 用量: 单核 100% = 1 vCPU,累加所有进程的 cpu_pct/100
  const cpuUsed  = procs.reduce((sum, p) => sum + (p.cpu_pct ?? 0) / 100, 0);
  // 内存用量: 进程 mem_mb 累加换算成 GiB
  const memUsed  = procs.reduce((sum, p) => sum + (p.mem_mb ?? 0), 0) / 1024;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* G2 task 字段：sandbox 有当前任务描述时在 overview 顶部显示 */}
      {s.task && (
        <div className="task-card">
          <div className="task-text">{s.task}</div>
          <div className="task-meta">
            <span>{t('detail.task')}</span>
          </div>
        </div>
      )}
      <div className="sbx-2col">
        <Card>
          <CardHeader>
            <CardTitle>
              <TlnIcon name="cpu" size={14} style={{ color: 'var(--fg-2)' }} />
              {t('detail.resources')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ResRow label={t('detail.resourceVcpu')}   used={cpuUsed} max={cpuCores || 2}  unit="vCPU" />
              <ResRow label={t('detail.resourceMemory')} used={memUsed} max={memGib || 4}    unit="GiB"  />
              <ResRow label={t('detail.resourceDisk')}   used={0}       max={1}              unit="GiB"  />
              <ResRow label={t('detail.resourceEgress')} used={0}       max={5}              unit="MB/s" />
            </div>
          </CardContent>
          <CardFooter>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>{t('detail.realtime')}</span>
          </CardFooter>
        </Card>

        <PortsPreviewCard sandboxId={s.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <TlnIcon name="key" size={14} style={{ color: 'var(--magenta, #c678dd)' }} />
            {t('detail.mountedSecrets')}
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={() => nav('/secrets')}>{t('detail.manage')}<TlnIcon name="arrowRight" size={12} /></Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {(!s.secrets || s.secrets.length === 0) ? (
            <InlineEmpty size="sm" icon={<TlnIcon name="key" size={14} />}>
              {t('detail.noSecrets')}
            </InlineEmpty>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {s.secrets.map(sec => (
                <span key={sec.secret_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: 'var(--magenta-soft, rgba(198,120,221,0.1))', color: 'var(--magenta, #c678dd)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <TlnIcon name="key" size={11} />
                  {sec.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* detail.age、profile、ttl 均通过 i18n key 输出，不硬编码英文标签 */}
      <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
        {t('detail.age')}: {fmtAge(s.created_at)} · {t('detail.profile')}: {s.profile} · ttl: {s.ttl_seconds != null ? s.ttl_seconds + 's' : '—'}
      </div>
    </div>
  );
}

// ── Processes tab ─────────────────────────────────────────────────────────────

/** 将 Unix 秒时间戳格式化为 ISO 时间（精确到分钟） */
function fmtProcTime(ts: number): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

export function TabProcesses({ s }: { s: SandboxDTO }) {
  const t   = useT();
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useSandboxProcesses(s.id);
  const processes = data?.processes ?? [];

  if (isLoading) return <EmptyState variant="loading" />;
  if (error) {
    return (
      <EmptyState
        variant="error"
        message={error instanceof Error ? error.message : String(error)}
        action={<Button size="sm" onClick={() => refetch()}>{t('common.retry')}</Button>}
      />
    );
  }
  if (processes.length === 0) {
    // Idle sandbox → the next action a user almost always wants is "let me
    // run something in here". Skip the generic empty-state and surface the
    // shell entrypoint directly so this tab earns its existence on first
    // visit instead of looking like a placeholder.
    return (
      <EmptyState
        variant="empty"
        className="tln-empty-sm"
        title={t('detail.proc.empty.title')}
        message={t('detail.proc.empty.desc')}
        action={
          <Button variant="primary" size="sm" onClick={() => nav('/sandboxes/' + s.id + '/terminal')}>
            <TlnIcon name="terminal" size={13} />
            {t('detail.openShell')}
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <div className="tln-tbl tln-tbl--bare">
        {/* 表头 */}
        <div className="tln-tbl-head tab-proc-row">
          <div>{t('detail.colPid')}</div>
          <div>{t('detail.colProcess')}</div>
          <div>{t('detail.colStatus')}</div>
          <div>{t('detail.colCpu')}</div>
          <div>{t('detail.colMem')}</div>
          <div>{t('detail.colStarted')}</div>
          <div>{t('detail.colCommand')}</div>
        </div>

        {/* 进程行 */}
        {processes.map(proc => (
          <div key={proc.id} className="tln-tbl-row tab-proc-row no-click">
            {/* PID */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{proc.pid}</span>
            {/* Name（取 command 第一段作为进程名） */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {proc.command[0] ? proc.command[0].split('/').pop() : '—'}
            </span>
            {/* Status */}
            <span>
              <Badge
                variant={
                  proc.state === 'running' ? 'ok'
                  : proc.state === 'exited'  ? 'muted'
                  : 'err'
                }
                dot={proc.state === 'running'}
              >
                {proc.state}
              </Badge>
            </span>
            {/* CPU% */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {proc.cpu_pct != null ? proc.cpu_pct.toFixed(1) + '%' : '—'}
            </span>
            {/* Mem MiB */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {proc.mem_mb != null ? proc.mem_mb.toFixed(0) + ' MB' : '—'}
            </span>
            {/* Started */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>
              {fmtProcTime(proc.started_at)}
            </span>
            {/* Full command */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg-3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={proc.command.join(' ')}
            >
              {proc.command.join(' ')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Ports tab ─────────────────────────────────────────────────────────────────

export function TabPorts({ s }: { s: SandboxDTO }) {
  const t = useT();

  // 端口列表
  const { data, isLoading, error } = useSandboxPorts(s.id);
  const ports = data?.ports ?? [];

  // Expose-port form state. `portInput` is the typed numeric value or
  // undefined when blank. Using NumberInput's number contract avoids the
  // string→int parse dance we used to do on submit.
  const [exposeOpen, setExposeOpen] = useState(false);
  const [portInput,  setPortInput]  = useState<number | undefined>(undefined);
  const [signInput,  setSignInput]  = useState(false);
  const exposeMut = useExposePort(s.id);

  // 删除确认状态
  const [deletePort, setDeletePort] = useState<number | null>(null);
  const unexposeMut = useUnexposePort(s.id);

  const portValid = portInput != null && portInput >= 1 && portInput <= 65535;

  const handleExpose = () => {
    if (!portValid) return;
    const portNum = portInput!;
    exposeMut.mutate(
      { port: portNum, sign: signInput },
      {
        onSuccess: () => {
          setExposeOpen(false);
          setPortInput(undefined);
          setSignInput(false);
          toast.success(t('detail.exposePort') + ' :' + portNum);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      },
    );
  };

  /** 复制 URL 到剪贴板 */
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t('detail.ports.urlCopied'));
    }).catch(() => undefined);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <TlnIcon name="network" size={14} style={{ color: 'var(--info)' }} />
            {t('detail.tab.ports')}
          </CardTitle>
          <CardAction>
            <Button variant="primary" size="sm" onClick={() => setExposeOpen(true)}>
              <TlnIcon name="plus" size={12} />
              {t('detail.exposePort')}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
        {/* Loading / error / empty all use InlineEmpty — they're routine
         * states for a sub-card region. The actionable EmptyState is reserved
         * for full-tab "you must take action" prompts (see TabProcesses). */}
        {isLoading && (
          <InlineEmpty size="sm" icon={<TlnIcon name="refresh" size={14} />}>
            {t('common.loading')}
          </InlineEmpty>
        )}
        {!isLoading && error && (
          <InlineEmpty size="sm" tone="error" icon={<TlnIcon name="alert" size={14} />}>
            {error instanceof Error ? error.message : String(error)}
          </InlineEmpty>
        )}
        {!isLoading && !error && ports.length === 0 && (
          <InlineEmpty size="sm" icon={<TlnIcon name="network" size={14} />}>
            {t('detail.noPorts')}
          </InlineEmpty>
        )}

        {/* 端口列表 */}
        {!isLoading && !error && ports.length > 0 && (
          <div className="tab-ports-list">
            {/* 列表表头 */}
            <div className="tab-ports-row tab-ports-head">
              <span>{t('detail.ports.port')}</span>
              <span>{t('detail.ports.source')}</span>
              <span>{t('detail.ports.url')}</span>
              <span />
            </div>

            {ports.map(p => (
              <div key={p.port} className="tab-ports-row">
                {/* 端口号 */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                  :{p.port}
                </span>
                {/* 来源 badge */}
                <span>
                  <Badge variant={p.source === 'explicit' ? 'info' : 'muted'}>
                    {p.source === 'explicit' ? t('detail.ports.explicit') : t('detail.ports.dynamic')}
                  </Badge>
                </span>
                {/* URL + 复制按钮 */}
                <span className="tab-ports-url-cell">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--info)' }}
                  >
                    {p.url}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={t('detail.ports.copyUrl')}
                    onClick={() => copyUrl(p.url)}
                  >
                    <TlnIcon name="copy" size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={t('detail.ports.delete')}
                    onClick={() => setDeletePort(p.port)}
                  >
                    <TlnIcon name="trash" size={12} style={{ color: 'var(--err)' }} />
                  </Button>
                </span>
                {/* 空列（对齐用） */}
                <span />
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Expose-port dialog — uses default (md) sizing to match the
       * CreateSandboxDrawer baseline. Single decision (port + sign toggle)
       * but the system-wide form scale is md, not sm. */}
      <Dialog open={exposeOpen} onOpenChange={(o) => { if (!o) setExposeOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.ports.exposeDialogTitle')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t('detail.ports.exposeDesc')}</DialogDescription>
          {/* Form — uses ui-lib FormGrid (2-column) + FormField (label /
           * control / description three-layer contract). Every dialog and
           * drawer in the product composes from these primitives so the
           * field structure stays consistent at the source. */}
          <div className="dlg-form-body">
            <FormGrid>
              <FormField>
                <FormLabel htmlFor="expose-port">{t('detail.ports.portLabel')}</FormLabel>
                <FormControl>
                  <NumberInput
                    value={portInput}
                    onValueChange={setPortInput}
                    min={1}
                    max={65535}
                  >
                    <NumberInputField id="expose-port" placeholder="8080" />
                    <NumberInputStepper />
                  </NumberInput>
                </FormControl>
                <FormDescription>{t('detail.ports.portHint')}</FormDescription>
              </FormField>
              <FormField>
                <FormLabel>{t('detail.ports.accessLabel')}</FormLabel>
                <FormControl>
                  <CheckboxField
                    checked={signInput}
                    onCheckedChange={(v) => setSignInput(v === true)}
                    label={t('detail.ports.signLabel')}
                  />
                </FormControl>
                <FormDescription>{t('detail.ports.signHint')}</FormDescription>
              </FormField>
            </FormGrid>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExposeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleExpose}
              loading={exposeMut.isPending}
              disabled={!portValid || exposeMut.isPending}
            >
              {t('detail.ports.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 Dialog */}
      <ConfirmDialog
        open={deletePort !== null}
        onClose={() => setDeletePort(null)}
        title={t('detail.ports.deleteConfirmTitle')}
        description={t('detail.ports.deleteConfirmDesc')}
        confirmLabel={t('detail.ports.delete')}
        cancelLabel={t('common.cancel')}
        loading={unexposeMut.isPending}
        onConfirm={() => {
          if (deletePort === null) return;
          unexposeMut.mutate(deletePort, {
            onSuccess: () => {
              setDeletePort(null);
              toast.success(':' + deletePort + ' ' + t('detail.ports.delete').toLowerCase());
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
          });
        }}
      />
    </>
  );
}

// ── Files tab ─────────────────────────────────────────────────────────────────

export function TabFiles({ s }: { s: SandboxDTO }) {
  // FileBrowser 已单独拆出到 ./FileBrowser.tsx（> 200 行），此处直接挂载
  return <FileBrowser sandboxId={s.id} />;
}

// ── Network tab ───────────────────────────────────────────────────────────────
export function TabNetwork({ s }: { s: SandboxDTO }) {
  const t = useT();
  // G2：network_allowed_hosts 已在 SandboxDTO 中
  const hosts = s.network_allowed_hosts ?? [];
  return (
    <div className="sbx-2col">
      <Card>
        <CardHeader>
          <CardTitle>
            <TlnIcon name="shield" size={14} style={{ color: 'var(--info)' }} />
            {t('detail.networkPolicy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KV rows={[
            { k: t('detail.policy'),    v: s.network_policy ?? 'allow-all' },
            { k: t('detail.blocked24h'), v: '—' },
          ]} />
          {/* G2：allowlist 模式下显示允许主机列表 */}
          {hosts.length > 0 && (
            <div className="hostlist" style={{ marginTop: 12 }}>
              {hosts.map(h => (
                <div key={h} className="hitem">
                  <TlnIcon name="globe" size={11} style={{ color: 'var(--fg-3)', flex: '0 0 auto' }} />
                  {h}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <TlnIcon name="alert" size={14} style={{ color: 'var(--warn)' }} />
            {t('detail.recentBlocked')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: blocked-request stream needs an audit filter endpoint (P2). */}
          <InlineEmpty size="sm" icon={<TlnIcon name="clock" size={14} />}>
            {t('common.comingSoon')}
          </InlineEmpty>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Audit tab ─────────────────────────────────────────────────────────────────
export function TabAudit({ events }: { events: AuditEventDTO[] }) {
  const t = useT();
  return (
    <Card>
      <div className="tln-tbl tln-tbl--bare">
        <div className="tln-tbl-head det-audit-row">
          <div>{t('detail.colTime')}</div>
          <div>{t('detail.colEvent')}</div>
          <div>{t('detail.colActor')}</div>
          <div>{t('detail.colTargetMeta')}</div>
          <div>{t('detail.colResult')}</div>
        </div>
        {events.length === 0 && (
          <InlineEmpty size="sm" icon={<TlnIcon name="clock" size={14} />}>
            {t('common.empty')}
          </InlineEmpty>
        )}
        {events.map(e => {
          const secAgo      = Math.round(Date.now() / 1000 - e.at);
          // outcome 通过 i18n 翻译
          const outcomeLabel = t(`audit.outcome.${e.outcome}`, e.outcome);
          return (
            <div key={e.id} className="tln-tbl-row det-audit-row no-click">
              <span className="when">{relTime(secAgo, t)}</span>
              <span className="etype">{e.event_type}</span>
              <span className="actor">{e.actor ?? '—'}</span>
              <span className="dtarget">{e.target}{e.reason ? ' · ' + e.reason : ''}</span>
              <span className="dresult">
                <Badge variant={e.outcome === 'ok' ? 'ok' : 'err'} dot>{outcomeLabel}</Badge>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
