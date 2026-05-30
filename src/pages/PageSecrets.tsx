/* PageSecrets — secrets list + create drawer + rotate dialog + delete confirm.
 * Data: useSecrets() / useRotateSecret() / useDeleteSecret() from src/hooks/useSecrets.ts
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Input, PageHeader,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  toast,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useSecrets, useRotateSecret, useDeleteSecret } from '../hooks/useSecrets';
import { EmptyState as LocalEmptyState } from '../components';
import { ConfirmDialog } from '../components';
import type { SecretDTO } from '../api/types';
import { CreateSecretDrawer } from './_secrets/CreateSecretDrawer';
import { SecretRow } from './_secrets/SecretRow';

import './PageSecrets.css';

export function PageSecrets() {
  const t              = useT();
  const [searchParams] = useSearchParams();
  const [drawer,       setDrawer]       = useState(false);
  const [rotateTarget, setRotateTarget] = useState<SecretDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SecretDTO | null>(null);
  const [search,       setSearch]       = useState('');
  const [scope,        setScope]        = useState('all');

  const { data, isLoading, isError, error } = useSecrets();
  const rotateMutation = useRotateSecret();
  const deleteMutation = useDeleteSecret();

  useEffect(() => {
    if (searchParams.get('new') === '1') setDrawer(true);
  }, [searchParams]);

  const all = data?.secrets ?? [];

  const list = all.filter(s => {
    // rotate-due 过滤：last_rotated_at 为空代表需要轮换
    if (scope === 'rotate-due' && s.last_rotated_at) return false;
    // tenant/sandbox 范围过滤：按 G5 scope 字段匹配（缺省视为 tenant）
    if (scope === 'tenant'  && (s.scope ?? 'tenant') !== 'tenant')  return false;
    if (scope === 'sandbox' && s.scope !== 'sandbox') return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rotateDue = all.filter(s => !s.last_rotated_at).length;

  const filterBtn = (val: string, label: string) => (
    <button type="button" key={val} className="sbx-filter" aria-pressed={scope === val} onClick={() => setScope(val)}>
      {label}
    </button>
  );

  const handleRotateConfirm = () => {
    if (!rotateTarget) return;
    const name = rotateTarget.name;
    const id   = rotateTarget.id;
    setRotateTarget(null);
    rotateMutation.mutate(
      { id },
      {
        onSuccess: () => toast.success(name + ' — ' + t('secrets.rotateSuccess')),
        onError:   () => toast.error(name + ' — ' + t('common.loadFailed')),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    const id   = deleteTarget.id;
    setDeleteTarget(null);
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(name + ' — ' + t('secrets.deleteSuccess')),
      onError:   () => toast.error(name + ' — ' + t('common.loadFailed')),
    });
  };

  // 导出当前可见列表为 CSV（纯前端，RFC4180 转义 + BOM）。
  // 安全提醒：只导出元数据字段（name、scope、created_by、used_by_count 等），
  // 凭据值（value / ciphertext）后端本就不返回，此处绝对不含任何密文。
  const handleExportCsv = useCallback(() => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['name', 'scope', 'created_by', 'used_by_count', 'last_rotated_at', 'last_used_at', 'expires_at'];
    const rows = list.map(s => [
      s.name,
      s.scope ?? 'tenant',
      s.created_by ?? '',
      s.used_by_count,
      s.last_rotated_at ?? '',
      s.last_used_at ?? '',
      s.expires_at ?? '',
    ].map(esc).join(','));
    const csv = '﻿' + [header.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `secrets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [list]);

  return (
    <>
      <PageHeader
        title={t('secrets.title')}
        num={String(all.length)}
        desc={t('secrets.desc')}
        actions={
          <>
            <Button variant="default" onClick={handleExportCsv} disabled={list.length === 0}>
              <TlnIcon name="download" size={14} />
              {t('common.export')}
            </Button>
            <Button variant="primary" onClick={() => setDrawer(true)}>
              <TlnIcon name="plus" size={14} />
              {t('secrets.create.title')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        <div className="sec-summary">
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.total')}</div>
            <div className="snum">{all.length}</div>
          </div>
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.accessed24h')}</div>
            <div className="snum">{all.reduce((a, s) => a + s.used_by_count, 0).toLocaleString()}</div>
          </div>
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.rotateDue')}</div>
            <div className="snum" style={{ color: rotateDue ? 'var(--warn)' : undefined }}>{rotateDue}</div>
            <div className={'sdelta' + (rotateDue ? ' warn' : '')}>
              {rotateDue ? t('secrets.checkNow') : t('secrets.allCurrent')}
            </div>
          </div>
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.encryption')}</div>
            <div className="snum" style={{ color: 'var(--ok)' }}>KMS</div>
            <div className="sdelta">{t('secrets.encryptionNote')}</div>
          </div>
        </div>

        <div className="sbx-filters" style={{ marginBottom: 14 }}>
          <div className="group">
            {filterBtn('all',        t('secrets.filterAll'))}
            {filterBtn('tenant',     t('secrets.filterTenant'))}
            {filterBtn('sandbox',    t('secrets.filterSandbox'))}
            {filterBtn('rotate-due', t('secrets.filterRotate'))}
          </div>
          <div style={{ flex: 1 }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('secrets.searchPlaceholder')}
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 280 }}
          />
        </div>

        {isLoading && <LocalEmptyState variant="loading" title={t('common.loading')} />}
        {isError   && <LocalEmptyState variant="error"   error={error} />}

        {!isLoading && !isError && (
          <div className="tln-tbl">
            <div className="tln-tbl-head sec-row">
              <div>{t('secrets.colName')}</div>
              <div>{t('secrets.colRotated')}</div>
              <div>{t('secrets.colUsed')}</div>
              <div>{t('secrets.colSandboxes')}</div>
              <div>{t('secrets.colCreatedBy')}</div>
              <div />
            </div>

            {list.map(s => (
              <SecretRow
                key={s.id}
                secret={s}
                onRotate={setRotateTarget}
                onDelete={setDeleteTarget}
              />
            ))}

            {list.length === 0 && (
              <div style={{ padding: 32 }}>
                <LocalEmptyState
                  icon={<TlnIcon name="key" size={24} />}
                  title={t('secrets.empty.head')}
                  description={t('secrets.empty.desc')}
                  action={
                    <Button variant="primary" onClick={() => setDrawer(true)}>
                      <TlnIcon name="plus" size={14} />
                      {t('secrets.create.title')}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      <CreateSecretDrawer open={drawer} onClose={() => setDrawer(false)} />

      {/* 轮换确认弹窗 */}
      <Dialog open={!!rotateTarget} onOpenChange={(o) => { if (!o) setRotateTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('secrets.rotateTitle')}&nbsp;
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--magenta, #c678dd)' }}>
                {rotateTarget?.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          {t('secrets.rotateBody')}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRotateTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleRotateConfirm}>
              <TlnIcon name="refresh" size={14} />
              {t('secrets.rotateConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗（ConfirmDialog 复用 PageApiKeys 风格） */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={
          <>
            {t('secrets.deleteTitle')}&nbsp;
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--magenta, #c678dd)' }}>
              {deleteTarget?.name}
            </span>
          </>
        }
        description={t('secrets.deleteBody')}
        confirmLabel={t('secrets.deleteConfirm')}
        loading={deleteMutation.isPending}
        danger
      />
    </>
  );
}
