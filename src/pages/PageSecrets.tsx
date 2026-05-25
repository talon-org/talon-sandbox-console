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

import './PageSecrets.css';

function relTime(sec: number): string {
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function secsAgo(unix: number): number {
  return Math.round((Date.now() / 1000) - unix);
}

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
    if (scope === 'rotate-due' && !s.last_rotated_at) return false;
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
        eyebrow={t('secrets.eyebrow')}
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

            {list.map(s => {
              const rotatedAgo   = s.last_rotated_at ? relTime(secsAgo(s.last_rotated_at)) : '—';
              const rotateDueFlag = !s.last_rotated_at;
              return (
                <div key={s.id} className="tln-tbl-row sec-row" style={{ cursor: 'default' }}>
                  <div className="name-cell">
                    <div className="sic"><TlnIcon name="key" size={12} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span className="sn">
                        {s.name}
                        {rotateDueFlag && (
                          <span className="rotate-warn">
                            <TlnIcon name="refresh" size={9} />
                            {t('secrets.filterRotate')}
                          </span>
                        )}
                      </span>
                      <span className="scope-pill">{t('secrets.filterTenant')}</span>
                    </div>
                  </div>
                  <div className="mono">{rotatedAgo}</div>
                  <div className="mono">—</div>
                  <div className="mono" style={{ color: 'var(--fg-1)' }}>{s.used_by_count.toLocaleString()}</div>
                  <div className="mono">{s.used_by_count}</div>
                  <div className="mono">—</div>
                  <div className="actions">
                    <Button variant="ghost" size="sm"
                      onClick={() => toast.warn(s.name + ' — ' + t('secrets.viewToast'))}>
                      <TlnIcon name="eye" size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRotateTarget(s)}>
                      <TlnIcon name="refresh" size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" iconOnly aria-label={t('secrets.rotate')}>
                      <TlnIcon name="more" size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}

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
