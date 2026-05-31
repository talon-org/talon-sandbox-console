/* src/pages/_tenants/CreateWorkspaceDialog.tsx
 * Dialog form for creating a new workspace (tenant).
 *
 * 套餐选项来自 usePlans()（超管在套餐管理里配置的真实套餐），不再写死
 * free/team/enterprise——后端建租户已改为按 plans 表校验+取配额，新增的
 * starter 等套餐在这里可直接选用。仅展示 is_active 的套餐。
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button, Input, toast,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  FormField, FormLabel, FormControl, FormDescription,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { useCreateTenant } from '../../hooks/useTenants';
import { usePlans } from '../../hooks/usePlans';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceDialog({ open, onClose }: Props) {
  const t = useT();
  const createMutation = useCreateTenant();
  const { data: plansData } = usePlans();

  // 可选套餐 = 启用中的套餐，按默认套餐优先、其余按 code 稳定排序。
  const activePlans = useMemo(() => {
    const plans = (plansData?.plans ?? []).filter(p => p.is_active);
    return [...plans].sort((a, b) =>
      Number(b.is_default) - Number(a.is_default) || a.code.localeCompare(b.code));
  }, [plansData]);

  const [id,   setId]   = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('');

  // 套餐加载完成后，把选中项初始化为默认套餐（无默认则取第一个）。
  // 仅在当前未选或所选已不在可用列表时纠正，避免覆盖用户已做的选择。
  useEffect(() => {
    if (activePlans.length === 0) return;
    if (!plan || !activePlans.some(p => p.code === plan)) {
      const def = activePlans.find(p => p.is_default) ?? activePlans[0];
      setPlan(def.code);
    }
  }, [activePlans, plan]);

  const idValid   = /^[a-z][a-z0-9-]{1,48}$/.test(id);
  const nameValid = name.trim().length > 0;
  const planValid = plan.length > 0;
  const valid     = idValid && nameValid && planValid;
  const busy      = createMutation.isPending;

  const resetDefaultPlan = () => {
    const def = activePlans.find(p => p.is_default) ?? activePlans[0];
    setPlan(def ? def.code : '');
  };

  const handleSubmit = () => {
    if (!valid || busy) return;
    createMutation.mutate(
      { id, name: name.trim(), plan },
      {
        onSuccess: () => {
          toast.success(t('tenants.create.successToast'));
          setId('');
          setName('');
          resetDefaultPlan();
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
        <div className="dlg-form-body">
          <FormField error={id.length > 0 && !idValid ? true : undefined}>
            <FormLabel htmlFor="ws-id">{t('tenants.create.idLabel')}</FormLabel>
            <FormControl>
              <Input
                id="ws-id"
                mono
                value={id}
                onChange={e => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={t('tenants.create.idPlaceholder')}
                invalid={id.length > 0 && !idValid}
              />
            </FormControl>
            <FormDescription>{t('tenants.create.idHint')}</FormDescription>
          </FormField>
          <FormField>
            <FormLabel htmlFor="ws-name">{t('tenants.create.nameLabel')}</FormLabel>
            <FormControl>
              <Input
                id="ws-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('tenants.create.namePlaceholder')}
              />
            </FormControl>
          </FormField>
          <FormField>
            <FormLabel htmlFor="ws-plan">{t('tenants.create.planLabel')}</FormLabel>
            <FormControl>
              {/* @talon-sandbox/react 的 Select 是 Radix Root 的薄封装,只支持
                  复合子组件形态(Trigger/Value/Content/Item),没有 options 便捷 prop。
                  传 options 会让 Root 没有 Trigger 子节点而渲染不出任何东西。
                  与 InviteMemberDialog 的写法保持一致。
                  套餐项来自 usePlans()——显示套餐的 name（与套餐管理页一致）。 */}
              <Select value={plan} onValueChange={setPlan} disabled={activePlans.length === 0}>
                <SelectTrigger id="ws-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map(p => (
                    <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormField>
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
