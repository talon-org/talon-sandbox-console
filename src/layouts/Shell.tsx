/* Shell — Sidebar (220px) + TopBar (48px) + main content.
 * 1:1 port of shell.jsx prototype. Styles are inline via className
 * rules defined in src/styles/shell.css (injected once).
 */
import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon, Mark } from '../icons/TlnIcon';
import { CmdKOverlay, TweaksPanel, ToastViewport } from '@talon-sandbox/react';

import './Shell.css';

// ── Mock static data for sidebar (pre-API) ────────────────────────────────────
// TODO: replace with real API data once GET /v1/admin/sandboxes is available
const STATIC_TENANT = { name: 'Acme · Inc.', plan: 'Enterprise' };
const STATIC_SANDBOX_COUNT = 18; // active sandboxes count from metrics

const NAV_WORKSPACE = [
  { id: 'dashboard',  labelKey: 'nav.dashboard',  icon: 'home',   path: '/dashboard' },
  { id: 'sandboxes',  labelKey: 'nav.sandboxes',   icon: 'box',    path: '/sandboxes', count: STATIC_SANDBOX_COUNT },
  { id: 'recordings', labelKey: 'nav.recordings',  icon: 'film',   path: '/recordings' },
  { id: 'secrets',    labelKey: 'nav.secrets',     icon: 'key',    path: '/secrets' },
  { id: 'audit',      labelKey: 'nav.audit',       icon: 'scroll', path: '/audit' },
];

const NAV_ADMIN = [
  { id: 'workers', labelKey: 'nav.workers', icon: 'server', path: '/workers' },
  { id: 'tenants', labelKey: 'nav.tenants', icon: 'users',  path: '/tenants' },
];

function crumbsForPath(path: string, t: (key: string) => string): string[] {
  if (path.startsWith('/sandboxes/') && path.endsWith('/terminal')) {
    const id = path.split('/')[2];
    return [t('nav.sandboxes'), id, t('common.terminal')];
  }
  if (path.startsWith('/sandboxes/')) {
    const id = path.split('/')[2];
    return [t('nav.sandboxes'), id];
  }
  if (path.startsWith('/recordings/')) {
    const id = path.split('/')[2];
    return [t('nav.recordings'), id];
  }
  const map: Record<string, string> = {
    '/dashboard':  t('nav.dashboard'),
    '/sandboxes':  t('nav.sandboxes'),
    '/recordings': t('nav.recordings'),
    '/secrets':    t('nav.secrets'),
    '/audit':      t('nav.audit'),
    '/workers':    t('nav.workers'),
    '/tenants':    t('nav.tenants'),
  };
  const match = Object.keys(map).find(k => path.startsWith(k));
  return match ? [map[match]] : ['—'];
}

export function Shell() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const me = useApp(s => s.me);
  const logout = useApp(s => s.logout);
  const cmdkOpen = useApp(s => s.cmdkOpen);
  const setCmdK = useApp(s => s.setCmdK);
  const theme = useApp(s => s.theme);
  const mode = useApp(s => s.mode);
  const density = useApp(s => s.density);
  const font = useApp(s => s.font);
  const lang = useApp(s => s.lang);
  const setTweak = useApp(s => s.setTweak);

  const crumbs = crumbsForPath(location.pathname, t);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdK(!cmdkOpen);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cmdkOpen, setCmdK]);

  const cmdkItems = [
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.dashboard'),   icon: <TlnIcon name="home" size={15} />,   kbd: 'G D', action: () => navigate('/dashboard') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.sandboxes'),   icon: <TlnIcon name="box" size={15} />,    kbd: 'G S', action: () => navigate('/sandboxes') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.recordings'),  icon: <TlnIcon name="film" size={15} />,   kbd: 'G R', action: () => navigate('/recordings') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.secrets'),     icon: <TlnIcon name="key" size={15} />,    kbd: 'G K', action: () => navigate('/secrets') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.audit'),       icon: <TlnIcon name="scroll" size={15} />, kbd: 'G A', action: () => navigate('/audit') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.workers'),     icon: <TlnIcon name="server" size={15} />,            action: () => navigate('/workers') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.tenants'),     icon: <TlnIcon name="users" size={15} />,             action: () => navigate('/tenants') },
    { group: t('cmdk.group.actions'), name: t('cmdk.action.newSandbox'), icon: <TlnIcon name="plus" size={15} />, kbd: 'C N', action: () => navigate('/sandboxes?new=1') },
    { group: t('cmdk.group.actions'), name: t('cmdk.action.newSecret'),  icon: <TlnIcon name="key" size={15} />,           action: () => navigate('/secrets?new=1') },
    { group: t('cmdk.group.actions'), name: t('cmdk.action.signOut'),    icon: <TlnIcon name="logout" size={15} />,        action: () => { logout(); navigate('/login'); } },
  ];

  const initials = me ? me.email[0].toUpperCase() : '?';

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        {/* Brand header */}
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <Mark size={14} />
            <span className="wm">talon</span>
          </div>
          <button
            title={t('sidebar.newSandbox')}
            onClick={() => navigate('/sandboxes?new=1')}
            style={{
              width: 26, height: 26, borderRadius: 'var(--r-2)', border: '1px solid var(--line)',
              background: 'var(--bg-2)', color: 'var(--fg-1)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label={t('sidebar.newSandbox')}
          >
            <TlnIcon name="plus" size={14} />
          </button>
        </div>

        {/* Tenant switcher */}
        <div className="tenant-switcher" role="button" tabIndex={0} aria-label="Switch workspace">
          <div className="avatar">{STATIC_TENANT.name[0]}</div>
          <div className="who">
            <span className="name">{STATIC_TENANT.name}</span>
            <span className="plan">{STATIC_TENANT.plan}</span>
          </div>
          <TlnIcon name="chevronDown" size={12} style={{ color: 'var(--fg-3)' }} />
        </div>

        {/* Workspace nav */}
        <nav className="nav-section" aria-label="Workspace">
          <div className="nav-label">{t('sidebar.workspace')}</div>
          {NAV_WORKSPACE.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <TlnIcon name={item.icon} size={15} className="ic" />
              <span>{t(item.labelKey)}</span>
              {item.count != null && (
                <span className="count">{item.count}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin nav */}
        <nav className="nav-section" aria-label="Admin">
          <div className="nav-label">{t('sidebar.admin')}</div>
          {NAV_ADMIN.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <TlnIcon name={item.icon} size={15} className="ic" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        {/* User foot */}
        <div className="sidebar-foot">
          <div className="me-avatar" aria-hidden="true">{initials}</div>
          <div className="me">
            <span className="email">{me?.email ?? '—'}</span>
            <span className="role">{me?.role ?? ''}</span>
          </div>
          <button
            className="logout-btn"
            title={t('common.signOut')}
            aria-label={t('common.signOut')}
            onClick={() => { logout(); navigate('/login'); }}
          >
            <TlnIcon name="logout" size={14} />
          </button>
        </div>
      </aside>

      <div className="main-pane">
        {/* TopBar */}
        <header className="topbar" role="banner">
          <div className="topbar-crumb" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && (
                  <span className="sep" aria-hidden="true">
                    <TlnIcon name="chevronRight" size={12} />
                  </span>
                )}
                <span className={'seg' + (i === crumbs.length - 1 ? ' cur' : '')}>{c}</span>
              </span>
            ))}
          </div>

          <div className="topbar-cmdk">
            <button
              onClick={() => setCmdK(true)}
              aria-label={t('topbar.cmdk_placeholder')}
              aria-keyshortcuts="Meta+k"
            >
              <TlnIcon name="search" size={14} />
              <span>{t('topbar.cmdk_placeholder')}</span>
              <span className="kbd">⌘K</span>
            </button>
          </div>

          <div className="topbar-actions">
            <button className="ic-btn" title={t('topbar.notifications')} aria-label={t('topbar.notifications')}>
              <TlnIcon name="bell" size={15} />
              <span className="dot" aria-hidden="true" />
            </button>
            <button className="ic-btn" title={t('topbar.help')} aria-label={t('topbar.help')}>
              <TlnIcon name="info" size={15} />
            </button>
            <button className="ic-btn" title={t('topbar.settings')} aria-label={t('topbar.settings')}>
              <TlnIcon name="settings" size={15} />
            </button>
          </div>
        </header>

        <main className="main-content" id="main-content">
          <Outlet />
        </main>
      </div>

      {/* CmdK overlay */}
      <CmdKOverlay
        open={cmdkOpen}
        onClose={() => setCmdK(false)}
        items={cmdkItems}
        placeholder={t('cmdk.placeholder')}
      />

      {/* Tweaks panel — closed-beta: always visible */}
      <TweaksPanel
        theme={theme}
        mode={mode}
        density={density}
        font={font}
        lang={lang}
        onSet={(key, value) => setTweak(key as Parameters<typeof setTweak>[0], value as never)}
        defaultOpen={false}
      />

      {/* Toast viewport */}
      <ToastViewport />
    </div>
  );
}

// ── PageHeader helper (reusable across pages) ─────────────────────────────────
interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  num?: React.ReactNode;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
  noBorder?: boolean;
}

export function PageHeader({ eyebrow, title, num, desc, actions, noBorder }: PageHeaderProps) {
  return (
    <div className={'page-header' + (noBorder ? ' no-border' : '')}>
      <div className="header-row">
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="title" style={{ margin: 0 }}>
            {title}
            {num != null && <span className="num">{num}</span>}
          </h1>
          {desc && <div className="desc">{desc}</div>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </div>
  );
}

// ── Re-export ReactDOM.createPortal shim for dialogs/drawers ─────────────────
export { ReactDOM };
