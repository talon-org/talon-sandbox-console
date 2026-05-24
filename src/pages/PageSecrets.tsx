/* PageSecrets — secrets list + create drawer + rotate dialog.
 * 1:1 port of page-secrets.jsx prototype.
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader, Button, Input, Select, Textarea, Switch,
  Drawer, Dialog, EmptyState, Badge, toast,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_SECRETS, relTime } from '../mock/data';
import type { MockSecret } from '../mock/data';
// TODO: replace mock with apiGet('/v1/secrets'), apiPost('/v1/secrets')

// ── inject styles once ────────────────────────────────────────────────────────
if (!document.getElementById('tln-page-secrets-styles')) {
  const s = document.createElement('style');
  s.id = 'tln-page-secrets-styles';
  s.textContent = `
.sec-row { grid-template-columns: 1.5fr 1fr 1fr 0.8fr 0.8fr 0.9fr 60px; }
.sec-row .name-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sec-row .name-cell .sic {
  width: 24px; height: 24px; border-radius: var(--r-2);
  background: var(--magenta-soft, rgba(198,120,221,0.1));
  color: var(--magenta, #c678dd);
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
}
.sec-row .name-cell .sn   { font-family: var(--font-mono); font-size: 12.5px; color: var(--fg-0); font-weight: 500; }
.sec-row .scope-pill {
  font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-2);
  background: var(--bg-3); padding: 2px 7px; border-radius: 3px;
  border: 1px solid var(--line); width: fit-content;
}
.sec-row .scope-pill.sandbox { color: var(--info); background: var(--info-soft); border-color: transparent; }
.sec-row .rotate-warn {
  display: inline-flex; align-items: center; gap: 4px; color: var(--warn);
  font-family: var(--font-mono); font-size: 10px; text-transform: uppercase;
  letter-spacing: 0.08em; background: var(--warn-soft);
  padding: 1px 6px; border-radius: 3px; margin-left: 6px;
}
.sec-summary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px;
}
.sec-sum-card {
  border: 1px solid var(--line); border-radius: var(--r-3);
  background: var(--bg-2); padding: 16px 18px;
}
.sec-sum-card .micro { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
.sec-sum-card .snum { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; color: var(--fg-0); font-variant-numeric: tabular-nums; display: flex; align-items: baseline; gap: 4px; }
.sec-sum-card .snum .unit { font-size: 12px; color: var(--fg-3); font-family: var(--font-mono); font-weight: 400; }
.sec-sum-card .sdelta { margin-top: 6px; font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-2); }
.sec-sum-card .sdelta.warn { color: var(--warn); }
`;
  document.head.appendChild(s);
}

// ── CreateSecretDrawer ────────────────────────────────────────────────────────
interface CreateSecretDrawerProps { open: boolean; onClose: () => void }

function CreateSecretDrawer({ open, onClose }: CreateSecretDrawerProps) {
  const t = useT();
  const [name,       setName]       = useState('');
  const [value,      setValue]      = useState('');
  const [scope,      setScope]      = useState('tenant');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showValue,  setShowValue]  = useState(false);
  const [busy,       setBusy]       = useState(false);

  const valid = /^[A-Z][A-Z0-9_]+$/.test(name) && value.length > 0;

  const create = async () => {
    if (!valid) return;
    setBusy(true);
    // TODO: apiPost('/v1/secrets', { name, value, scope, auto_rotate: autoRotate })
    await new Promise(r => setTimeout(r, 300));
    toast.success(name + ' created · KMS-encrypted');
    setName(''); setValue('');
    setBusy(false);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width={520}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TlnIcon name="key" size={16} style={{ color: 'var(--magenta, #c678dd)' }} />
          {t('secrets.create.title')}
        </span>
      }
    >
      {/* identity */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="key" size={14} className="ic" />
          {t('secrets.create.identity')}
        </div>
        <div className="form-field">
          <label className="ff-label" htmlFor="sec-name">Name</label>
          <Input
            id="sec-name"
            mono
            value={name}
            onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
            placeholder="GITHUB_TOKEN"
          />
          <div className="ff-hint">{t('secrets.create.nameHint')}</div>
        </div>
        <div className="form-field">
          <label className="ff-label" htmlFor="sec-scope">Scope</label>
          <Select id="sec-scope" value={scope} onChange={e => setScope(e.target.value)}>
            <option value="tenant">{t('secrets.scopeTenant')}</option>
            <option value="sandbox">Specific sandbox…</option>
          </Select>
          <div className="ff-hint">{t('secrets.create.scopeHint')}</div>
        </div>
      </div>

      {/* value */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="lock" size={14} className="ic" />
          {t('secrets.create.value')}
          <span className="hint">
            <Button variant="ghost" size="sm" onClick={() => setShowValue(v => !v)}>
              <TlnIcon name={showValue ? 'eyeOff' : 'eye'} size={13} />
              {showValue ? 'Hide' : 'Show'}
            </Button>
          </span>
        </div>
        <Textarea
          value={showValue ? value : value.replace(/./g, '•')}
          onChange={e => { if (showValue) setValue(e.target.value); }}
          placeholder={showValue ? 'Paste secret value' : 'Paste secret value (hidden)'}
          rows={5}
        />
        <div className="ff-hint">{t('secrets.create.valueHint')}</div>
      </div>

      {/* rotation */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="refresh" size={14} className="ic" />
          {t('secrets.create.rotation')}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0' }}>
          <Switch checked={autoRotate} onChange={setAutoRotate} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-0)' }}>{t('secrets.create.autoRotate')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>{t('secrets.create.autoRotateDesc')}</div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
        <div className="drawer-footer">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <TlnIcon name="lock" size={11} />
            KMS · AES-256-GCM
          </span>
          <div className="right">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" disabled={!valid || busy} loading={busy} onClick={create}>
              <TlnIcon name="check" size={14} />
              Create
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageSecrets() {
  const t              = useT();
  const [searchParams] = useSearchParams();

  const [drawer,       setDrawer]       = useState(false);
  const [rotateTarget, setRotateTarget] = useState<MockSecret | null>(null);
  const [search,       setSearch]       = useState('');
  const [scope,        setScope]        = useState('all');

  useEffect(() => {
    if (searchParams.get('new') === '1') setDrawer(true);
  }, [searchParams]);

  const list = MOCK_SECRETS.filter(s => {
    if (scope === 'tenant'     && !s.scope.startsWith('tenant'))  return false;
    if (scope === 'sandbox'    && !s.scope.startsWith('sandbox')) return false;
    if (scope === 'rotate-due' && !s.rotateDue)                   return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalUsage = MOCK_SECRETS.reduce((a, b) => a + b.usageCount, 0);
  const rotateDue  = MOCK_SECRETS.filter(s => s.rotateDue).length;

  const filterBtn = (val: string, label: string) => (
    <button key={val} className="sbx-filter" aria-pressed={scope === val} onClick={() => setScope(val)}>
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        eyebrow={t('secrets.eyebrow')}
        title={t('secrets.title')}
        num={String(MOCK_SECRETS.length)}
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
        {/* summary cards */}
        <div className="sec-summary">
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.total')}</div>
            <div className="snum">{MOCK_SECRETS.length}</div>
            <div className="sdelta">↑ +3 last 30d</div>
          </div>
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.accessed24h')}</div>
            <div className="snum">{Math.round(totalUsage / 30).toLocaleString()}<span className="unit">today</span></div>
            <div className="sdelta">total {totalUsage.toLocaleString()}</div>
          </div>
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.rotateDue')}</div>
            <div className="snum" style={{ color: rotateDue ? 'var(--warn)' : undefined }}>{rotateDue}</div>
            <div className={'sdelta' + (rotateDue ? ' warn' : '')}>{rotateDue ? t('secrets.checkNow') : t('secrets.allCurrent')}</div>
          </div>
          <div className="sec-sum-card">
            <div className="micro">{t('secrets.encryption')}</div>
            <div className="snum" style={{ color: 'var(--ok)' }}>KMS</div>
            <div className="sdelta">AES-256-GCM · tenant key</div>
          </div>
        </div>

        {/* filters */}
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
            placeholder="Filter by name…"
            prefix={<TlnIcon name="search" size={14} style={{ color: 'var(--fg-3)' }} />}
            style={{ width: 280 }}
          />
        </div>

        {/* table */}
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
            const isSandbox = s.scope.startsWith('sandbox');
            const rotatedAgo = Math.round((Date.now() - new Date(s.lastRotated).getTime()) / 1000);
            const usedAgo    = Math.round((Date.now() - new Date(s.lastUsed).getTime()) / 1000);
            return (
              <div key={s.id} className="tln-tbl-row sec-row" style={{ cursor: 'default' }}>
                {/* name */}
                <div className="name-cell">
                  <div className="sic"><TlnIcon name="key" size={12} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span className="sn">
                      {s.name}
                      {s.rotateDue && (
                        <span className="rotate-warn">
                          <TlnIcon name="refresh" size={9} />rotate
                        </span>
                      )}
                    </span>
                    <span className={'scope-pill' + (isSandbox ? ' sandbox' : '')}>{s.scope}</span>
                  </div>
                </div>
                <div className="mono">{relTime(rotatedAgo)}</div>
                <div className="mono">{relTime(usedAgo)}</div>
                <div className="mono" style={{ color: 'var(--fg-1)' }}>{s.usageCount.toLocaleString()}</div>
                <div className="mono">{s.sandboxes}</div>
                <div className="mono">{s.createdBy}</div>
                <div className="actions">
                  <Button variant="ghost" size="sm" onClick={() => toast.warn(s.name + ' · shown 30s')}>
                    <TlnIcon name="eye" size={13} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRotateTarget(s)}>
                    <TlnIcon name="refresh" size={13} />
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly aria-label="More">
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
                eyebrow="no match"
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
      </div>

      <CreateSecretDrawer open={drawer} onClose={() => setDrawer(false)} />

      {/* rotate dialog */}
      <Dialog
        open={!!rotateTarget}
        onClose={() => setRotateTarget(null)}
        title={
          <>
            {t('secrets.rotateTitle')}&nbsp;
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--magenta, #c678dd)' }}>{rotateTarget?.name}</span>
          </>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRotateTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => {
              const name = rotateTarget?.name;
              setRotateTarget(null);
              if (name) toast.success(name + ' rotated · sandboxes will refresh within 60s');
            }}>
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
