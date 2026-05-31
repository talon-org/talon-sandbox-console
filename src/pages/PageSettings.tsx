/* PageSettings — 账户设置(个人资料 + 偏好)。
 *
 * 范围(本期):
 *   - 个人资料:改全局显示名(写 users.name);邮箱/角色/加入时间只读展示。
 *   - 偏好:语言(zh/en)、外观明暗(dark/light)——写 users.prefs,跨设备同步;
 *     同时落本地 store(data-attrs + localStorage)即时生效。
 * 不含(按产品决策):改密码 UI——密码登录暂不开放,后端能力已建好,日后再放出。
 *
 * 偏好的「本地即时 + 服务端持久」双写:改下拉立刻 setTweak(本机即时变),
 * 「保存偏好」再 PATCH /v1/auth/me 落服务端;下次换设备登录由 store.applyServerPrefs 继承。
 *
 * UI 用 house 基元(Card/Input/Label/Select/Button),精修留给 claude-design。
 */
import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Button, Input, Label, Badge, toast,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@talon-sandbox/react';
import { PageHeader } from '@talon-sandbox/react';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { updateMe, getMe } from '../api/auth';
import type { LangKey, ModeKey } from '../store';

function roleLabel(role: string, t: (k: string) => string): string {
  // 复用 members 命名空间已有的角色文案;缺失时回退原值。
  const k = `members.role.${role}`;
  const s = t(k);
  return s === k ? role || 'developer' : s;
}

export function PageSettings() {
  const t = useT();
  const me = useApp((s) => s.me);
  const authToken = useApp((s) => s.authToken);
  const setAuth = useApp((s) => s.setAuth);
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.mode);
  const setTweak = useApp((s) => s.setTweak);

  // 显示名:初值用 me.name;但 me.name 在未设置时被后端回退成了 email,
  // 这里若等于 email 则视为「未自定义」,输入框留空给 placeholder。
  const initialName = me?.name && me.name !== me.email ? me.name : '';
  const [name, setName] = useState(initialName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const memberSince = me?.created_at
    ? new Date(me.created_at * 1000).toLocaleDateString()
    : '—';

  const refreshMe = async () => {
    if (!authToken) return;
    try {
      const fresh = await getMe();
      setAuth(authToken, fresh);
    } catch { /* 非致命:本地 state 已是最新 */ }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateMe({ name: name.trim() });
      await refreshMe();
      toast.success(t('settings.profileSaved'));
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      // theme 用 console 的 mode(dark/light)映射到服务端偏好的 theme 字段。
      await updateMe({ prefs: { lang, theme: mode } });
      toast.success(t('settings.prefsSaved'));
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <>
      <PageHeader title={t('settings.title')} desc={t('settings.desc')} />

      <div className="page-body" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── 个人资料 ── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <TlnIcon name="user" size={14} style={{ color: 'var(--fg-2)' }} />
              {t('settings.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label htmlFor="set-name">{t('settings.displayName')}</Label>
                <Input
                  id="set-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('settings.namePlaceholder')}
                  maxLength={80}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>{t('settings.email')}</Label>
                <Input value={me?.email ?? ''} readOnly disabled />
                <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{t('settings.emailHint')}</span>
              </div>

              <div style={{ display: 'flex', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Label>{t('settings.role')}</Label>
                  <Badge variant="muted">{roleLabel(me?.role ?? '', t)}</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Label>{t('settings.memberSince')}</Label>
                  <span style={{ fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{memberSince}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="primary" loading={savingProfile} onClick={saveProfile}>
              {t('settings.saveProfile')}
            </Button>
          </CardFooter>
        </Card>

        {/* ── 偏好 ── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <TlnIcon name="settings" size={14} style={{ color: 'var(--fg-2)' }} />
              {t('settings.prefs')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{t('settings.prefsDesc')}</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 280 }}>
                <Label>{t('settings.language')}</Label>
                <Select value={lang} onValueChange={(v) => setTweak('lang', v as LangKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">{t('settings.lang.zh')}</SelectItem>
                    <SelectItem value="en">{t('settings.lang.en')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 280 }}>
                <Label>{t('settings.appearance')}</Label>
                <Select value={mode} onValueChange={(v) => setTweak('mode', v as ModeKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">{t('settings.mode.dark')}</SelectItem>
                    <SelectItem value="light">{t('settings.mode.light')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="primary" loading={savingPrefs} onClick={savePrefs}>
              {t('settings.savePrefs')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
