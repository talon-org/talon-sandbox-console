/* _sandboxes/DetailTabs.tsx — PageSandboxDetail 各 tab 的主体组件 */
import { useNavigate } from 'react-router-dom';
import { Card, Button, KV, Badge, ResRow } from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { relTime } from '../../lib/relTime';
import type { SandboxDTO, AuditEventDTO } from '../../api/types';

// 格式化沙箱运行时长，如 "5m 30s" 或 "2h 10m"
function fmtAge(createdAt?: number): string {
  if (!createdAt) return '—';
  const sec = Math.floor(Date.now() / 1000 - createdAt);
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}

// ── Overview tab ──────────────────────────────────────────────────────────────
export function TabOverview({ s }: { s: SandboxDTO }) {
  const t   = useT();
  const nav = useNavigate();
  const cpuCores   = (s.cpu_millis ?? 0) / 1000;
  const cpuUsed    = cpuCores * 0.3;   // real usage not in DTO — TODO: needs /processes endpoint
  const memGib     = (s.memory_bytes ?? 0) / (1024 ** 3);
  const memUsed    = memGib * 0.4;     // TODO: needs /processes endpoint

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="sbx-2col">
        <Card
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="cpu" size={14} style={{ color: 'var(--fg-2)' }} />{t('detail.resources')}</span>}
          footer={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>{t('detail.realtime')}</span>}
        >
          {/* TODO: 真实用量需要 GET /v1/sandboxes/{id}/processes（P1 endpoint） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ResRow label={t('detail.resourceVcpu')}   used={cpuUsed}  max={cpuCores || 2}  unit="vCPU" />
            <ResRow label={t('detail.resourceMemory')} used={memUsed}  max={memGib || 4}    unit="GiB" />
            <ResRow label={t('detail.resourceDisk')}   used={0}        max={1}              unit="GiB" color="ok" />
            <ResRow label={t('detail.resourceEgress')} used={0}        max={5}              unit="MB/s" color="acc" />
          </div>
        </Card>

        <Card
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="network" size={14} style={{ color: 'var(--info)' }} />{t('detail.tab.ports')}</span>}
          footer={<Button variant="ghost" size="sm" iconOnly aria-label={t('detail.exposePort')}><TlnIcon name="plus" size={12} /></Button>}
        >
          {/* TODO: ports not in SandboxDTO — needs port exposure endpoint (P1) */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>{t('detail.noPorts')}</span>
        </Card>
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
export function TabProcesses({ s: _ }: { s: SandboxDTO }) {
  const t = useT();
  // TODO: GET /v1/sandboxes/{id}/processes endpoint not yet available (P1)
  return (
    <Card>
      <div className="tln-tbl" style={{ border: 0, borderRadius: 0, margin: '-16px' }}>
        <div className="tln-tbl-head proc-tbl">
          <div>{t('detail.colPid')}</div>
          <div>{t('detail.colProcess')}</div>
          <div>{t('detail.colCommand')}</div>
          <div>{t('detail.colCpu')}</div>
          <div>{t('detail.colMem')}</div>
        </div>
        <div style={{ padding: '24px 16px', color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
          {/* TODO: process list requires backend P1 endpoint */}
          {t('common.comingSoon')}
        </div>
      </div>
    </Card>
  );
}

// ── Ports tab ─────────────────────────────────────────────────────────────────
export function TabPorts({ s: _ }: { s: SandboxDTO }) {
  const t = useT();
  // TODO: port list not in SandboxDTO — requires port exposure endpoint (P1)
  return (
    <Card
      title={t('detail.tab.ports')}
      footer={<Button variant="primary" size="sm"><TlnIcon name="plus" size={12} />{t('detail.exposePort')}</Button>}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>{t('detail.noPorts')}</span>
    </Card>
  );
}

// ── Files tab ─────────────────────────────────────────────────────────────────
export function TabFiles({ s: _ }: { s: SandboxDTO }) {
  const t = useT();
  // TODO: file browser requires GET /v1/sandboxes/{id}/fs-* (P2)
  return (
    <div className="sbx-2col">
      <Card title="/workspace">
        <div style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
          {/* TODO: file tree requires /v1/sandboxes/{id}/fs endpoint */}
          {t('common.comingSoon')}
        </div>
      </Card>
      <Card title="">
        <div style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
          {t('common.comingSoon')}
        </div>
      </Card>
    </div>
  );
}

// ── Network tab ───────────────────────────────────────────────────────────────
export function TabNetwork({ s }: { s: SandboxDTO }) {
  const t = useT();
  return (
    <div className="sbx-2col">
      <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="shield" size={14} style={{ color: 'var(--info)' }} />{t('detail.networkPolicy')}</span>}>
        <KV items={[
          { label: t('detail.policy'),        value: s.network_policy ?? 'allow-all' },
          { label: t('detail.blocked24h'),     value: '—' },
        ]} />
        {/* TODO: allowlist hosts not in SandboxDTO — needs network policy endpoint (P2) */}
      </Card>
      <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="alert" size={14} style={{ color: 'var(--warn)' }} />{t('detail.recentBlocked')}</span>}>
        <div style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
          {/* TODO: blocked request list requires audit filtering (P2) */}
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
