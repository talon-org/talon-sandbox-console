/* PageBilling — 租户侧计费页（owner 可升降级，viewer/developer 只读）。
 *
 * 设计:SaaS 定价页观感。
 *   - Hero 调资卡:当前套餐 + 状态 + 续费日 + 四维用量进度条(用量 vs 套餐上限)。
 *   - 套餐网格:按价格升序(Free→…→Enterprise),推荐档高亮 ribbon,当前档强调,
 *     配额带图标成卖点,升/降级语义化(按价格 vs 当前档)。
 * 数据:useSubscription / useDashboard(quota_24h 做进度条) / useAvailablePlans / useUpgradePlan。
 * 权限:升降级仅 owner(canManageBilling),后端 upgrade-plan 走 chainOwner。
 */
import { useState } from 'react';
import { Button, PageHeader, Badge, ProgressBar, toast } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useRole, canManageBilling } from '../lib/permissions';
import { useSubscription, useAvailablePlans, useUpgradePlan } from '../hooks/useBilling';
import { useDashboard } from '../hooks/useDashboard';
import { EmptyState } from '../components';
import type { PublicPlanDTO, QuotaUsage } from '../api/types';

import './PageBilling.css';

/** 分 → 货币展示，如 4900/usd → "$49"。免费(0)返回 null（由调用方渲染「免费」）。 */
function fmtPrice(cents: number, currency: string): { sym: string; amount: string } | null {
  if (cents === 0) return null;
  const sym = currency === 'usd' ? '$' : currency === 'eur' ? '€' : currency === 'cny' ? '¥' : '';
  const amount = (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return { sym, amount };
}

/** 用量进度条单元：已用 / 上限。limit<=0 视为不限（只显示已用 + ∞）。 */
function UsageBar({ label, q, fmt, unit, color }: {
  label: string; q: QuotaUsage; fmt: (v: number) => string; unit: string; color?: string;
}) {
  const style = color ? ({ '--tln-progress-color': color } as React.CSSProperties) : undefined;
  return (
    <div className="ub-row">
      <div className="ub-head">
        <span className="ub-label">{label}</span>
        <span className="ub-val">
          <span className="ub-used">{fmt(q.used)}</span>
          {q.limit > 0 ? <> / {fmt(q.limit)} {unit}</> : <> / ∞</>}
        </span>
      </div>
      {q.limit > 0 && <ProgressBar value={q.used} max={q.limit} style={style} />}
    </div>
  );
}

export function PageBilling() {
  const t = useT();
  const role = useRole();
  const canManage = canManageBilling(role);

  const { data: sub } = useSubscription();
  const { data: dash } = useDashboard();
  const { data: plansData, isLoading, isError, error } = useAvailablePlans();
  const upgradeMutation = useUpgradePlan();

  const [pendingCode, setPendingCode] = useState<string | null>(null);

  // 按价格升序：Free → Starter → Team → Enterprise。
  const plans = [...(plansData?.plans ?? [])].sort((a, b) => a.price_cents - b.price_cents);
  const currentCode = sub?.plan_code ?? '';
  const status = sub?.status ?? 'none';
  const currentPlan = plans.find((p) => p.code === currentCode);
  const currentPrice = currentPlan?.price_cents ?? 0;
  // 推荐档：价格最高档之外的「次高」常作主推；这里取价格 > 0 的最低档(入门付费档)为推荐。
  const recommendedCode = plans.find((p) => p.price_cents > 0)?.code ?? '';

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

  const q = dash?.quota_24h;

  return (
    <>
      <PageHeader title={t('billing.title')} desc={t('billing.desc')} />

      <div className="page-body billing-body">
        {/* ── Hero 调资卡:当前套餐 + 用量进度 ── */}
        <div className="billing-hero">
          <div className="bh-left">
            <span className="bh-eyebrow">{t('billing.currentPlan')}</span>
            <div className="bh-plan-row">
              <span className="bh-plan">{currentPlan?.name ?? currentCode ?? t('billing.free')}</span>
              <Badge variant={statusVariant}>{t(`billing.status.${status}`)}</Badge>
            </div>
            {currentPlan && (
              <div className="bh-price">
                {(() => {
                  const fp = fmtPrice(currentPlan.price_cents, currentPlan.currency);
                  return fp
                    ? <><span className="bh-amount">{fp.sym}{fp.amount}</span><span className="bh-int">{intervalLabel(currentPlan.billing_interval)}</span></>
                    : <span className="bh-amount">{t('billing.free')}</span>;
                })()}
              </div>
            )}
            {sub && sub.current_period_end > 0 && (
              <div className="bh-renews">
                {t('billing.renewsOn')} · {new Date(sub.current_period_end * 1000).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="bh-right">
            <span className="bh-usage-title">{t('billing.usageTitle')}</span>
            {q ? (
              <div className="bh-bars">
                <UsageBar label={t('billing.usage.vcpu')} q={q.vcpu}
                  fmt={(v) => v.toFixed(1)} unit="vCPU" />
                <UsageBar label={t('billing.usage.mem')} q={q.memory_gib}
                  fmt={(v) => v.toFixed(1)} unit="GB" color="var(--info)" />
                <UsageBar label={t('billing.usage.secretsReads')} q={q.secrets_reads}
                  fmt={(v) => String(Math.round(v))} unit="" color="var(--teal, #56cbb8)" />
                <UsageBar label={t('billing.usage.failures')} q={q.failures}
                  fmt={(v) => String(Math.round(v))} unit="" color="var(--err, #e5484d)" />
              </div>
            ) : (
              <span className="bh-usage-empty">{t('common.loading')}</span>
            )}
          </div>
        </div>

        {/* ── 套餐网格 ── */}
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError && <EmptyState variant="error" error={error} />}
        {!isLoading && !isError && (
          <div className="billing-plans">
            {plans.map((p) => {
              const isCurrent = p.code === currentCode;
              const isRecommended = p.code === recommendedCode && !isCurrent;
              const busy = upgradeMutation.isPending && pendingCode === p.code;
              const fp = fmtPrice(p.price_cents, p.currency);
              // 升/降级语义：相对当前档价格。
              const direction = p.price_cents > currentPrice ? 'up'
                : p.price_cents < currentPrice ? 'down' : 'same';
              const ctaLabel = direction === 'down' ? t('billing.downgrade')
                : p.price_cents === 0 ? t('billing.switchPlan')
                : t('billing.choosePlan');
              return (
                <div
                  key={p.code}
                  className={`plan-card${isCurrent ? ' current' : ''}${isRecommended ? ' recommended' : ''}`}
                >
                  {isRecommended && <div className="pc-ribbon">{t('billing.recommended')}</div>}
                  <div className="pc-head">
                    <span className="pc-name">{p.name}</span>
                    {isCurrent && <Badge variant="success">{t('billing.current')}</Badge>}
                  </div>
                  <div className="pc-price">
                    {fp
                      ? <><span className="pc-amount">{fp.sym}{fp.amount}</span><span className="pc-interval">{intervalLabel(p.billing_interval)}</span></>
                      : <span className="pc-amount">{t('billing.free')}</span>}
                  </div>
                  <ul className="pc-quota">
                    <li><TlnIcon name="box" size={13} /><b>{p.quota_max_sandboxes}</b> {t('billing.quota.sandboxes')}</li>
                    <li><TlnIcon name="cpu" size={13} /><b>{p.quota_vcpu}</b> {t('billing.quota.vcpu')}</li>
                    <li><TlnIcon name="memory" size={13} /><b>{p.quota_mem_gb}</b> {t('billing.quota.mem')}</li>
                    <li><TlnIcon name="folder" size={13} /><b>{p.quota_disk_gb}</b> {t('billing.quota.disk')}</li>
                  </ul>
                  <div className="pc-action">
                    {isCurrent ? (
                      <Button variant="default" disabled>{t('billing.currentBtn')}</Button>
                    ) : (
                      <Button
                        variant={isRecommended ? 'primary' : 'default'}
                        disabled={!canManage || busy}
                        loading={busy}
                        onClick={() => handleUpgrade(p)}
                        title={!canManage ? t('billing.ownerOnly') : undefined}
                      >
                        {ctaLabel}
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
