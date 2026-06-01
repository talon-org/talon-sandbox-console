/* PageSystemConfig — 超管平台配置中心(Spec 52)。仅 tenant_id === __admin 可见。
 *
 * 管的是「业务策略」配置:邮件 provider/key/from、per-租户限流、自动驾驶开关、
 * 计费 Stripe。后端 DB 优先 env 兜底,改完即时热生效(无需重启)。
 *
 * 交互:页面载入读后端脱敏快照填表;本地编辑;「保存」只提交「被改过」的项
 * (PUT /v1/admin/settings)。secret 项展示脱敏摘要、输入框留空=不改,填了=覆盖。
 */
import { useMemo, useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Label, Switch, Badge, PageHeader, toast,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useSystemConfig, useUpdateSystemConfig } from '../hooks/useSystemConfig';
import type { PlatformSettingItem, PlatformSettingChange } from '../api/types';

import './PageSystemConfig.css';

// 配置 key 常量,与后端 internal/settings 对齐。
const K = {
  emailProvider: 'email.provider',
  emailFrom: 'email.from',
  emailReturnPath: 'email.return_path',
  emailApiKey: 'email.api_key',
  emailApiBase: 'email.api_base',
  rlRps: 'ratelimit.rps',
  rlBurst: 'ratelimit.burst',
  pilotAutopilot: 'pilot.autopilot',
  pilotLifecycle: 'pilot.lifecycle',
  pilotMetering: 'pilot.metering',
  stripeSecret: 'billing.stripe_secret_key',
  stripeWebhook: 'billing.stripe_webhook_secret',
  stripePrices: 'billing.stripe_prices',
} as const;

export function PageSystemConfig() {
  const t = useT();
  const { data, isLoading, isError } = useSystemConfig();
  const update = useUpdateSystemConfig();

  // byKey:后端快照按 key 索引,用于取 masked/value/source/set。
  const byKey = useMemo(() => {
    const m: Record<string, PlatformSettingItem> = {};
    (data?.settings ?? []).forEach((it) => { m[it.key] = it; });
    return m;
  }, [data]);

  // draft:本地编辑态。仅记录「用户动过」的 key → 值。未动的 key 不在其中,保存时不提交。
  const [draft, setDraft] = useState<Record<string, string>>({});
  const dirty = Object.keys(draft).length > 0;

  const setField = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // 非 secret 项的当前展示值:本地改过用 draft,否则用后端 value。
  const valueOf = (key: string): string =>
    key in draft ? draft[key] : (byKey[key]?.value ?? '');

  // 开关项当前布尔值(后端 value 为 "true"/"false")。
  const boolOf = (key: string): boolean => valueOf(key) === 'true';

  const handleSave = () => {
    const changes: PlatformSettingChange[] = Object.entries(draft).map(
      ([key, value]) => ({ key, value }),
    );
    if (changes.length === 0) return;
    update.mutate(
      { settings: changes },
      {
        onSuccess: () => {
          toast.success(t('sysconf.saved'));
          setDraft({});
        },
        onError: (e) => toast.error((e as Error)?.message || t('common.loadFailed')),
      },
    );
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title={t('sysconf.title')} desc={t('sysconf.desc')} />
        <div className="page-body"><div className="syscfg-loading">{t('common.loading')}</div></div>
      </>
    );
  }
  if (isError) {
    return (
      <>
        <PageHeader title={t('sysconf.title')} desc={t('sysconf.desc')} />
        <div className="page-body"><div className="syscfg-loading">{t('common.loadFailed')}</div></div>
      </>
    );
  }

  const emailProvider = valueOf(K.emailProvider);

  return (
    <>
      <PageHeader
        title={t('sysconf.title')}
        desc={t('sysconf.desc')}
        actions={
          <Button variant="primary" disabled={!dirty || update.isPending} onClick={handleSave}>
            <TlnIcon name="check" size={14} />
            {update.isPending ? t('common.saving') : t('sysconf.save')}
          </Button>
        }
      />

      <div className="page-body">
      {/* 邮件服务 */}
      <Card className="syscfg-card">
        <CardHeader>
          <CardTitle>{t('sysconf.email.title')}</CardTitle>
        </CardHeader>
        <CardContent className="syscfg-grid">
          <Field label={t('sysconf.email.provider')} hint={t('sysconf.email.providerHint')} source={byKey[K.emailProvider]?.source}>
            <Select value={emailProvider || 'unset'} onValueChange={(v) => setField(K.emailProvider, v === 'unset' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">{t('sysconf.email.providerNone')}</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="sparkpost">SparkPost</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('sysconf.email.from')} hint={t('sysconf.email.fromHint')} source={byKey[K.emailFrom]?.source}>
            <Input value={valueOf(K.emailFrom)} placeholder="no-reply@mail.example.com"
              onChange={(e) => setField(K.emailFrom, e.target.value)} />
          </Field>
          <SecretField label={t('sysconf.email.apiKey')} item={byKey[K.emailApiKey]}
            draftVal={draft[K.emailApiKey]} onChange={(v) => setField(K.emailApiKey, v)} t={t} />
          {emailProvider === 'sparkpost' && (
            <Field label={t('sysconf.email.returnPath')} hint={t('sysconf.email.returnPathHint')} source={byKey[K.emailReturnPath]?.source}>
              <Input value={valueOf(K.emailReturnPath)} placeholder="bounces@mail.example.com"
                onChange={(e) => setField(K.emailReturnPath, e.target.value)} />
            </Field>
          )}
        </CardContent>
      </Card>

      {/* 限流 */}
      <Card className="syscfg-card">
        <CardHeader>
          <CardTitle>{t('sysconf.rl.title')}</CardTitle>
        </CardHeader>
        <CardContent className="syscfg-grid">
          <Field label={t('sysconf.rl.rps')} hint={t('sysconf.rl.rpsHint')} source={byKey[K.rlRps]?.source}>
            <Input type="number" min="0" value={valueOf(K.rlRps)} placeholder="0"
              onChange={(e) => setField(K.rlRps, e.target.value)} />
          </Field>
          <Field label={t('sysconf.rl.burst')} hint={t('sysconf.rl.burstHint')} source={byKey[K.rlBurst]?.source}>
            <Input type="number" min="0" value={valueOf(K.rlBurst)} placeholder="0"
              onChange={(e) => setField(K.rlBurst, e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* 自动驾驶 */}
      <Card className="syscfg-card">
        <CardHeader>
          <CardTitle>{t('sysconf.pilot.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleRow label={t('sysconf.pilot.autopilot')} hint={t('sysconf.pilot.autopilotHint')}
            checked={boolOf(K.pilotAutopilot)} onChange={(v) => setField(K.pilotAutopilot, v ? 'true' : 'false')} />
          <ToggleRow label={t('sysconf.pilot.lifecycle')} hint={t('sysconf.pilot.lifecycleHint')}
            checked={boolOf(K.pilotLifecycle)} onChange={(v) => setField(K.pilotLifecycle, v ? 'true' : 'false')} />
          <ToggleRow label={t('sysconf.pilot.metering')} hint={t('sysconf.pilot.meteringHint')}
            checked={boolOf(K.pilotMetering)} onChange={(v) => setField(K.pilotMetering, v ? 'true' : 'false')} />
        </CardContent>
      </Card>

      {/* 计费 */}
      <Card className="syscfg-card">
        <CardHeader>
          <CardTitle>{t('sysconf.billing.title')}</CardTitle>
        </CardHeader>
        <CardContent className="syscfg-grid">
          <SecretField label={t('sysconf.billing.secretKey')} item={byKey[K.stripeSecret]}
            draftVal={draft[K.stripeSecret]} onChange={(v) => setField(K.stripeSecret, v)} t={t} />
          <SecretField label={t('sysconf.billing.webhookSecret')} item={byKey[K.stripeWebhook]}
            draftVal={draft[K.stripeWebhook]} onChange={(v) => setField(K.stripeWebhook, v)} t={t} />
          <Field label={t('sysconf.billing.prices')} hint={t('sysconf.billing.pricesHint')} source={byKey[K.stripePrices]?.source} wide>
            <Input value={valueOf(K.stripePrices)} placeholder={'{"team":"price_xxx","pro":"price_yyy"}'}
              onChange={(e) => setField(K.stripePrices, e.target.value)} />
          </Field>
        </CardContent>
      </Card>
      </div>
    </>
  );
}

// Field — 一个普通配置项行:label + hint + 来源徽标 + 输入控件(children)。
function Field({ label, hint, source, wide, children }: {
  label: string; hint?: string; source?: string; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={'syscfg-field' + (wide ? ' syscfg-field-wide' : '')}>
      <div className="syscfg-field-head">
        <Label>{label}</Label>
        <SourceBadge source={source} />
      </div>
      {children}
      {hint && <p className="syscfg-hint">{hint}</p>}
    </div>
  );
}

// SecretField — secret 配置项:展示脱敏摘要,输入框留空=不改,填了=覆盖。
function SecretField({ label, item, draftVal, onChange, t }: {
  label: string; item?: PlatformSettingItem; draftVal?: string;
  onChange: (v: string) => void; t: (k: string) => string;
}) {
  const configured = item?.set;
  const placeholder = configured
    ? `${item?.masked ?? '····'} — ${t('sysconf.secret.keepHint')}`
    : t('sysconf.secret.unsetHint');
  return (
    <div className="syscfg-field">
      <div className="syscfg-field-head">
        <Label>{label}</Label>
        {configured
          ? <Badge variant="success">{t('sysconf.secret.configured')}</Badge>
          : <Badge variant="muted">{t('sysconf.secret.unset')}</Badge>}
      </div>
      <Input type="password" value={draftVal ?? ''} placeholder={placeholder}
        autoComplete="new-password" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ToggleRow — 开关项一行。
function ToggleRow({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="syscfg-toggle-row">
      <div className="syscfg-toggle-text">
        <Label>{label}</Label>
        {hint && <p className="syscfg-hint">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// SourceBadge — 标记该项当前有效值来自 DB(已在控制台设置)还是 env(部署兜底)。
function SourceBadge({ source }: { source?: string }) {
  if (source === 'db') return <Badge variant="info">DB</Badge>;
  if (source === 'env') return <Badge variant="muted">env</Badge>;
  return null;
}
