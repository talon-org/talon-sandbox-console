/* PageSandboxDetail — 6-tab detail view, wired to useSandbox() + useAuditEvents().
 *
 * Header information architecture is driven by the questions a developer or
 * operator opens this page to answer (in descending frequency):
 *   1. Is it alive right now?       → state badge, prominent
 *   2. What is it doing for me?     → task / name as the H1
 *   3. Can I get into it?           → primary "Open shell" CTA
 *   4. When does it die on its own? → age + ttl-remaining derived inline
 *   5. Who owns it / what image?    → secondary mono row
 * Anything that doesn't help with these (node id, empty optional fields) is
 * omitted rather than rendered as a `—` placeholder.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';
import { DestroySandboxDialog } from '../components/DestroySandboxDialog';
import {
  useSandbox, useDeleteSandbox, useAuditEvents,
  useStartSandbox, useStopSandbox, usePauseSandbox,
} from '../hooks';
import { exportWorkspace } from '../api/sandboxes';
import type { SandboxState, SandboxDTO } from '../api/types';
import { TabOverview, TabProcesses, TabPorts, TabFiles, TabNetwork, TabAudit } from './_sandboxes/DetailTabs';

import './PageSandboxDetail.css';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDuration(secs: number): string {
  if (secs < 60) return secs + 's';
  if (secs < 3600) return Math.floor(secs / 60) + 'm';
  if (secs < 86400) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return m === 0 ? h + 'h' : h + 'h ' + m + 'm';
  }
  return Math.floor(secs / 86400) + 'd';
}

function fmtCpu(millis?: number): string {
  return millis ? (millis / 1000).toFixed(1) + ' vCPU' : '';
}

function fmtMem(bytes?: number): string {
  return bytes ? (bytes / (1024 ** 3)).toFixed(1) + ' GiB' : '';
}

// Decide what TTL to show on the header. The raw `ttl_seconds` field is the
// configured limit; the user actually wants to know "how long until this dies
// on its own". Returns null when the sandbox has no TTL configured, so the
// caller can render nothing instead of a misleading "—".
function ttlLabel(s: SandboxDTO, t: ReturnType<typeof useT>): string | null {
  const ttl = s.ttl_seconds;
  if (ttl == null || ttl === 0) return null;
  if (!s.created_at) return fmtDuration(ttl);
  const elapsed = Math.floor(Date.now() / 1000 - s.created_at);
  const remaining = ttl - elapsed;
  if (remaining <= 0) return t('detail.ttlExpired');
  return t('detail.ttlRemaining').replace('%s', fmtDuration(remaining));
}

// fmtAge: pretty duration since `created_at`. Returns null when timestamp is
// missing — caller drops the field instead of rendering a placeholder.
function ageLabel(createdAt?: number): string | null {
  if (!createdAt) return null;
  return fmtDuration(Math.floor(Date.now() / 1000 - createdAt));
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageSandboxDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const t           = useT();
  const nav         = useNavigate();

  const [tab,         setTab]         = useState('overview');
  const [confirmKill, setConfirmKill] = useState(false);

  const { data: s, isLoading, error, refetch } = useSandbox(id);
  const del   = useDeleteSandbox();
  const start = useStartSandbox();
  const stop  = useStopSandbox();
  const pause = usePauseSandbox();
  // 生命周期操作进行中:任一 mutation pending 时禁用整组按钮,防止并发重复点击。
  const lifecycleBusy = start.isPending || stop.isPending || pause.isPending;

  const { data: auditData } = useAuditEvents({ target: id, limit: 50 });
  const auditEvents = auditData?.events ?? [];

  if (isLoading) return <EmptyState variant="loading" />;
  if (error) {
    return (
      <EmptyState
        variant="error"
        error={error}
        action={<Button onClick={() => refetch()}>{t('common.retry')}</Button>}
      />
    );
  }
  if (!s) {
    return (
      <EmptyState
        variant="empty"
        title={t('detail.notFound')}
        message={t('detail.notFoundDesc')}
        action={<Button onClick={() => nav('/sandboxes')}>{t('common.back')}</Button>}
      />
    );
  }


  // The display name is chosen for human recall, not machine identity: prefer
  // the task description (what this sandbox is *for*), then the user-provided
  // name, then profile. Sandbox id is shown separately as a mono micro-label.
  const displayName = s.task || s.name || s.profile || t('detail.untitled');
  const quota = [fmtCpu(s.cpu_millis), fmtMem(s.memory_bytes)].filter(Boolean).join(' · ');
  const ttl = ttlLabel(s, t);
  const age = ageLabel(s.created_at);

  return (
    <>
      {/* Header — task as H1 + state badge, secondary mono row for identity. */}
      <div className="sbx-detail-head">
        <div className="head-main">
          {/* 返回列表入口:沿用 TerminalChrome 的「← 文案」回退样式,点击回到 sandbox 列表 */}
          <button type="button" className="sbx-back" onClick={() => nav('/sandboxes')}>
            ← {t('detail.backToList')}
          </button>
          <div className="title-row">
            <h1 className="title" title={typeof displayName === 'string' ? displayName : undefined}>
              {displayName}
            </h1>
            <StatusPill state={s.state} />
          </div>
          <div className="meta-row">
            <span className="sbxid" title={s.id}>{s.id}</span>
            {s.image_id && (<><span className="dot">·</span><span>{s.image_id}</span></>)}
            {s.profile && (<><span className="dot">·</span><span>{s.profile}</span></>)}
            {quota && (
              <>
                <span className="dot">·</span>
                <span className="meta-k">{t('detail.quota')}</span>
                <span>{quota}</span>
              </>
            )}
            {age && (
              <>
                <span className="dot">·</span>
                <span className="meta-k">{t('detail.age')}</span>
                <span>{age}</span>
              </>
            )}
            {ttl && (
              <>
                <span className="dot">·</span>
                <span>{ttl}</span>
              </>
            )}
          </div>
        </div>
        {/* Action group order: positive primary first, secondary ghost icons,
         * destructive last with extra separation so it doesn't sit next to
         * "Open shell" — keeps "ship it" away from "burn it down". */}
        <div className="det-actions">
          <Button variant="primary" onClick={() => nav('/sandboxes/' + s.id + '/terminal')}>
            <TlnIcon name="terminal" size={14} />
            {t('detail.openShell')}
          </Button>
          {/* 次级操作:全部连真实后端端点,按状态机条件渲染——只显示当前状态下
           * 合法的转移,不渲染点了无效的按钮。
           *   running        → 暂停(pause)/ 停止(stop)
           *   paused/stopped → 启动(start)
           * 「录像」始终可见,深链到该 sandbox 过滤后的录像列表。 */}
          <div className="det-actions-sec">
            <Button
              variant="ghost" iconOnly
              aria-label={t('common.recordings')} title={t('common.recordings')}
              onClick={() => nav('/recordings?sandbox=' + encodeURIComponent(s.id))}
            >
              <TlnIcon name="film" size={14} />
            </Button>
            {s.state === 'running' && (
              <Button
                variant="ghost" iconOnly disabled={lifecycleBusy}
                aria-label={t('common.pause')} title={t('common.pause')}
                onClick={() => pause.mutate(s.id)}
              >
                <TlnIcon name="pause" size={14} />
              </Button>
            )}
            {(s.state === 'paused' || s.state === 'stopped') && (
              <Button
                variant="ghost" iconOnly disabled={lifecycleBusy}
                aria-label={t('common.start')} title={t('common.start')}
                onClick={() => start.mutate(s.id)}
              >
                <TlnIcon name="play" size={14} />
              </Button>
            )}
            {(s.state === 'running' || s.state === 'paused' || s.state === 'idle') && (
              <Button
                variant="ghost" iconOnly disabled={lifecycleBusy}
                aria-label={t('common.stop')} title={t('common.stop')}
                onClick={() => stop.mutate(s.id)}
              >
                <TlnIcon name="stop" size={14} />
              </Button>
            )}
          </div>
          <Button variant="ghost" onClick={() => setConfirmKill(true)} className="det-kill-btn">
            <TlnIcon name="trash" size={14} />
            {t('common.kill')}
          </Button>
        </div>
      </div>

      {/* tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="sbx-tabs-wrap">
          <TabsList>
            <TabsTrigger value="overview">{t('detail.tab.overview')}</TabsTrigger>
            <TabsTrigger value="processes">{t('detail.tab.processes')}</TabsTrigger>
            <TabsTrigger value="ports">{t('detail.tab.ports')}</TabsTrigger>
            <TabsTrigger value="files">{t('detail.tab.files')}</TabsTrigger>
            <TabsTrigger value="network">{t('detail.tab.network')}</TabsTrigger>
            <TabsTrigger value="audit">
              {t('detail.tab.audit')}
              {auditEvents.length > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>
                  {auditEvents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="sbx-tab-body">
          <TabsContent value="overview"><TabOverview  s={s} /></TabsContent>
          <TabsContent value="processes"><TabProcesses s={s} /></TabsContent>
          <TabsContent value="ports"><TabPorts     s={s} /></TabsContent>
          <TabsContent value="files"><TabFiles     s={s} /></TabsContent>
          <TabsContent value="network"><TabNetwork   s={s} /></TabsContent>
          <TabsContent value="audit"><TabAudit events={auditEvents} /></TabsContent>
        </div>
      </Tabs>

      {/* 销毁对话框 — 三段式有摩擦销毁:先导出 workspace(逃生舱口)→ 输入完整
       * sandbox id 解锁 → filled danger 确认。销毁会永久删 workspace 数据,
       * 比普通 ConfirmDialog 的一键确认需要更强的确认。 */}
      <DestroySandboxDialog
        open={confirmKill}
        sandboxId={s.id}
        onClose={() => setConfirmKill(false)}
        loading={del.isPending}
        onExport={() => exportWorkspace(s.id)}
        onConfirm={() => {
          del.mutate(s.id, {
            onSuccess: () => { setConfirmKill(false); nav('/sandboxes'); },
          });
        }}
      />
    </>
  );
}
