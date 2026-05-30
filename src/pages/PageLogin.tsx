/* PageLogin — full-bleed split-screen login.
 * Layout shell: LoginLayout / LoginLayoutBrand / LoginLayoutForm from @talon-sandbox/react.
 * Email-code is the primary human auth path; API-key is for service accounts.
 *   tab=email  → Send code → 60s resend cooldown → enter 6-digit code → verify
 *   tab=apikey → paste ask_… → bearer-auth + GET /v1/auth/me in one shot
 */
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Input,
  LoginLayout, LoginLayoutBrand, LoginLayoutForm,
  toast,
} from '@talon-sandbox/react';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon, Mark } from '../icons/TlnIcon';
import { ThemeToggle } from '../components/ThemeToggle';
import { requestCode, verifyCode, loginApiKey } from '../api/auth';
import { loginErrorKey } from '../api/errors';

import './PageLogin.css';

// ── Left brand panel ──────────────────────────────────────────────────────────
function LoginBrandContent() {
  const t = useT();
  return (
    <>
      <div className="brand-row">
        <Mark size={20} />
        <span className="brand-wm">talon</span>
        <span className="brand-badge">{t('app.subtitle')}</span>
      </div>

      <div className="login-spacer" />

      <div className="login-tagline">
        {t('login.tagline.l1')}<br />
        <span className="acc">{t('login.tagline.acc')}</span>{t('login.tagline.l2')}
      </div>
      <div className="login-sub">{t('login.subDesc')}</div>

      <div className="code-block">
        <div className="cb-head"><span className="dot" />{t('login.code.header')}</div>
        <div className="cb-body">
          <span className="c-com"># pip install talon-sdk</span>{'\n'}
          <span className="c-key">from</span>{' talon '}
          <span className="c-key">import</span>{' Sandbox\n\n'}
          {'sb = '}
          <span className="c-fn">Sandbox.create</span>
          {'(image='}
          <span className="c-str">&quot;node:20-bookworm&quot;</span>
          {')\n'}
          {'result = sb.'}
          <span className="c-fn">run</span>
          {'('}
          <span className="c-str">&quot;npm install &amp;&amp; npm run dev&quot;</span>
          {')\n'}
          <span className="c-fn">print</span>
          {'(sb.'}
          <span className="c-fn">expose</span>
          {'('}
          <span className="c-num">5173</span>
          {'))'}
        </div>
      </div>

      <div className="login-foot">
        <div className="stat"><span>{t('login.activeSb')}</span><span className="v">12,418</span></div>
        <div className="stat"><span>{t('login.coldStart')}</span><span className="v">87ms</span></div>
        <div className="stat"><span>{t('login.regions')}</span><span className="v">3 · eu / us / ap</span></div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PageLogin() {
  const t       = useT();
  const nav     = useNavigate();
  const setAuth = useApp((s) => s.setAuth);

  const [tab,      setTab]      = useState<'email' | 'apikey'>('email');
  const [email,    setEmail]    = useState('admin@talon.dev');
  const [code,     setCode]     = useState('');
  const [apiKey,   setApiKey]   = useState('');
  const [busy,     setBusy]     = useState(false);
  const [sending,  setSending]  = useState(false);
  const [err,      setErr]      = useState('');
  const [info,     setInfo]     = useState('');
  // Resend cooldown in seconds. >0 means a code was just sent.
  const [cooldown, setCooldown] = useState(0);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const sendCode = async () => {
    setErr('');
    setInfo('');
    if (!email.trim()) {
      setErr(t('login.err.emailRequired'));
      return;
    }
    setSending(true);
    try {
      await requestCode(email);
      setInfo(t('login.codeSent'));
      setCooldown(60);
    } catch (ex) {
      setErr(t(loginErrorKey(ex, 'email')));
    } finally {
      setSending(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      let token: string;
      let me;
      if (tab === 'email') {
        const resp = await verifyCode(email, code);
        token = resp.token;
        // 先把 token 存入 store 以便 authHeaders() 工作，再拉 me
        me = await fetch('/v1/auth/me', { credentials: 'include' })
          .then((r) => { if (!r.ok) throw new Error(`me ${r.status}`); return r.json(); });
        // 新注册用户给一次性欢迎 toast，老用户静默跳转
        if (resp.is_new_user) {
          // 欢迎 toast 在 setAuth + nav 后显示；延迟 200ms 等 Toaster 挂载
          setTimeout(() => {
            toast.success(t('login.welcomeNewUser'));
          }, 200);
        }
      } else {
        const r = await loginApiKey({ api_key: apiKey });
        token = r.token;
        me = r.me;
      }
      // Atomic write — Boot's effect won't fire because me is set.
      setAuth(token, me);
      nav('/', { replace: true });
    } catch (ex) {
      console.error('[login] failed', ex);
      setErr(t(loginErrorKey(ex, tab)));
    } finally {
      setBusy(false);
    }
  };

  const canResend   = cooldown === 0 && !sending;
  const resendLabel = cooldown > 0
    ? t('login.resendIn').replace('{s}', String(cooldown))
    : (sending ? t('login.sending') : t('login.resend'));

  return (
    <LoginLayout>
      {/* 右上角固定悬浮的主题切换 */}
      <ThemeToggle className="login-theme-toggle" size={16} />

      {/* Left: brand / marketing */}
      <LoginLayoutBrand className="login-left">
        <LoginBrandContent />
      </LoginLayoutBrand>

      {/* Right: form */}
      <LoginLayoutForm>
        <div className="login-right-inner">
          <div className="lc-head">
            <h1>{t('login.title')}</h1>
            <div className="lc-sub">{t('login.sub')}</div>
          </div>

          {/* Tab toggle */}
          <div className="login-tabs" role="tablist">
            <button
              type="button"
              id="tab-email"
              role="tab"
              aria-selected={tab === 'email'}
              aria-controls="tabpanel-email"
              onClick={() => { setTab('email'); setErr(''); setInfo(''); }}
            >
              <TlnIcon name="user" size={13} />
              {t('login.tab.email')}
            </button>
            <button
              type="button"
              id="tab-apikey"
              role="tab"
              aria-selected={tab === 'apikey'}
              aria-controls="tabpanel-apikey"
              onClick={() => { setTab('apikey'); setErr(''); setInfo(''); }}
            >
              <TlnIcon name="key" size={13} />
              {t('login.tab.apikey')}
            </button>
          </div>

          <form className="login-fields" onSubmit={submit} noValidate>
            {tab === 'email' ? (
              <div
                id="tabpanel-email"
                role="tabpanel"
                aria-labelledby="tab-email"
                style={{ display: 'contents' }}
              >
                {/* Email field */}
                <div className="login-field">
                  <div className="lf-label-row">
                    <label className="lf-label" htmlFor="login-email">{t('login.email')}</label>
                  </div>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    prefix={<TlnIcon name="user" size={14} style={{ color: 'var(--fg-3)' }} />}
                    placeholder="you@company.dev"
                    required
                  />
                </div>

                {/* Send-code button */}
                <Button
                  type="button"
                  variant="default"
                  size="md"
                  onClick={sendCode}
                  disabled={!canResend || !email.trim()}
                  loading={sending}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {cooldown > 0 ? resendLabel : t('login.sendCode')}
                </Button>

                {/* Code field */}
                <div className="login-field">
                  <div className="lf-label-row">
                    <label className="lf-label" htmlFor="login-code">{t('login.code')}</label>
                    <span className="lf-label" style={{ color: 'var(--fg-3)', fontWeight: 400, fontSize: 11 }}>
                      {t('login.codeHint')}
                    </span>
                  </div>
                  <Input
                    id="login-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    mono
                    maxLength={6}
                    pattern="\d{6}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    prefix={<TlnIcon name="lock" size={14} style={{ color: 'var(--fg-3)' }} />}
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>
            ) : (
              /* API-key field */
              <div
                id="tabpanel-apikey"
                role="tabpanel"
                aria-labelledby="tab-apikey"
                style={{ display: 'contents' }}
              >
                <div className="login-field">
                  <div className="lf-label-row">
                    <label className="lf-label" htmlFor="login-apikey">{t('login.apikey')}</label>
                  </div>
                  <Input
                    id="login-apikey"
                    type="password"
                    mono
                    autoComplete="off"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    prefix={<TlnIcon name="key" size={14} style={{ color: 'var(--fg-3)' }} />}
                    placeholder="ask_•••••••••••••••••••••••••"
                    required
                  />
                  <div className="lf-hint">{t('login.apikey.hint')}</div>
                </div>
              </div>
            )}

            {info && <div className="login-info" role="status">{info}</div>}
            {err  && <div className="login-error" role="alert">{err}</div>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy}
              disabled={busy || (tab === 'email' && code.length !== 6) || (tab === 'apikey' && !apiKey)}
              style={{ marginTop: 6, width: '100%', justifyContent: 'center' }}
            >
              {busy
                ? t('login.signing')
                : tab === 'apikey'
                  ? <>{t('login.useKey')}<span style={{ marginLeft: 'auto' }}><TlnIcon name="arrowRight" size={14} /></span></>
                  : <>{t('login.signInBtn')}<span style={{ marginLeft: 'auto' }}><TlnIcon name="arrowRight" size={14} /></span></>
              }
            </Button>
          </form>

          {/* SSO */}
          <div className="sso-divider">{t('login.continueWith')}</div>
          <div className="sso-section">
            <Button
              variant="default"
              size="md"
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 00-2.5 15.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1 0-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 014 0c1.5-1 2.2-.8 2.2-.8.5 1.1.1 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.5.7.5 1.4v2c0 .2.1.5.5.4A8 8 0 008 0z" />
              </svg>
              {t('login.github')}
            </Button>
            <Button
              variant="default"
              size="md"
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16">
                <path d="M14.7 8.2c0-.5-.1-1-.2-1.5H8v2.9h3.8c-.2.9-.7 1.6-1.4 2v1.7h2.2c1.3-1.2 2.1-2.9 2.1-5.1z" fill="#4285F4"/>
                <path d="M8 15c1.9 0 3.5-.6 4.7-1.7L10.5 11.6c-.6.4-1.4.7-2.5.7-1.9 0-3.5-1.3-4.1-3H1.6v1.9C2.8 13.6 5.2 15 8 15z" fill="#34A853"/>
                <path d="M3.9 9.3c-.1-.4-.2-.9-.2-1.3V4.8H1.6C1.2 5.7 1 6.8 1 8s.2 2.3.6 3.2l2.3-1.9z" fill="#FBBC05"/>
                <path d="M8 3.6c1 0 2 .4 2.7 1.1l2-2C11.5 1.6 9.9 1 8 1 5.2 1 2.8 2.4 1.6 4.8l2.3 1.9c.6-1.7 2.2-3 4.1-3z" fill="#EA4335"/>
              </svg>
              {t('login.google')}
            </Button>
          </div>

          <div className="login-footer-link">
            <a onClick={() => { /* TODO: request access flow */ }}>{t('login.requestAccess')}</a>
          </div>
        </div>
      </LoginLayoutForm>
    </LoginLayout>
  );
}
