/* src/pages/_secrets/CreateSecretDrawer.tsx
 * Drawer form for creating a new secret.
 */
import { useState } from 'react';
import {
  Drawer, Button, Input, Select, Textarea, Switch, toast,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useCreateSecret } from '../../hooks/useSecrets';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateSecretDrawer({ open, onClose }: Props) {
  const t = useT();
  const createMutation = useCreateSecret();

  const [name,       setName]       = useState('');
  const [value,      setValue]      = useState('');
  const [scope,      setScope]      = useState('tenant');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showValue,  setShowValue]  = useState(false);

  const valid = /^[A-Z][A-Z0-9_]+$/.test(name) && value.length > 0;
  const busy  = createMutation.isPending;

  const handleCreate = () => {
    if (!valid || busy) return;
    createMutation.mutate(
      { name, value: value.trimEnd() },
      {
        onSuccess: () => {
          toast.success(name + ' ' + t('secrets.create.submit').toLowerCase());
          setName('');
          setValue('');
          setScope('tenant');
          setAutoRotate(false);
          onClose();
        },
        onError: () => {
          toast.error(name + ' — ' + t('common.loadFailed'));
        },
      },
    );
  };

  const drawerTitle = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <TlnIcon name="key" size={16} style={{ color: 'var(--magenta, #c678dd)' }} />
      {t('secrets.create.title')}
    </span>
  );

  return (
    <Drawer open={open} onClose={onClose} side="right" width={520} title={drawerTitle}>
      {/* identity */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="key" size={14} className="ic" />
          {t('secrets.create.identity')}
        </div>
        <div className="form-field">
          <label className="ff-label" htmlFor="sec-name">{t('secrets.create.nameLabel')}</label>
          <Input
            id="sec-name"
            mono
            value={name}
            onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
            placeholder={t('secrets.create.namePlaceholder')}
          />
          <div className="ff-hint">{t('secrets.create.nameHint')}</div>
        </div>
        <div className="form-field">
          <label className="ff-label" htmlFor="sec-scope">{t('secrets.create.scopeLabel')}</label>
          <Select id="sec-scope" value={scope} onChange={e => setScope(e.target.value)}>
            <option value="tenant">{t('secrets.scopeTenant')}</option>
            <option value="sandbox">{t('secrets.create.scopeSandbox')}</option>
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
              {showValue ? t('secrets.create.hideValue') : t('secrets.create.showValue')}
            </Button>
          </span>
        </div>
        <Textarea
          value={showValue ? value : value.replace(/./g, '•')}
          onChange={e => { if (showValue) setValue(e.target.value); }}
          placeholder={showValue ? t('secrets.create.valuePlaceholder') : t('secrets.create.valuePlaceholderHide')}
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
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>
              {t('secrets.create.autoRotateDesc')}
            </div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
        <div className="drawer-footer">
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <TlnIcon name="lock" size={11} />
            {t('secrets.create.kmsNote')}
          </span>
          <div className="right">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" disabled={!valid || busy} loading={busy} onClick={handleCreate}>
              <TlnIcon name="check" size={14} />
              {t('secrets.create.submit')}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
