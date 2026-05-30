/* PagePlans — 超管套餐管理。仅 tenant_id === __admin 可见。
 * 数据：usePlans() / useUpsertPlan() / useSetDefaultPlan()
 * 风格对齐 PageTenants（超管页模板）。
 */
import { useState } from 'react';
import { Button, PageHeader, toast } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { usePlans, useSetDefaultPlan } from '../hooks/usePlans';
import { EmptyState } from '../components';
import { PlanDrawer } from './_plans/PlanDrawer';
import type { PlanDTO } from '../api/types';

import './PagePlans.css';

export function PagePlans() {
  const t = useT();
  const { data, isLoading, isError, error } = usePlans();
  const setDefaultMutation = useSetDefaultPlan();

  const [drawerPlan, setDrawerPlan] = useState<PlanDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const plans = data?.plans ?? [];

  /** 点「设为默认」 */
  const handleSetDefault = (code: string) => {
    setDefaultMutation.mutate(code, {
      onSuccess: () => toast.success(t('plans.setDefaultSuccess')),
      onError: () => toast.error(t('common.loadFailed')),
    });
  };

  /** 打开编辑抽屉 */
  const openEdit = (plan: PlanDTO) => {
    setDrawerPlan(plan);
    setDrawerOpen(true);
  };

  /** 打开新建抽屉 */
  const openCreate = () => {
    setDrawerPlan(null);
    setDrawerOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t('plans.title')}
        num={String(plans.length)}
        desc={t('plans.desc')}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <TlnIcon name="plus" size={14} />
            {t('plans.create.title')}
          </Button>
        }
      />

      <div className="page-body">
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError   && <EmptyState variant="error" error={error} />}

        {!isLoading && !isError && (
          <div className="tln-tbl">
            <div className="tln-tbl-head plan-row">
              <div>{t('plans.colCode')}</div>
              <div>{t('plans.colName')}</div>
              <div>{t('plans.colSandboxes')}</div>
              <div>{t('plans.colVcpu')}</div>
              <div>{t('plans.colMem')}</div>
              <div>{t('plans.colDisk')}</div>
              <div>{t('plans.colDefault')}</div>
              <div>{t('plans.colStatus')}</div>
              <div />
            </div>

            {plans.map(plan => (
              <div
                key={plan.code}
                className="tln-tbl-row plan-row"
                style={{ cursor: 'default' }}
              >
                {/* Code */}
                <div className="name-cell">
                  <div className="pav">{plan.code[0]?.toUpperCase() ?? '?'}</div>
                  <span className="pcode">{plan.code}</span>
                </div>

                {/* 显示名称 */}
                <div className="pname">{plan.name}</div>

                {/* 各配额项 */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {plan.quota_max_sandboxes}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {plan.quota_vcpu}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {plan.quota_mem_gb}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {plan.quota_disk_gb}
                </div>

                {/* 默认标志 */}
                <div>
                  {plan.is_default && (
                    <span className="plan-default-badge">{t('plans.isDefault')}</span>
                  )}
                </div>

                {/* 状态 */}
                <div>
                  {plan.is_active
                    ? <span className="plan-status-active">● {t('plans.active')}</span>
                    : <span className="plan-status-inactive">○ {t('plans.inactive')}</span>
                  }
                </div>

                {/* 操作 */}
                <div className="actions" style={{ display: 'flex', gap: 4 }}>
                  {!plan.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(plan.code)}
                      disabled={setDefaultMutation.isPending}
                      title={t('plans.setDefault')}
                    >
                      {t('plans.setDefault')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => openEdit(plan)}
                    title={t('plans.edit')}
                    aria-label={t('plans.edit')}
                  >
                    <TlnIcon name="edit" size={13} />
                  </Button>
                </div>
              </div>
            ))}

            {plans.length === 0 && (
              <div style={{ padding: 32 }}>
                <EmptyState
                  icon={<TlnIcon name="server" size={24} />}
                  title={t('plans.empty.head')}
                  description={t('plans.empty.desc')}
                  action={
                    <Button variant="primary" onClick={openCreate}>
                      <TlnIcon name="plus" size={14} />
                      {t('plans.create.title')}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      <PlanDrawer
        plan={drawerPlan}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
