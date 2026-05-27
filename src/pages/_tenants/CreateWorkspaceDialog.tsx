/* src/pages/_tenants/CreateWorkspaceDialog.tsx
 * Dialog form for creating a new workspace (tenant).
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button, Input, Select, toast,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { useCreateTenant } from '../../hooks/useTenants';
import type { TenantDetailDTO } from '../../api/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceDialog({ open, onClose }: Props) {
  const t = useT();
  const createMutation = useCreateTenant();

  const [id,   setId]   = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<TenantDetailDTO['plan']>('free');

  const idValid   = /^[a-z][a-z0-9-]{1,48}$/.test(id);
  const nameValid = name.trim().length > 0;
  const valid     = idValid && nameValid;
  const busy      = createMutation.isPending;

  const handleSubmit = () => {
    if (!valid || busy) return;
    createMutation.mutate(
      { id, name: name.trim(), plan },
      {
        onSuccess: () => {
          toast.success(t('tenants.create.successToast'));
          setId('');
          setName('');
          setPlan('free');
          onClose();
        },
        onError: () => toast.error(t('common.loadFailed')),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tenants.create.title')}</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 360 }}>
          <div className="form-field">
            <label className="ff-label" htmlFor="ws-id">{t('tenants.create.idLabel')}</label>
            <Input
              id="ws-id"
              mono
              value={id}
              onChange={e => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={t('tenants.create.idPlaceholder')}
              invalid={id.length > 0 && !idValid}
            />
            <div className="ff-hint">{t('tenants.create.idHint')}</div>
          </div>
          <div className="form-field">
            <label className="ff-label" htmlFor="ws-name">{t('tenants.create.nameLabel')}</label>
            <Input
              id="ws-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('tenants.create.namePlaceholder')}
            />
          </div>
          <div className="form-field">
            <label className="ff-label" htmlFor="ws-plan">{t('tenants.create.planLabel')}</label>
            <Select
              id="ws-plan"
              value={plan}
              onChange={e => setPlan(e.target.value as TenantDetailDTO['plan'])}
            >
              <option value="free">{t('tenants.drawer.planFree')}</option>
              <option value="team">{t('tenants.drawer.planTeam')}</option>
              <option value="enterprise">{t('tenants.drawer.planEnt')}</option>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={!valid || busy} loading={busy} onClick={handleSubmit}>
            {t('tenants.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
