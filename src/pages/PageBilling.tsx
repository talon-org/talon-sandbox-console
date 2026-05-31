/* PageBilling — 租户侧计费页（owner 可升降级，viewer/developer 只读）。
 * 数据：useSubscription() 当前订阅 / useUsage() 周期用量 / useAvailablePlans() 可选套餐。
 * 升级：useUpgradePlan() —— 免费档 applied=true 立即生效（toast + 刷新订阅）；
 *       付费档返回 checkout_url，跳转支付（成功后由后端 webhook 落 tenant.plan）。
 * 权限：升/降级按钮仅 owner 可点（canManageBilling），后端 upgrade-plan 走 chainOwner。
 */
import { useState } from 'react';
import { Button, PageHeader, Badge, toast } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useRole, canManageBilling } from '../lib/permissions';
import { useSubscription, useUsage, useAvailablePlans, useUpgradePlan } from '../hooks/useBilling';
import { EmptyState } from '../components';
import type { PublicPlanDTO } from '../api/types';

import './PageBilling.css';

/** 分 → 货币展示，如 4900/usd → "$49"。免费(0)返回本地化「免费」。 */
function fmtPrice(cents: number, currency: string, t: (k: string) => string): string {
  if (cents === 0) return t('billing.free');
  const sym = currency === 'usd' ? '$' : currency === 'eur' ? '€' : currency === 'cny' ? '¥' : '';
  const amount = (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return sym ? `${sym}${amount}` : `${amount} ${currency.toUpperCase()}`;
}

/** 资源·秒 → 资源·小时（用量展示更直观）。 */
function toHours(seconds: number): string {
  return (seconds / 3600).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function PageBilling() {
  const t = useT();
  const role = useRole();
  const canManage = canManageBilling(role);

  const { data: sub } = useSubscription();
  const { data: usage } = useUsage();
  const { data: plansData, isLoading, isError, error } = useAvailablePlans();
  const upgradeMutation = useUpgradePlan();

  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const plans = plansData?.plans ?? [];
  const currentCode = sub?.plan_code ?? '';
  const status = sub?.status ?? 'none';

  const intervalLabel = (iv: string) =>
    iv === 'month' ? t('billing.perMonth') : iv === 'year' ? t('billing.perYear') : '';

  const handleUpgrade = (plan: PublicPlanDTO) => {
    if (!canManage || upgradeMutation.isPending) return;
    setPendingCode(plan.code);
    upgradeMutation.mutate(
      { plan_code: plan.code },
      {
        onSuccess: (res) => {
          if (res.applied) {
            toast.success(t('billing.switchedTo').replace('{plan}', plan.name));
          } else if (res.checkout_url) {
            // 付费档：跳转支付商结账页（成功后 webhook 落 plan）。
            window.location.href = res.checkout_url;
          }
        },
        onError: () => toast.error(t('billing.upgradeFailed')),
        onSettled: () => setPendingCode(null),
      },
    );
  };

  const statusVariant = status === 'active' ? 'success'
    : status === 'past_due' ? 'warning'
    : status === 'canceled' ? 'magenta'
    : 'muted';

  return (
    <>
      <PageHeader title={t('billing.title')} desc={t('billing.desc')} />

      <div className="page-body billing-body">
        {/* 当前订阅概览 */}
        <div className="billing-current">
          <div className="bc-row">
            <span className="bc-label">{t('billing.currentPlan')}</span>
            <span className="bc-plan">{currentCode || t('billing.free')}</span>
            <Badge variant={statusVariant}>{t(`billing.status.${status}`)}</Badge>
          </div>
          {sub && sub.current_period_end > 0 && (
            <div className="bc-row bc-sub">
              <span className="bc-label">{t('billing.renewsOn')}</span>
              <span className="bc-mono">
                {new Date(sub.current_period_end * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* 周期用量合计 */}
        {usage && (
          <div className="billing-usage">
            <div className="bu-head">{t('billing.usageTitle')}</div>
            <div className="bu-grid">
              <div className="bu-cell">
                <span className="bu-num">{toHours(usage.total.cpu_milli_seconds / 1000)}</span>
                <span className="bu-unit">{t('billing.usage.vcpuHours')}</span>
              </div>
              <div className="bu-cell">
                <span className="bu-num">{toHours(usage.total.memory_byte_seconds / (1024 ** 3))}</span>
                <span className="bu-unit">{t('billing.usage.memGbHours')}</span>
              </div>
              <div className="bu-cell">
                <span className="bu-num">{toHours(usage.total.sandbox_seconds)}</span>
                <span className="bu-unit">{t('billing.usage.sandboxHours')}</span>
              </div>
              <div className="bu-cell">
                <span className="bu-num">{usage.total.request_count.toLocaleString()}</span>
                <span className="bu-unit">{t('billing.usage.requests')}</span>
              </div>
            </div>
          </div>
        )}

        {/* 可选套餐 */}
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError && <EmptyState variant="error" error={error} />}
        {!isLoading && !isError && (
          <div className="billing-plans">
            {plans.map((p) => {
              const isCurrent = p.code === currentCode;
              const busy = upgradeMutation.isPending && pendingCode === p.code;
              return (
                <div key={p.code} className={`plan-card${isCurrent ? ' current' : ''}`}>
                  <div className="pc-head">
                    <span className="pc-name">{p.name}</span>
                    {isCurrent && <Badge variant="success">{t('billing.current')}</Badge>}
                  </div>
                  <div className="pc-price">
                    <span className="pc-amount">{fmtPrice(p.price_cents, p.currency, t)}</span>
                    {p.price_cents > 0 && <span className="pc-interval">{intervalLabel(p.billing_interval)}</span>}
                  </div>
                  <ul className="pc-quota">
                    <li>{p.quota_max_sandboxes} {t('billing.quota.sandboxes')}</li>
                    <li>{p.quota_vcpu} {t('billing.quota.vcpu')}</li>
                    <li>{p.quota_mem_gb} {t('billing.quota.mem')}</li>
                    <li>{p.quota_disk_gb} {t('billing.quota.disk')}</li>
                  </ul>
                  <div className="pc-action">
                    {isCurrent ? (
                      <Button variant="default" disabled>{t('billing.current')}</Button>
                    ) : (
                      <Button
                        variant="primary"
                        disabled={!canManage || busy}
                        loading={busy}
                        onClick={() => handleUpgrade(p)}
                        title={!canManage ? t('billing.ownerOnly') : undefined}
                      >
                        {p.price_cents === 0 ? t('billing.switchPlan') : t('billing.choosePlan')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!canManage && (
          <div className="billing-note">
            <TlnIcon name="info" size={13} />
            {t('billing.ownerOnly')}
          </div>
        )}
      </div>
    </>
  );
}
