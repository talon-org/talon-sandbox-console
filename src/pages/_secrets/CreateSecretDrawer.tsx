/* src/pages/_secrets/CreateSecretDrawer.tsx
 * Drawer form for creating a new secret.
 *
 * Scope is fixed to "tenant" — the backend doesn't yet distinguish
 * tenant/sandbox secret scope on POST /v1/secrets. Auto-rotation is also
 * not wired up server-side, so we don't show the toggle until that
 * capability lands. Don't render UI for fields the backend can't save.
 */
import { useState } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
  Button, Input, Textarea, toast,
  FormField, FormLabel, FormControl, FormDescription, FormSection,
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

  const [name,      setName]      = useState('');
  const [value,     setValue]     = useState('');
  const [showValue, setShowValue] = useState(false);

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
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent side="right" style={{ width: 520 }}>
        <DrawerHeader>
          <DrawerTitle>{drawerTitle}</DrawerTitle>
        </DrawerHeader>
      <div className="tln-drawer-body">
        <FormSection
          icon={<TlnIcon name="key" size={14} />}
          title={t('secrets.create.identity')}
        >
          <FormField>
            <FormLabel htmlFor="sec-name">{t('secrets.create.nameLabel')}</FormLabel>
            <FormControl>
              <Input
                id="sec-name"
                mono
                value={name}
                onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder={t('secrets.create.namePlaceholder')}
              />
            </FormControl>
            <FormDescription>{t('secrets.create.nameHint')}</FormDescription>
          </FormField>
        </FormSection>

        <FormSection
          icon={<TlnIcon name="lock" size={14} />}
          title={t('secrets.create.value')}
          hint={
            <Button variant="ghost" size="sm" onClick={() => setShowValue(v => !v)}>
              <TlnIcon name={showValue ? 'eyeOff' : 'eye'} size={13} />
              {showValue ? t('secrets.create.hideValue') : t('secrets.create.showValue')}
            </Button>
          }
        >
          <FormField>
            <FormControl>
              <Textarea
                value={showValue ? value : value.replace(/./g, '•')}
                onChange={e => { if (showValue) setValue(e.target.value); }}
                placeholder={showValue ? t('secrets.create.valuePlaceholder') : t('secrets.create.valuePlaceholderHide')}
                rows={5}
              />
            </FormControl>
            <FormDescription>{t('secrets.create.valueHint')}</FormDescription>
          </FormField>
        </FormSection>
      </div>
      <DrawerFooter>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
          display: 'flex', alignItems: 'center', gap: 5, marginRight: 'auto',
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
      </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
