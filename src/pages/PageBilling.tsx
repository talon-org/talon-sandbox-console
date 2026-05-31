/* PageBilling — 租户侧计费页(owner 可升降级,viewer/developer 只读)。
 *
 * 设计:价值阶梯定价页。
 *   - 顶部状态条:当前套餐 + 状态 + 价格 + 续费日,右侧紧凑「本周期用量」
 *     (只显示有上限的维度;免费版无上限则给一句说明,而非一排空进度条)。
 *   - 套餐阶梯:按价格升序的卡片(Free→Starter→Team→Enterprise),付费档背景
 *     更亮、推荐档抬升带 ribbon、当前档绿描边;每张卡片用 tagline 讲定位、
 *     配额用 ✓ 列成「包含的能力」,价格 count-up。升/降级语义按价格相对当前档。
 * 数据:useSubscription / useDashboard(quota_24h)/ useAvailablePlans / useUpgradePlan。
 * 权限:升降级仅 owner(canManageBilling),后端 upgrade-plan 走 chainOwner。
 */
import { useEffect, useState } from 'react';
import { Button, PageHeader, Badge, ProgressBar, toast } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useRole, canManageBilling } from '../lib/permissions';
import { useSubscription, useAvailablePlans, useUpgradePlan } from '../hooks/useBilling';
import { useDashboard } from '../hooks/useDashboard';
import { EmptyState } from '../components';
import type { PublicPlanDTO, QuotaUsage } from '../api/types';

import './PageBilling.css';

/** 分 → {符号, 金额}。免费(0)返回 null,由调用方渲染「免费」。 */
function fmtPrice(cents: number, currency: string): { sym: string; amount: string } | null {
  if (cents <= 0) return null;
  const sym = currency === 'usd' ? '$' : currency === 'eur' ? '€' : currency === 'cny' ? '¥' : '$';
  const amount = (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return { sym, amount };
}

/** 套餐档位字形:免费→付费由轻到重,建立视觉阶梯感。 */
function planGlyph(code: string): 'box' | 'zap' | 'users' | 'shield' {
  if (code === 'enterprise') return 'shield';
  if (code === 'team') return 'users';
  if (code === 'starter') return 'zap';
  return 'box';
}

/** count-up:数字从 0 缓动到目标,与 Dashboard 指标卡一致的质感。 */
function useCount(target: number, duration = 600): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/** 顶部状态条里的单个用量单元:已用 / 上限 + 进度条。仅在 limit>0 时渲染。 */
function UsageCell({ label, q, fmt, unit, color }: {
  label: string; q: QuotaUsage; fmt: (v: number) => string; unit: string; color?: string;
}) {
  const style = color ? ({ '--pb-color': color } as React.CSSProperties) : undefined;
  return (
    <div className="usage-cell">
      <div className="uc-head">
        <span className="uc-label">{label}</span>
        <span className="uc-val">
          <span className="uc-used">{fmt(q.used)}</span> / {fmt(q.limit)}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <ProgressBar value={q.used} max={q.limit || 1} style={style} />
    </div>
  );
}

/** 价格大数字 + count-up。免费档不参与 count-up,直接显示「免费」。 */
function PriceTag({ cents, currency, intervalLabel }: { cents: number; currency: string; intervalLabel: string }) {
  const fp = fmtPrice(cents, currency);
  const animated = useCount(fp ? cents / 100 : 0);
  const t = useT();
  if (!fp) return <div className="pc-price"><span className="pc-amount">{t('billing.free')}</span></div>;
  const display = Math.round(animated).toLocaleString();
  return (
    <div className="pc-price">
      <span className="pc-sym">{fp.sym}</span>
      <span className="pc-amount">{display}</span>
      <span className="pc-interval">{intervalLabel}</span>
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

  // 按价格升序:Free → Starter → Team → Enterprise。
  const plans = [...(plansData?.plans ?? [])].sort((a, b) => a.price_cents - b.price_cents);
  // 注意:plan_code 可能是空串(无订阅),用 || 而非 ?? 才能正确回退。
  const currentCode = sub?.plan_code || '';
  const status = sub?.status ?? 'none';
  const currentPlan = plans.find((p) => p.code === currentCode);
  const currentPrice = currentPlan?.price_cents ?? 0;
  // 推荐档:第二档付费(Team)——既不是最便宜也不是最贵,转化主力档。
  const paidPlans = plans.filter((p) => p.price_cents > 0);
  const recommendedCode = (paidPlans[1] ?? paidPlans[0])?.code ?? '';

  const intervalLabel = (iv: string) =>
    iv === 'month' ? t('billing.perMonth') : iv === 'year' ? t('billing.perYear') : '';

  const taglineFor = (code: string) => {
    const key = `billing.tagline.${code}`;
    const s = t(key);
    return s === key ? t('billing.tagline.generic') : s;
  };

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

  // Badge variant 必须用 ui-lib 真实支持的值(ok/warn/magenta/muted),不是 success/warning。
  const statusVariant = status === 'active' ? 'ok'
    : status === 'past_due' ? 'warn'
    : status === 'canceled' ? 'magenta'
    : 'muted';

  const q = dash?.quota_24h;
  // 顶部用量条只展示「有上限」的维度;免费版通常无上限 → 给一句说明而非空条。
  const usageCells = q
    ? [
        { key: 'vcpu', label: t('billing.usage.vcpu'), q: q.vcpu, fmt: (v: number) => v.toFixed(1), unit: 'vCPU', color: undefined },
        { key: 'mem', label: t('billing.usage.mem'), q: q.memory_gib, fmt: (v: number) => v.toFixed(1), unit: 'GB', color: 'var(--info)' },
        { key: 'secrets', label: t('billing.usage.secretsReads'), q: q.secrets_reads, fmt: (v: number) => String(Math.round(v)), unit: '', color: 'var(--magenta)' },
        { key: 'fail', label: t('billing.usage.failures'), q: q.failures, fmt: (v: number) => String(Math.round(v)), unit: '', color: 'var(--err)' },
      ].filter((c) => c.q && c.q.limit > 0)
    : [];

  const curFp = currentPlan ? fmtPrice(currentPlan.price_cents, currentPlan.currency) : null;

  return (
    <>
      <PageHeader title={t('billing.title')} desc={t('billing.desc')} />

      <div className="page-body billing-body">
        {/* ── 当前套餐状态条 ── */}
        <div className="bill-status">
          <div className="bs-id">
            <div className="bs-glyph"><TlnIcon name={planGlyph(currentCode)} size={18} /></div>
            <div className="bs-meta">
              <span className="bs-eyebrow">{t('billing.currentPlan')}</span>
              <div className="bs-name-row">
                <span className="bs-name">{currentPlan?.name || t('billing.free')}</span>
                <Badge variant={statusVariant}>{t(`billing.status.${status}`)}</Badge>
              </div>
              <span className="bs-price">
                {curFp
                  ? `${curFp.sym}${curFp.amount}${intervalLabel(currentPlan!.billing_interval)}`
                  : t('billing.free')}
                {sub && sub.current_period_end > 0
                  ? ` · ${t('billing.renewsOn')} ${new Date(sub.current_period_end * 1000).toLocaleDateString()}`
                  : ` · ${t('billing.forever')}`}
              </span>
            </div>
          </div>

          {usageCells.length > 0 ? (
            <div className="bs-usage">
              {usageCells.map((c) => (
                <UsageCell key={c.key} label={c.label} q={c.q} fmt={c.fmt} unit={c.unit} color={c.color} />
              ))}
            </div>
          ) : (
            <span className="bs-usage-empty">{t('billing.usageEmpty')}</span>
          )}
        </div>

        {/* ── 套餐阶梯 ── */}
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError && <EmptyState variant="error" error={error} />}
        {!isLoading && !isError && (
          <div className="billing-plans">
            {plans.map((p) => {
              const isCurrent = p.code === currentCode;
              const isRecommended = p.code === recommendedCode && !isCurrent;
              const isPaid = p.price_cents > 0;
              const busy = upgradeMutation.isPending && pendingCode === p.code;
              const direction = p.price_cents > currentPrice ? 'up'
                : p.price_cents < currentPrice ? 'down' : 'same';
              const ctaLabel = direction === 'down' ? t('billing.downgrade')
                : isPaid ? t('billing.choosePlan')
                : t('billing.switchPlan');
              const cls = `plan-card${isPaid ? ' paid' : ''}${isCurrent ? ' current' : ''}${isRecommended ? ' recommended' : ''}`;
              return (
                <div key={p.code} className={cls}>
                  {isRecommended && <div className="pc-ribbon">{t('billing.recommended')}</div>}

                  <div className="pc-top">
                    <div className="pc-head">
                      <div className="pc-id">
                        <span className="pc-glyph"><TlnIcon name={planGlyph(p.code)} size={16} /></span>
                        <span className="pc-name">{p.name}</span>
                      </div>
                      {isCurrent && <Badge variant="ok">{t('billing.current')}</Badge>}
                    </div>
                    <PriceTag cents={p.price_cents} currency={p.currency} intervalLabel={intervalLabel(p.billing_interval)} />
                    <p className="pc-tagline">{taglineFor(p.code)}</p>
                  </div>

                  <div className="pc-divider" />

                  <ul className="pc-quota">
                    <li><span className="qcheck"><TlnIcon name="check" size={14} /></span><b>{p.quota_max_sandboxes}</b> {t('billing.quota.sandboxes')}</li>
                    <li><span className="qcheck"><TlnIcon name="check" size={14} /></span><b>{p.quota_vcpu}</b> {t('billing.quota.vcpu')}</li>
                    <li><span className="qcheck"><TlnIcon name="check" size={14} /></span><b>{p.quota_mem_gb}</b> {t('billing.quota.mem')}</li>
                    <li><span className="qcheck"><TlnIcon name="check" size={14} /></span><b>{p.quota_disk_gb}</b> {t('billing.quota.disk')}</li>
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
