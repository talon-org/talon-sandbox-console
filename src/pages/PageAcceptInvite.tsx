/* PageAcceptInvite — 接受团队邀请（公开页，无需登录，在 RequireAuth 之外）。
 *
 * 流程：从 URL query 取 token → POST /v1/invitations/accept { token, name? }
 *       → 成功后提示，引导用户去 /login 用返回的 email 走邮箱验证码登录。
 *
 * HashRouter 下 query 在 hash 之后（#/accept-invite?token=xxx），react-router 的
 * useSearchParams 解析的正是 hash 内的 search 段，可直接用。
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button, Input,
  LoginLayout, LoginLayoutForm,
} from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon, Mark } from '../icons/TlnIcon';
import { ThemeToggle } from '../components/ThemeToggle';
import { acceptInvitation } from '../api/members';

import './PageLogin.css';

export function PageAcceptInvite() {
  const t   = useT();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [name,     setName]     = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');
  // 接受成功后落地的 email（用于引导登录提示）
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!token) { setErr(t('accept.missingToken')); return; }
    setBusy(true);
    setErr('');
    try {
      const res = await acceptInvitation({ token, name: name.trim() || undefined });
      setDoneEmail(res.email);
    } catch {
      setErr(t('accept.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoginLayout>
      <ThemeToggle className="login-theme-toggle" size={16} />

      {/* 单栏表单布局（接受邀请不需要左侧 marketing 区） */}
      <LoginLayoutForm>
        <div className="login-right-inner">
          <div className="lc-head">
            <div className="brand-row" style={{ marginBottom: 18 }}>
              <Mark size={20} />
              <span className="brand-wm">talon</span>
            </div>
            <h1>{t('accept.title')}</h1>
            <div className="lc-sub">{t('accept.subtitle')}</div>
          </div>

          {doneEmail ? (
            // ── 成功态：引导去登录 ────────────────────────────────────────
            <div className="login-fields">
              <div
                className="login-field"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 8,
                  alignItems: 'center', textAlign: 'center', padding: '8px 0',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--ok-soft, rgba(80,200,120,.12))', color: 'var(--ok)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TlnIcon name="check" size={20} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
                  {t('accept.successTitle')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                  {t('accept.successDesc')}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)',
                  background: 'var(--bg-2)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r-2)', padding: '6px 12px', marginTop: 4,
                }}>
                  {doneEmail}
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => nav('/login')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {t('accept.goToLogin')}
                <TlnIcon name="arrowRight" size={14} />
              </Button>
            </div>
          ) : (
            // ── 表单态 ───────────────────────────────────────────────────
            <form
              className="login-fields"
              onSubmit={(e) => { e.preventDefault(); handleAccept(); }}
              noValidate
            >
              <div className="login-field">
                <div className="lf-label-row">
                  <label className="lf-label" htmlFor="accept-name">{t('accept.nameLabel')}</label>
                </div>
                <Input
                  id="accept-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('accept.namePlaceholder')}
                  prefix={<TlnIcon name="user" size={14} style={{ color: 'var(--fg-3)' }} />}
                />
              </div>

              {err && (
                <div style={{
                  fontSize: 12.5, color: 'var(--err)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <TlnIcon name="alert" size={13} />
                  {err}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                loading={busy}
                disabled={!token || busy}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {t('accept.submit')}
              </Button>
            </form>
          )}
        </div>
      </LoginLayoutForm>
    </LoginLayout>
  );
}
