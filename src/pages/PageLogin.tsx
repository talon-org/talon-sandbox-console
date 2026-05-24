/* PageLogin — full-bleed split-screen login.
 * 1:1 port of page-login.jsx prototype.
 * Left: brand + tagline + SDK code block + stats.
 * Right: email/password | API key tab toggle + SSO buttons.
 * Uses LoginLayout from @talon-sandbox/react as the two-column shell.
 */
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginLayout, Button, Input } from '@talon-sandbox/react';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon, Mark } from '../icons/TlnIcon';
import { apiPost } from '../api/client';

import './PageLogin.css';

// ── API types ─────────────────────────────────────────────────────────────────
interface LoginEmailReq  { email: string; password: string }
interface LoginKeyReq    { api_key: string }
interface LoginResp      { token: string }
interface MeResp         { id: string; email: string; name: string; role: string; tenant_id: string }

// ── left panel ────────────────────────────────────────────────────────────────
function LoginLeft() {
  const t = useT();
  return (
    <div className="login-left">
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
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export function PageLogin() {
  const t       = useT();
  const nav     = useNavigate();
  const setAuth = useApp((s) => s.setAuth);

  const [tab,      setTab]      = useState<'password' | 'apikey'>('password');
  const [email,    setEmail]    = useState('ada@acme.dev');
  const [password, setPassword] = useState('');
  const [apiKey,   setApiKey]   = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      // POST /v1/auth/login
      const body = tab === 'password'
        ? ({ email, password } satisfies LoginEmailReq)
        : ({ api_key: apiKey } satisfies LoginKeyReq);
      const resp = await apiPost<LoginResp>('/v1/auth/login', body);
      // GET /v1/auth/me
      const me = await import('../api/client').then(({ apiGet }) =>
        apiGet<MeResp>('/v1/auth/me'),
      );
      setAuth(resp.token, me);
      nav('/dashboard', { replace: true });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoginLayout left={<LoginLeft />}>
      <div className="login-right-inner">
        <div className="lc-head">
          <h1>{t('login.title')}</h1>
          <div className="lc-sub">{t('login.sub')}</div>
        </div>

        {/* tab toggle */}
        <div className="login-tabs" role="tablist">
          <button
            role="tab"
            aria-pressed={tab === 'password'}
            aria-selected={tab === 'password'}
            onClick={() => setTab('password')}
          >
            <TlnIcon name="user" size={13} />
            {t('login.tab.email')}
          </button>
          <button
            role="tab"
            aria-pressed={tab === 'apikey'}
            aria-selected={tab === 'apikey'}
            onClick={() => setTab('apikey')}
          >
            <TlnIcon name="key" size={13} />
            {t('login.tab.apikey')}
          </button>
        </div>

        <form className="login-fields" onSubmit={submit} noValidate>
          {tab === 'password' ? (
            <>
              {/* email field */}
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
              {/* password field */}
              <div className="login-field">
                <div className="lf-label-row">
                  <label className="lf-label" htmlFor="login-password">{t('login.password')}</label>
                  <a className="lf-label" style={{ color: 'var(--acc-strong)', cursor: 'pointer', fontWeight: 400, fontSize: 11 }}>
                    {t('login.forgot')}
                  </a>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  prefix={<TlnIcon name="lock" size={14} style={{ color: 'var(--fg-3)' }} />}
                  required
                />
              </div>
            </>
          ) : (
            /* api-key field */
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
                placeholder="tlk_•••••••••••••••••••••••••"
                required
              />
              <div className="lf-hint">{t('login.apikey.hint')}</div>
            </div>
          )}

          {err && <div className="login-error" role="alert">{err}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            disabled={busy}
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
              <path d="M3.9 9.3c-.1-.4-.2-.9-.2-1.3s.1-.9.2-1.3V4.8H1.6C1.2 5.7 1 6.8 1 8s.2 2.3.6 3.2l2.3-1.9z" fill="#FBBC05"/>
              <path d="M8 3.6c1 0 2 .4 2.7 1.1l2-2C11.5 1.6 9.9 1 8 1 5.2 1 2.8 2.4 1.6 4.8l2.3 1.9c.6-1.7 2.2-3 4.1-3z" fill="#EA4335"/>
            </svg>
            {t('login.google')}
          </Button>
        </div>

        <div className="login-footer-link">
          <a onClick={() => { /* TODO: request access flow */ }}>{t('login.requestAccess')}</a>
        </div>
      </div>
    </LoginLayout>
  );
}
