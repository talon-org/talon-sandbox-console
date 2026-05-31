/* PageBilling — 套餐与计费。1:1 移植自 Claude Design 原型(page-billing.jsx)。
 *
 * 设计:Pricing 网格 + 当前套餐用量条 + 月付/年付切换 + 切换确认对话框。
 *   全部 Talon tokens:近黑面、mono 数字、accent 仅用在「最受欢迎」(Team)和高亮上。
 * 数据:接真实后端(原型用 mock),保留原型全部交互与视觉:
 *   - useAvailablePlans:套餐(价格/配额),按价格升序;Team 标「最受欢迎」。
 *   - useSubscription:当前套餐 + 状态。
 *   - useDashboard().quota_24h + summary:当前用量(分子);分母随所选套餐配额。
 *   - useUpgradePlan:确认对话框里真实切换(免费档立即生效,付费档走 checkout/501)。
 * 年付 −20%:展示层换算(后端目前按月计价,年付为显示概念);切换仍按 plan_code。
 * 权限:仅 owner 可变更(canManageBilling);非 owner CTA 禁用并提示。
 */
import { useState } from 'react';
import {
  PageHeader, Badge, Button, ProgressBar, KV, toast,
  SegmentedGroup, SegmentedItem,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useRole, canManageBilling } from '../lib/permissions';
import { useSubscription, useAvailablePlans, useUpgradePlan } from '../hooks/useBilling';
import { useDashboard } from '../hooks/useDashboard';
import { EmptyState } from '../components';
import type { PublicPlanDTO } from '../api/types';

import './PageBilling.css';

const ANNUAL_DISCOUNT = 0.2; // 年付 −20%(展示层换算)

/** 数字千分位;null/undefined 视为无上限 → ∞。 */
function billFmt(n: number | null | undefined): string {
  if (n == null) return '∞';
  return n.toLocaleString('en-US');
}

/** 套餐档位字形:免费→付费由轻到重。 */
function planIcon(code: string): 'box' | 'zap' | 'users' | 'shield' {
  if (code === 'enterprise') return 'shield';
  if (code === 'team') return 'users';
  if (code === 'starter') return 'zap';
  return 'box';
}

export function PageBilling() {
  const t = useT();
  const role = useRole();
  const canManage = canManageBilling(role);

  const { data: sub } = useSubscription();
  const { data: dash } = useDashboard();
  const { data: plansData, isLoading, isError, error } = useAvailablePlans();
  const upgradeMutation = useUpgradePlan();

  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [confirm, setConfirm] = useState<PublicPlanDTO | null>(null);

  const annual = period === 'annual';
  // 按价格升序:Free → Starter → Team → Enterprise。
  const plans = [...(plansData?.plans ?? [])].sort((a, b) => a.price_cents - b.price_cents);
  const currentCode = sub?.plan_code || (plans[0]?.code ?? '');
  const curIdx = Math.max(0, plans.findIndex((p) => p.code === currentCode));
  const cur = plans[curIdx] ?? plans[0];
  // 推荐档 = 第二档付费(Team):accent 只给它。
  const paid = plans.filter((p) => p.price_cents > 0);
  const popularCode = (paid[1] ?? paid[0])?.code ?? '';

  // 价格换算(分→元;年付按月折算)。
  const dollars = (cents: number) => Math.round(cents / 100);
  const monthlyOf = (p: PublicPlanDTO) =>
    annual ? Math.round(dollars(p.price_cents) * (1 - ANNUAL_DISCOUNT)) : dollars(p.price_cents);

  // 当前套餐结算行。
  const curMonthly = cur ? monthlyOf(cur) : 0;
  let subLine: string;
  if (!cur || cur.price_cents === 0) {
    subLine = t('billing.freeForever');
  } else if (annual) {
    subLine = `$${(curMonthly * 12).toLocaleString('en-US')} ${t('billing.perYearBilled')}`;
  } else {
    subLine = `$${curMonthly} ${t('billing.perMonthBilled')}`;
  }

  // 用量表(分子取真实用量,分母随当前套餐配额)。
  // 真实后端配额里这三维只有「并发沙箱(max_sandboxes)」是显式上限;
  // Secret 读取 / 失败数 plans 表无对应上限 → 分母 ∞,只显已用(原型已支持 ∞)。
  const q = dash?.quota_24h;
  const activeSandboxes = dash?.summary?.active_sandboxes.current ?? 0;
  const meters = [
    { k: t('billing.usage.sandboxes'), used: Math.round(activeSandboxes), lim: cur?.quota_max_sandboxes ?? null },
    { k: t('billing.usage.secretsReads'), used: Math.round(q?.secrets_reads.used ?? 0), lim: null as number | null },
    { k: t('billing.usage.failures'), used: Math.round(q?.failures.used ?? 0), lim: null as number | null },
  ];

  const doSwitch = () => {
    const p = confirm;
    if (!p) return;
    upgradeMutation.mutate(
      { plan_code: p.code },
      {
        onSuccess: (res) => {
          setConfirm(null);
          if (res.applied) {
            toast.success(
              t('billing.switchedTo').replace('{plan}', p.name) + (annual ? ' · ' + t('billing.annual') : ' · ' + t('billing.monthly')),
            );
          } else if (res.checkout_url) {
            window.location.href = res.checkout_url;
          }
        },
        onError: () => { setConfirm(null); toast.error(t('billing.upgradeFailed')); },
      },
    );
  };

  const onCta = (p: PublicPlanDTO) => {
    if (p.code === currentCode) return;
    if (!canManage) { toast.info(t('billing.ownerOnly')); return; }
    if (p.code === 'enterprise') {
      toast.info(t('billing.enterpriseToast'));
      return;
    }
    setConfirm(p);
  };

  const statusVariant = sub?.status === 'active' ? 'ok'
    : sub?.status === 'past_due' ? 'warn'
    : sub?.status === 'canceled' ? 'magenta'
    : 'muted';
  const subscribed = !!cur && cur.price_cents > 0 && sub?.status === 'active';

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title={t('billing.title')}
        desc={t('billing.desc')}
        actions={
          <SegmentedGroup value={period} onValueChange={(v) => setPeriod(v as 'monthly' | 'annual')}>
            <SegmentedItem value="monthly">{t('billing.monthly')}</SegmentedItem>
            <SegmentedItem value="annual">{t('billing.annualOff')}</SegmentedItem>
          </SegmentedGroup>
        }
      />

      <div className="page-body">
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError && <EmptyState variant="error" error={error} />}

        {!isLoading && !isError && cur && (
          <>
            {/* 当前套餐 + 用量 */}
            <div className="bill-current">
              <div className="who">
                <div className="tile"><TlnIcon name={planIcon(cur.code)} size={20} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="eyebrow">{t('billing.currentPlan')}</div>
                  <div className="pname">
                    {cur.price_cents === 0 ? t('billing.free') : cur.name}
                    <Badge variant={cur.price_cents === 0 ? 'muted' : statusVariant}>
                      {cur.price_cents === 0 ? t('billing.freeTier') : (subscribed ? t('billing.subscribed') : t(`billing.status.${sub?.status ?? 'none'}`))}
                    </Badge>
                  </div>
                  <div className="sub">{subLine}</div>
                </div>
              </div>

              <div className="bill-meters">
                {meters.map((m) => {
                  const ratio = m.lim == null ? 0.04 : Math.min(1, m.used / m.lim);
                  const near = m.lim != null && ratio >= 0.8;
                  return (
                    <div className="bill-meter" key={m.k}>
                      <div className="mhead">
                        <span className="mk">{m.k}</span>
                        <span className="mv">
                          <span className="num">{billFmt(m.used)}</span>
                          <span className="den"> / {billFmt(m.lim)}</span>
                        </span>
                      </div>
                      <ProgressBar
                        value={ratio * 100}
                        max={100}
                        style={{ '--pb-color': near ? 'var(--warn)' : 'var(--fg-3)' } as React.CSSProperties}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 套餐网格 */}
            <div className="bill-grid">
              {plans.map((p, i) => {
                const isCur = p.code === currentCode;
                const isPopular = p.code === popularCode;
                const m = monthlyOf(p);
                const higher = i > curIdx;
                let ctaLabel: string, ctaVariant: 'ghost' | 'default' | 'primary';
                if (isCur) { ctaLabel = t('billing.currentBtn'); ctaVariant = 'ghost'; }
                else if (p.code === 'enterprise') { ctaLabel = t('billing.contactSales'); ctaVariant = 'default'; }
                else if (isPopular) { ctaLabel = t('billing.choosePlan'); ctaVariant = 'primary'; }
                else { ctaLabel = higher ? t('billing.choosePlan') : t('billing.switchPlan'); ctaVariant = 'default'; }

                let annualNote = '';
                if (p.price_cents > 0) {
                  annualNote = annual
                    ? `$${(m * 12).toLocaleString('en-US')} ${t('billing.perYearBilled')}`
                    : `${t('billing.annualPerMonth')} $${Math.round(dollars(p.price_cents) * (1 - ANNUAL_DISCOUNT))} · ${t('billing.save20')}`;
                }

                const specs = [
                  { v: p.quota_max_sandboxes, k: t('billing.quota.sandboxes') },
                  { v: p.quota_vcpu, k: t('billing.quota.vcpu') },
                  { v: p.quota_mem_gb, k: t('billing.quota.mem') },
                  { v: p.quota_disk_gb, k: t('billing.quota.disk') },
                ];

                return (
                  <div className={'plan' + (isPopular ? ' popular' : '') + (isCur ? ' current' : '')} key={p.code}>
                    {isPopular && <span className="plan-pop">{t('billing.recommended')}</span>}
                    <div className="plan-head">
                      <TlnIcon name={planIcon(p.code)} size={15} style={{ color: isPopular ? 'var(--acc-strong)' : 'var(--fg-2)' }} />
                      <span className="pn">{p.name}</span>
                      {isCur && <span className="cur">{t('billing.current')}</span>}
                    </div>

                    <div className="plan-price">
                      {p.price_cents === 0 ? (
                        <span className="amt free">{t('billing.free')}</span>
                      ) : (
                        <>
                          <span className="cur">$</span>
                          <span className="amt">{m}</span>
                          <span className="per">{t('billing.perMonth')}</span>
                        </>
                      )}
                    </div>
                    <div className="plan-annual">
                      {annual && p.price_cents > 0 ? <span className="save">{annualNote}</span> : annualNote}
                    </div>

                    <div className="plan-tag">{t(`billing.tagline.${p.code}`) === `billing.tagline.${p.code}` ? t('billing.tagline.generic') : t(`billing.tagline.${p.code}`)}</div>
                    <div className="plan-rule" />

                    <div className="plan-specs">
                      {specs.map((sp, j) => (
                        <div className="plan-spec" key={j}>
                          <TlnIcon name="check" size={13} className="ck" />
                          <span className="sv">{sp.v}</span>
                          <span className="sk">{sp.k}</span>
                        </div>
                      ))}
                    </div>

                    <div className="plan-cta">
                      {/* 原型语义:仅「当前套餐」按钮 disabled(ghost,刻意低调)。
                          非 owner 不靠 disabled 变灰(0.5 透明度看不清),而是点击时
                          由 onCta 拦截 + 后端 chainOwner 兜底 403;footnote 已说明权限。 */}
                      <Button
                        variant={ctaVariant}
                        disabled={isCur || (upgradeMutation.isPending && confirm?.code === p.code)}
                        loading={upgradeMutation.isPending && confirm?.code === p.code}
                        onClick={() => onCta(p)}
                        title={!canManage ? t('billing.ownerOnly') : undefined}
                      >
                        {ctaLabel}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bill-foot">
              <TlnIcon name="info" size={13} className="ic" />
              <span>{t('billing.ownerOnly')}</span>
            </div>
          </>
        )}
      </div>

      {/* 切换确认 */}
      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('billing.confirmTitle')}</DialogTitle>
          </DialogHeader>
          {confirm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.6 }}>
                {t('billing.confirmFrom')}{' '}
                <span className="tln-mono" style={{ color: 'var(--fg-1)' }}>{cur?.name}</span>{' '}
                {t('billing.confirmTo')}{' '}
                <span className="tln-mono" style={{ color: 'var(--fg-0)' }}>{confirm.name}</span>
                {confirm.price_cents > 0
                  ? `,${t('billing.confirmBilled').replace('{period}', annual ? t('billing.annual') : t('billing.monthly')).replace('{price}', String(monthlyOf(confirm)))}`
                  : `,${t('billing.confirmDowngrade')}`}
              </div>
              <KV rows={[
                { k: t('billing.quota.sandboxes'), v: confirm.quota_max_sandboxes + ' ' + t('billing.unit.count') },
                { k: 'vCPU', v: String(confirm.quota_vcpu) },
                { k: t('billing.quota.mem'), v: confirm.quota_mem_gb + ' GB' },
                { k: t('billing.effectiveAt'), v: t('billing.effectiveProrated'), cls: 'dim' },
              ]} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={upgradeMutation.isPending} onClick={doSwitch}>{t('billing.confirmBtn')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
