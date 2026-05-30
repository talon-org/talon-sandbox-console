/* src/pages/_plans/PlanDrawer.tsx
 * 新建/编辑套餐抽屉，风格对齐 TenantDrawer。
 */
import { useState, useEffect } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
  Button, Input, toast,
  FormField, FormLabel, FormControl, FormDescription, FormSection,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useUpsertPlan } from '../../hooks/usePlans';
import type { PlanDTO } from '../../api/types';

interface Props {
  /** null = 新建模式；传入 PlanDTO = 编辑模式 */
  plan: PlanDTO | null;
  /** true = 打开（新建时 plan=null 但 open=true） */
  open: boolean;
  onClose: () => void;
}

export function PlanDrawer({ plan, open, onClose }: Props) {
  const t = useT();
  const upsertMutation = useUpsertPlan();
  const isEdit = plan !== null;

  // 表单字段
  const [code,       setCode]       = useState('');
  const [name,       setName]       = useState('');
  const [sandboxes,  setSandboxes]  = useState('10');
  const [vcpu,       setVcpu]       = useState('4');
  const [mem,        setMem]        = useState('8');
  const [disk,       setDisk]       = useState('40');
  const [isActive,   setIsActive]   = useState(true);

  // 编辑时回填
  useEffect(() => {
    if (plan) {
      setCode(plan.code);
      setName(plan.name);
      setSandboxes(String(plan.quota_max_sandboxes));
      setVcpu(String(plan.quota_vcpu));
      setMem(String(plan.quota_mem_gb));
      setDisk(String(plan.quota_disk_gb));
      setIsActive(plan.is_active);
    } else {
      setCode('');
      setName('');
      setSandboxes('10');
      setVcpu('4');
      setMem('8');
      setDisk('40');
      setIsActive(true);
    }
  }, [plan, open]);

  const valid = name.trim().length > 0
    && (isEdit || code.trim().length > 0)
    && Number(sandboxes) > 0
    && Number(vcpu) > 0
    && Number(mem) > 0
    && Number(disk) > 0;

  const busy = upsertMutation.isPending;

  const handleSubmit = () => {
    if (!valid || busy) return;
    upsertMutation.mutate(
      {
        code: isEdit ? plan!.code : code.trim().toLowerCase(),
        name: name.trim(),
        quota_max_sandboxes: Number(sandboxes),
        quota_vcpu: Number(vcpu),
        quota_mem_gb: Number(mem),
        quota_disk_gb: Number(disk),
        is_active: isActive,
      },
      {
        onSuccess: () => {
          toast.success(t('plans.saveSuccess'));
          onClose();
        },
        onError: () => toast.error(t('common.loadFailed')),
      },
    );
  };

  const drawerTitle = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <TlnIcon name="server" size={16} style={{ color: 'var(--acc)' }} />
      {isEdit ? t('plans.edit.title') : t('plans.create.title')}
    </span>
  );

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent side="right" style={{ width: 500 }}>
        <DrawerHeader>
          <DrawerTitle>{drawerTitle}</DrawerTitle>
        </DrawerHeader>
        <div className="tln-drawer-body">
          {/* 套餐身份 */}
          <FormSection
            icon={<TlnIcon name="info" size={14} />}
            title={t('plans.field.name')}
          >
            {/* 编辑模式 code 只读展示；新建时可输入 */}
            {isEdit ? (
              <FormField>
                <FormLabel>{t('plans.field.code')}</FormLabel>
                <FormControl>
                  <Input value={plan!.code} disabled mono />
                </FormControl>
              </FormField>
            ) : (
              <FormField>
                <FormLabel htmlFor="plan-code">{t('plans.field.code')}</FormLabel>
                <FormControl>
                  <Input
                    id="plan-code"
                    mono
                    value={code}
                    onChange={e => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder={t('plans.field.codePlaceholder')}
                  />
                </FormControl>
                <FormDescription>{t('plans.field.codeHint')}</FormDescription>
              </FormField>
            )}
            <FormField>
              <FormLabel htmlFor="plan-name">{t('plans.field.name')}</FormLabel>
              <FormControl>
                <Input
                  id="plan-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('plans.field.namePlaceholder')}
                />
              </FormControl>
            </FormField>
          </FormSection>

          {/* 配额 */}
          <FormSection
            icon={<TlnIcon name="cpu" size={14} />}
            title={t('tenants.drawer.quota')}
          >
            <FormField>
              <FormLabel htmlFor="plan-sandboxes">{t('plans.field.sandboxes')}</FormLabel>
              <FormControl>
                <Input
                  id="plan-sandboxes" type="number" min={1} mono
                  value={sandboxes}
                  onChange={e => setSandboxes(e.target.value)}
                />
              </FormControl>
            </FormField>
            <FormField>
              <FormLabel htmlFor="plan-vcpu">{t('plans.field.vcpu')}</FormLabel>
              <FormControl>
                <Input
                  id="plan-vcpu" type="number" min={1} mono
                  value={vcpu}
                  onChange={e => setVcpu(e.target.value)}
                />
              </FormControl>
            </FormField>
            <FormField>
              <FormLabel htmlFor="plan-mem">{t('plans.field.mem')}</FormLabel>
              <FormControl>
                <Input
                  id="plan-mem" type="number" min={1} mono
                  value={mem}
                  onChange={e => setMem(e.target.value)}
                />
              </FormControl>
            </FormField>
            <FormField>
              <FormLabel htmlFor="plan-disk">{t('plans.field.disk')}</FormLabel>
              <FormControl>
                <Input
                  id="plan-disk" type="number" min={1} mono
                  value={disk}
                  onChange={e => setDisk(e.target.value)}
                />
              </FormControl>
            </FormField>
          </FormSection>

          {/* 启用开关（用 checkbox 模拟，风格参照其他表单） */}
          <FormSection
            icon={<TlnIcon name="check" size={14} />}
            title={t('plans.colStatus')}
          >
            <FormField>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  id="plan-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  style={{ accentColor: 'var(--acc)', width: 14, height: 14 }}
                />
                <FormLabel htmlFor="plan-active" style={{ cursor: 'pointer' }}>
                  {t('plans.field.active')}
                </FormLabel>
              </div>
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
              onClick={handleSubmit}
            >
              <TlnIcon name="check" size={14} />
              {isEdit ? t('plans.edit.submit') : t('plans.create.submit')}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
