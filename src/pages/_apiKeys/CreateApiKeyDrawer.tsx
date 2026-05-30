/* src/pages/_apiKeys/CreateApiKeyDrawer.tsx
 * 创建 API Key 的抽屉表单，风格对齐 CreateSecretDrawer。
 */
import { useState } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
  Button, Input, toast,
  FormField, FormLabel, FormControl, FormDescription, FormSection,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useCreateApiKey } from '../../hooks/useApiKeys';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateApiKeyDrawer({ open, onClose }: Props) {
  const t = useT();
  const createMutation = useCreateApiKey();

  const [label, setLabel] = useState('');

  const valid = label.trim().length > 0;
  const busy  = createMutation.isPending;

  const handleCreate = () => {
    if (!valid || busy) return;
    createMutation.mutate(
      { label: label.trim() },
      {
        onSuccess: () => {
          // 明文 key 可通过列表行的复制图标随时 reveal，不再一次性弹窗
          toast.success(t('apiKeys.create.title') + ' — ' + label.trim());
          setLabel('');
          onClose();
        },
        onError: (err: unknown) => {
          // 403 时给可读提示（viewer 角色误点创建）
          const status = (err as { status?: number } | null)?.status;
          if (status === 403) {
            toast.error(t('apiKeys.viewerNote'));
          } else {
            toast.error(t('common.loadFailed'));
          }
        },
      },
    );
  };

  const drawerTitle = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <TlnIcon name="key" size={16} style={{ color: 'var(--info)' }} />
      {t('apiKeys.create.title')}
    </span>
  );

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent side="right" style={{ width: 480 }}>
        <DrawerHeader>
          <DrawerTitle>{drawerTitle}</DrawerTitle>
        </DrawerHeader>
        <div className="tln-drawer-body">
          <FormSection
            icon={<TlnIcon name="key" size={14} />}
            title={t('apiKeys.field.name')}
          >
            <FormField>
              <FormLabel htmlFor="ak-label">{t('apiKeys.create.labelLabel')}</FormLabel>
              <FormControl>
                <Input
                  id="ak-label"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={t('apiKeys.create.labelPlaceholder')}
                  autoComplete="off"
                />
              </FormControl>
              <FormDescription>{t('apiKeys.create.labelHint')}</FormDescription>
            </FormField>
          </FormSection>
        </div>
        <DrawerFooter>
          <div className="right">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              disabled={!valid || busy}
              loading={busy}
              onClick={handleCreate}
            >
              <TlnIcon name="check" size={14} />
              {t('apiKeys.create.submit')}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
