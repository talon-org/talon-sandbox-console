/* PageWorkers — admin: worker nodes grouped by region.
 * Data: useWorkers() from src/hooks/useWorkers.ts
 * Non-admin gets error EmptyState from hook 403 — no ACL logic here.
 */
import { useState } from 'react';
import {
  Button, ProgressBar, PageHeader,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  toast,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useWorkers, useInviteWorker } from '../hooks/useWorkers';
import { EmptyState } from '../components';
import { RegionGroup } from './_workers/RegionGroup';
import type { WorkerDTO } from '../api/types';

import './PageWorkers.css';

export function PageWorkers() {
  const t = useT();
  const { data, isLoading, isError } = useWorkers();

  // G6: worker 邀请令牌弹窗状态
  const [inviteToken,    setInviteToken]    = useState<string | null>(null);
  const [inviteExpires,  setInviteExpires]  = useState<string>('');
  const invite = useInviteWorker();

  const ws = data?.workers ?? [];

  const byRegion: Record<string, WorkerDTO[]> = {};
  for (const w of ws) { (byRegion[w.region ?? 'unknown'] ??= []).push(w); }

  const stats = {
    total:    ws.length,
    healthy:  ws.filter(w => w.status === 'healthy').length,
    draining: ws.filter(w => w.status === 'draining').length,
    unhealthy:ws.filter(w => w.status === 'unhealthy').length,
    sandboxes:ws.reduce((a, w) => a + (w.sandboxes ?? w.sandbox_count ?? 0), 0),
    capacity: ws.reduce((a, w) => a + (w.capacity ?? w.max_sandboxes ?? 0), 0),
  };

  const numStr = `${stats.total} ${t('workers.nodesOf')} · ${Object.keys(byRegion).length} ${t('workers.regionsOf')}`;

  const handleInvite = () => {
    invite.mutate(undefined, {
      onSuccess: (res) => {
        setInviteToken(res.token);
        setInviteExpires(res.expires_at);
      },
      onError: () => toast.error(t('common.loadFailed')),
    });
  };

  return (
    <>
      <PageHeader
        title={t('workers.title')}
        num={numStr}
        desc={t('workers.desc')}
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="refresh" size={14} />
              {t('workers.sync')}
            </Button>
            {/* G6: 邀请令牌按钮 — 点击生成单次 token */}
            <Button variant="primary" loading={invite.isPending} onClick={handleInvite}>
              <TlnIcon name="plus" size={14} />
              {t('workers.join')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}

        {isError && (
          <EmptyState
            variant="error"
            title={t('workers.forbiddenTitle')}
            message={t('workers.forbidden')}
          />
        )}

        {!isLoading && !isError && (
          <>
            <div className="wkr-summary">
              <div className="wkr-sum-card ok">
                <div className="wlabel">
                  <TlnIcon name="dot" size={10} className="wic" />
                  {t('workers.healthy')}
                </div>
                <div className="wn">
                  {stats.healthy}
                  <span className="small">/ {stats.total} {t('workers.nodesOf')}</span>
                </div>
              </div>
              <div className="wkr-sum-card warn">
                <div className="wlabel">
                  <TlnIcon name="alert" size={11} className="wic" />
                  {t('workers.draining')}
                </div>
                <div className="wn">
                  {stats.draining}
                  <span className="small">{t('workers.gracefulExit')}</span>
                </div>
              </div>
              <div className="wkr-sum-card err">
                <div className="wlabel">
                  <TlnIcon name="alert" size={11} className="wic" />
                  {t('workers.unhealthy')}
                </div>
                <div className="wn">
                  {stats.unhealthy}
                  <span className="small">{t('workers.needsAttention')}</span>
                </div>
              </div>
              <div className="wkr-sum-card">
                <div className="wlabel">
                  <TlnIcon name="box" size={11} className="wic" />
                  {t('workers.capacity')}
                </div>
                <div className="wn">
                  {stats.sandboxes}
                  <span className="small">/ {stats.capacity}</span>
                </div>
                <ProgressBar value={stats.sandboxes} max={stats.capacity} />
              </div>
            </div>

            {Object.entries(byRegion).map(([region, workers]) => (
              <RegionGroup key={region} region={region} workers={workers} />
            ))}

            {ws.length === 0 && <EmptyState variant="empty" title={t('common.empty')} />}
          </>
        )}
      </div>

      {/* G6: 邀请令牌展示弹窗 — token 仅展示一次，关闭后无法恢复 */}
      <Dialog open={!!inviteToken} onOpenChange={(o) => { if (!o) setInviteToken(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TlnIcon name="key" size={15} style={{ color: 'var(--acc)' }} />
                {t('workers.inviteTitle')}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{t('workers.inviteBody')}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all',
              background: 'var(--bg-3)', border: '1px solid var(--line)',
              borderRadius: 'var(--r-2)', padding: '10px 12px', color: 'var(--fg-0)',
              userSelect: 'all',
            }}>
              {inviteToken}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>
              {t('workers.inviteExpires')} {inviteExpires}
            </div>
          </div>
          <DialogFooter>
            <Button variant="primary" onClick={() => {
              if (inviteToken) navigator.clipboard.writeText(inviteToken).catch(() => {});
              setInviteToken(null);
            }}>
              <TlnIcon name="check" size={14} />
              {t('workers.inviteCopy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
