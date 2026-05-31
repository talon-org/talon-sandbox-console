/* PageApiKeys — 自助 API Key 管理（普通用户可见）。
 * 数据：useApiKeys() / useDeleteApiKey() / useRevealApiKey()
 * 权限：列表 viewer 可读；创建/reveal/吊销 developer+ —— 后端已用 chainDev 挡，
 *        前端对非 developer 禁用按钮，403 时 toast 后端错误。
 */
import { useState } from 'react';
import {
  Button, PageHeader, toast,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useApiKeys, useDeleteApiKey, useRevealApiKey } from '../hooks/useApiKeys';
import { useRole, isViewer as roleIsViewer } from '../lib/permissions';
import { EmptyState, ConfirmDialog } from '../components';
import { CreateApiKeyDrawer } from './_apiKeys/CreateApiKeyDrawer';
import type { ApiKeyDTO } from '../api/types';

import './PageApiKeys.css';

export function PageApiKeys() {
  const t = useT();

  // 判断角色：viewer 不可写，developer/owner 可写 —— 判定收口到 lib/permissions
  const isViewer = roleIsViewer(useRole());

  const { data, isLoading, isError, error } = useApiKeys();
  const deleteMutation = useDeleteApiKey();
  const revealMutation = useRevealApiKey();

  const [drawer,        setDrawer]        = useState(false);
  const [revokeTarget,  setRevokeTarget]  = useState<ApiKeyDTO | null>(null);
  const [copyingId,     setCopyingId]     = useState<string | null>(null);

  const keys = data?.keys ?? [];

  /** 复制图标点击：调 reveal → 写剪贴板 → toast */
  const handleCopy = async (key: ApiKeyDTO) => {
    if (!key.can_reveal) return;
    setCopyingId(key.id);
    try {
      const result = await revealMutation.mutateAsync(key.id);
      await navigator.clipboard.writeText(result.api_key);
      toast.success(t('apiKeys.copied'));
    } catch (err: unknown) {
      const status = (err as { status?: number } | null)?.status;
      if (status === 403) {
        toast.error(t('apiKeys.viewerNote'));
      } else {
        toast.error(t('common.loadFailed'));
      }
    } finally {
      setCopyingId(null);
    }
  };

  /** 吊销确认 */
  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    const { id, label } = revokeTarget;
    setRevokeTarget(null);
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(label + ' — ' + t('apiKeys.revokeSuccess')),
      onError: (err: unknown) => {
        const status = (err as { status?: number } | null)?.status;
        if (status === 403) {
          toast.error(t('apiKeys.viewerNote'));
        } else {
          toast.error(t('common.loadFailed'));
        }
      },
    });
  };

  return (
    <>
      <PageHeader
        title={t('apiKeys.title')}
        num={String(keys.length)}
        desc={t('apiKeys.desc')}
        actions={
          <Button
            variant="primary"
            onClick={() => setDrawer(true)}
            disabled={isViewer}
            title={isViewer ? t('apiKeys.viewerNote') : undefined}
          >
            <TlnIcon name="plus" size={14} />
            {t('apiKeys.create.title')}
          </Button>
        }
      />

      <div className="page-body">
        {/* viewer 角色提示 banner */}
        {isViewer && (
          <div className="ak-viewer-note">
            <TlnIcon name="info" size={13} />
            {t('apiKeys.viewerNote')}
          </div>
        )}

        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError   && <EmptyState variant="error"   error={error} />}

        {!isLoading && !isError && (
          <div className="tln-tbl">
            <div className="tln-tbl-head ak-row">
              <div>{t('apiKeys.colLabel')}</div>
              <div>{t('apiKeys.colKey')}</div>
              <div>{t('apiKeys.colCreated')}</div>
              <div>{t('apiKeys.colLastUsed')}</div>
              <div />
            </div>

            {keys.map(key => {
              // 本地简版 relTime，不依赖 audit.relTime 翻译键
              const fmtAgo = (sec: number) => {
                if (sec < 60)    return `${sec}s`;
                if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
                if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
                return `${Math.floor(sec / 86400)}d`;
              };
              const createdAgo = fmtAgo(Math.round(Date.now() / 1000 - key.created_at));
              const lastUsed   = key.last_used && key.last_used > 0
                ? fmtAgo(Math.round(Date.now() / 1000 - key.last_used))
                : t('apiKeys.neverUsed');
              const isCopying  = copyingId === key.id;

              return (
                <div key={key.id} className="tln-tbl-row ak-row" style={{ cursor: 'default' }}>
                  {/* Label */}
                  <div className="name-cell">
                    <div className="ak-ic"><TlnIcon name="key" size={12} /></div>
                    <span className="ak-label" title={key.label}>{key.label}</span>
                  </div>

                  {/* 掩码 key + 复制图标 */}
                  <div className="ak-key-cell">
                    <span className="ak-masked">{key.masked}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => handleCopy(key)}
                      disabled={!key.can_reveal || isViewer || isCopying}
                      loading={isCopying}
                      title={key.can_reveal
                        ? t('apiKeys.copyToClipboard')
                        : t('apiKeys.cannotReveal')}
                      aria-label={key.can_reveal
                        ? t('apiKeys.copyToClipboard')
                        : t('apiKeys.cannotReveal')}
                    >
                      <TlnIcon name="copy" size={13} />
                    </Button>
                  </div>

                  {/* 创建时间 */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>
                    {createdAgo}
                  </div>

                  {/* 上次使用 */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>
                    {lastUsed}
                  </div>

                  {/* 吊销按钮 */}
                  <div className="actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => setRevokeTarget(key)}
                      disabled={isViewer}
                      title={t('apiKeys.revoke')}
                      aria-label={t('apiKeys.revoke')}
                    >
                      <TlnIcon name="trash" size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}

            {keys.length === 0 && (
              <div style={{ padding: 32 }}>
                <EmptyState
                  icon={<TlnIcon name="key" size={24} />}
                  title={t('apiKeys.empty.head')}
                  description={t('apiKeys.empty.desc')}
                  action={
                    !isViewer ? (
                      <Button variant="primary" onClick={() => setDrawer(true)}>
                        <TlnIcon name="plus" size={14} />
                        {t('apiKeys.create.title')}
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      <CreateApiKeyDrawer open={drawer} onClose={() => setDrawer(false)} />

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        title={t('apiKeys.revokeTitle')}
        description={t('apiKeys.revokeBody')}
        confirmLabel={t('apiKeys.revokeConfirm')}
        danger
      />
    </>
  );
}
