/* PageSecrets — secrets list + create drawer + rotate dialog.
 * Data: useSecrets() / useRotateSecret() from src/hooks/useSecrets.ts
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Button, Input, Dialog, EmptyState, toast } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useSecrets, useRotateSecret } from '../hooks/useSecrets';
import { EmptyState as LocalEmptyState } from '../components';
import type { SecretDTO } from '../api/types';
import { CreateSecretDrawer } from './_secrets/CreateSecretDrawer';
import { SecretRow } from './_secrets/SecretRow';

import './PageSecrets.css';

export function PageSecrets() {
  const t              = useT();
  const [searchParams] = useSearchParams();
  const [drawer,       setDrawer]       = useState(false);
  const [rotateTarget, setRotateTarget] = useState<SecretDTO | null>(null);
  const [search,       setSearch]       = useState('');
  const [scope,        setScope]        = useState('all');

  const { data, isLoading, isError } = useSecrets();
  const rotateMutation = useRotateSecret();

  useEffect(() => {
    if (searchParams.get('new') === '1') setDrawer(true);
  }, [searchParams]);

  const all = data?.secrets ?? [];

  const list = all.filter(s => {
    // rotate-due 过滤：last_rotated_at 为空代表需要轮换
    if (scope === 'rotate-due' && s.last_rotated_at) return false;
    // tenant/sandbox 范围过滤：按 scope 字段匹配
    if (scope === 'tenant'  && (s as { scope?: string }).scope !== 'tenant'  && (s as { scope?: string }).scope != null) return false;
    if (scope === 'sandbox' && (s as { scope?: string }).scope !== 'sandbox') return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rotateDue = all.filter(s => !s.last_rotated_at).length;

  const filterBtn = (val: string, label: string) => (
    <button key={val} className="sbx-filter" aria-pressed={scope === val} onClick={() => setScope(val)}>
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

  return (
    <>
      <PageHeader
        title={t('secrets.title')}
        num={String(all.length)}
        desc={t('secrets.desc')}
        actions={
          <>
            <Button variant="ghost">
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
        {isError   && <LocalEmptyState variant="error"   title={t('common.loadFailed')} />}

        {!isLoading && !isError && (
          <div className="tln-tbl">
            <div className="tln-tbl-head sec-row">
              <div>{t('secrets.colName')}</div>
              <div>{t('secrets.colRotated')}</div>
              <div>{t('secrets.colUsed')}</div>
              <div>{t('secrets.colUsage30d')}</div>
              <div>{t('secrets.colSandboxes')}</div>
              <div>{t('secrets.colCreatedBy')}</div>
              <div />
            </div>

            {list.map(s => (
              <SecretRow key={s.id} secret={s} onRotate={setRotateTarget} />
            ))}

            {list.length === 0 && (
              <div style={{ padding: 32 }}>
                <EmptyState
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

      <Dialog
        open={!!rotateTarget}
        onClose={() => setRotateTarget(null)}
        title={
          <>
            {t('secrets.rotateTitle')}&nbsp;
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--magenta, #c678dd)' }}>
              {rotateTarget?.name}
            </span>
          </>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRotateTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleRotateConfirm}>
              <TlnIcon name="refresh" size={14} />
              {t('secrets.rotateConfirm')}
            </Button>
          </>
        }
      >
        {t('secrets.rotateBody')}
      </Dialog>
    </>
  );
}
