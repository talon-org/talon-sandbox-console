/* _sandboxes/DetailTabs.tsx — PageSandboxDetail 各 tab 的主体组件 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, KV, Badge, Input, ResRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  toast,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { relTime } from '../../lib/relTime';
import { EmptyState } from '../../components/EmptyState';
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
    <Card
      title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="network" size={14} style={{ color: 'var(--info)' }} />{t('detail.tab.ports')}</span>}
      footer={ports.length > 3 ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
          +{ports.length - 3} {t('detail.more', 'more')}
        </span>
      ) : null}
    >
      {isLoading && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>{t('common.loading')}</span>}
      {isError && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--err)' }}>{t('common.loadFailed')}</span>}
      {!isLoading && !isError && preview.length === 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>{t('detail.noPorts')}</span>
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
        <Card
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="cpu" size={14} style={{ color: 'var(--fg-2)' }} />{t('detail.resources')}</span>}
          footer={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>{t('detail.realtime')}</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ResRow label={t('detail.resourceVcpu')}   used={cpuUsed} max={cpuCores || 2}  unit="vCPU" />
            <ResRow label={t('detail.resourceMemory')} used={memUsed} max={memGib || 4}    unit="GiB"  />
            <ResRow label={t('detail.resourceDisk')}   used={0}       max={1}              unit="GiB"  />
            <ResRow label={t('detail.resourceEgress')} used={0}       max={5}              unit="MB/s" />
          </div>
        </Card>

        <PortsPreviewCard sandboxId={s.id} />
      </div>

      <Card
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="key" size={14} style={{ color: 'var(--magenta, #c678dd)' }} />{t('detail.mountedSecrets')}</span>}
        footer={<Button variant="ghost" size="sm" onClick={() => nav('/secrets')}>{t('detail.manage')}<TlnIcon name="arrowRight" size={12} /></Button>}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(s.secrets ?? []).map(sec => (
            <span key={sec.secret_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: 'var(--magenta-soft, rgba(198,120,221,0.1))', color: 'var(--magenta, #c678dd)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <TlnIcon name="key" size={11} />
              {sec.name}
            </span>
          ))}
          {(!s.secrets || s.secrets.length === 0) && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>{t('detail.noSecrets')}</span>
          )}
        </div>
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
  const t    = useT();
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
    return <EmptyState variant="empty" title={t('common.empty')} />;
  }

  return (
    <Card>
      <div className="tln-tbl" style={{ border: 0, borderRadius: 0, margin: '-16px' }}>
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
          <div key={proc.id} className="tln-tbl-row tab-proc-row" style={{ cursor: 'default' }}>
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
                  proc.state === 'running' ? 'success'
                  : proc.state === 'exited'  ? 'neutral'
                  : 'danger'
                }
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

  // 暴露端口表单状态
  const [exposeOpen, setExposeOpen] = useState(false);
  const [portInput,  setPortInput]  = useState('');
  const [signInput,  setSignInput]  = useState(false);
  const exposeMut = useExposePort(s.id);

  // 删除确认状态
  const [deletePort, setDeletePort] = useState<number | null>(null);
  const unexposeMut = useUnexposePort(s.id);

  /** 提交暴露端口请求 */
  const handleExpose = () => {
    const portNum = parseInt(portInput, 10);
    if (!portNum || portNum < 1 || portNum > 65535) return;
    exposeMut.mutate(
      { port: portNum, sign: signInput },
      {
        onSuccess: () => {
          setExposeOpen(false);
          setPortInput('');
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
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TlnIcon name="network" size={14} style={{ color: 'var(--info)' }} />
            {t('detail.tab.ports')}
          </span>
        }
        footer={
          <Button variant="primary" size="sm" onClick={() => setExposeOpen(true)}>
            <TlnIcon name="plus" size={12} />
            {t('detail.exposePort')}
          </Button>
        }
      >
        {/* 加载中 */}
        {isLoading && <EmptyState variant="loading" style={{ padding: '16px 0' }} />}

        {/* 错误态 */}
        {!isLoading && error && (
          <EmptyState
            variant="error"
            message={error instanceof Error ? error.message : String(error)}
          />
        )}

        {/* 空态 */}
        {!isLoading && !error && ports.length === 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>
            {t('detail.noPorts')}
          </span>
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
                  <Badge variant={p.source === 'explicit' ? 'info' : 'neutral'}>
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
      </Card>

      {/* 暴露端口 Dialog */}
      <Dialog open={exposeOpen} onOpenChange={(o) => { if (!o) setExposeOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.ports.exposeDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 300 }}>
            {/* 端口号输入 */}
            <div>
              <label className="ff-label" htmlFor="expose-port">
                {t('detail.ports.portLabel')}
              </label>
              <Input
                id="expose-port"
                mono
                type="number"
                min={1}
                max={65535}
                value={portInput}
                onChange={e => setPortInput(e.target.value)}
                placeholder="8080"
              />
            </div>
            {/* 签名 URL 复选 */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={signInput}
                onChange={e => setSignInput(e.target.checked)}
                style={{ accentColor: 'var(--acc)' }}
              />
              {t('detail.ports.signLabel')}
            </label>
          </div>
          <DialogFooter>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setExposeOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExpose}
                loading={exposeMut.isPending}
                disabled={!portInput || exposeMut.isPending}
              >
                {t('detail.ports.submit')}
              </Button>
            </div>
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
      <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="shield" size={14} style={{ color: 'var(--info)' }} />{t('detail.networkPolicy')}</span>}>
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
      </Card>
      <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="alert" size={14} style={{ color: 'var(--warn)' }} />{t('detail.recentBlocked')}</span>}>
        <div style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
          {/* TODO: 封锁请求列表需要审计过滤端点（P2） */}
          {t('common.comingSoon')}
        </div>
      </Card>
    </div>
  );
}

// ── Audit tab ─────────────────────────────────────────────────────────────────
export function TabAudit({ events }: { events: AuditEventDTO[] }) {
  const t = useT();
  return (
    <Card>
      <div className="tln-tbl" style={{ border: 0, borderRadius: 0, margin: '-16px' }}>
        <div className="tln-tbl-head det-audit-row">
          <div>{t('detail.colTime')}</div>
          <div>{t('detail.colEvent')}</div>
          <div>{t('detail.colActor')}</div>
          <div>{t('detail.colTargetMeta')}</div>
          <div>{t('detail.colResult')}</div>
        </div>
        {events.length === 0 && (
          <div style={{ padding: '24px 16px', color: 'var(--fg-3)', fontSize: 12, textAlign: 'center' }}>{t('common.empty')}</div>
        )}
        {events.map(e => {
          const secAgo      = Math.round(Date.now() / 1000 - e.at);
          // outcome 通过 i18n 翻译
          const outcomeLabel = t(`audit.outcome.${e.outcome}`, e.outcome);
          return (
            <div key={e.id} className="tln-tbl-row det-audit-row" style={{ cursor: 'default' }}>
              <span className="when">{relTime(secAgo, t)}</span>
              <span className="etype">{e.event_type}</span>
              <span className="actor">{e.actor ?? '—'}</span>
              <span className="dtarget">{e.target}{e.reason ? ' · ' + e.reason : ''}</span>
              <span className="dresult">
                <Badge variant={e.outcome === 'ok' ? 'success' : 'danger'}>{outcomeLabel}</Badge>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
