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

// ── inject shell styles once ──────────────────────────────────────────────────
const SHELL_CSS = `
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  height: 100vh;
  background: var(--bg-1);
}
.sidebar {
  border-right: 1px solid var(--line);
  background: var(--bg-1);
  display: flex; flex-direction: column;
  min-width: 0;
}
.sidebar-head {
  padding: 16px 14px 12px;
  display: flex; align-items: center; gap: 8px;
}
.sidebar-brand {
  display: flex; align-items: center; gap: 9px;
  flex: 1; min-width: 0;
}
.sidebar-brand .wm {
  font-family: var(--font-mono); font-size: 14px; color: var(--fg-0);
  letter-spacing: -0.02em; font-weight: 500;
}
.tenant-switcher {
  margin: 0 8px 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--bg-2);
  padding: 8px 10px;
  display: flex; align-items: center; gap: 8px;
  cursor: pointer;
  transition: background var(--dur-fast);
}
.tenant-switcher:hover { background: var(--bg-3); border-color: var(--line-strong); }
.tenant-switcher .avatar {
  width: 22px; height: 22px;
  border-radius: var(--r-1);
  background: var(--acc);
  color: var(--acc-fg);
  font-weight: 600; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.tenant-switcher .who { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.tenant-switcher .who .name { font-size: 12.5px; color: var(--fg-0); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tenant-switcher .who .plan { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.08em; }
.nav-section { padding: 8px 8px; display: flex; flex-direction: column; gap: 1px; }
.nav-label {
  font-family: var(--font-mono); font-size: 9.5px; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--fg-3); padding: 8px 8px 6px;
}
.nav-link {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 8px;
  border-radius: var(--r-2);
  font-size: var(--text-base);
  color: var(--fg-2);
  text-decoration: none;
  transition: background var(--dur-fast), color var(--dur-fast);
  cursor: pointer;
}
.nav-link:hover { background: var(--bg-hover); color: var(--fg-1); }
.nav-link.active { background: var(--bg-3); color: var(--fg-0); font-weight: 500; }
.nav-link .ic { color: var(--fg-3); }
.nav-link.active .ic { color: var(--acc); }
.nav-link .count {
  margin-left: auto;
  font-family: var(--font-mono); font-size: 10px; color: var(--fg-3);
}
.nav-link.active .count { color: var(--fg-1); }
.sidebar-spacer { flex: 1; }
.sidebar-foot {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px;
}
.sidebar-foot .me-avatar {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--bg-3);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--fg-0); font-size: 11px; font-weight: 600;
  flex: 0 0 auto;
}
.sidebar-foot .me { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.sidebar-foot .me .email {
  font-size: 12px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-family: var(--font-mono);
}
.sidebar-foot .me .role {
  font-family: var(--font-mono); font-size: 9.5px; color: var(--fg-3);
  text-transform: uppercase; letter-spacing: 0.1em;
}
.sidebar-foot .logout-btn {
  color: var(--fg-3); cursor: pointer; padding: 4px; border-radius: 4px;
  background: transparent; border: 0; display: flex; align-items: center;
}
.sidebar-foot .logout-btn:hover { background: var(--bg-hover); color: var(--fg-1); }
.main-pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; }
.topbar {
  height: var(--topbar-h);
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center;
  padding: 0 20px; gap: 14px;
  background: var(--bg-1); flex: 0 0 auto;
}
.topbar-crumb { display: flex; align-items: center; gap: 8px; min-width: 0; }
.topbar-crumb .seg { font-size: var(--text-md); color: var(--fg-2); }
.topbar-crumb .seg.cur { color: var(--fg-0); font-weight: 500; }
.topbar-crumb .sep { color: var(--fg-4); }
.topbar-cmdk { flex: 1; max-width: 480px; margin: 0 auto; }
.topbar-cmdk button {
  width: 100%; height: 30px;
  background: var(--bg-2); border: 1px solid var(--line);
  border-radius: var(--r-2); color: var(--fg-3);
  display: flex; align-items: center; padding: 0 10px; gap: 8px;
  font-family: inherit; font-size: var(--text-sm); cursor: pointer;
  transition: border-color var(--dur-fast), background var(--dur-fast);
}
.topbar-cmdk button:hover { border-color: var(--line-strong); background: var(--bg-3); }
.topbar-cmdk button .kbd {
  margin-left: auto; padding: 1px 5px;
  border: 1px solid var(--line); border-radius: 3px;
  font-family: var(--font-mono); font-size: 10px; color: var(--fg-2);
}
.topbar-actions { display: flex; align-items: center; gap: 4px; }
.topbar-actions .ic-btn {
  width: 28px; height: 28px;
  border-radius: var(--r-2); background: transparent; border: 0;
  color: var(--fg-2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.topbar-actions .ic-btn:hover { background: var(--bg-hover); color: var(--fg-0); }
.topbar-actions .ic-btn .dot {
  position: absolute; top: 5px; right: 5px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--err); border: 2px solid var(--bg-1);
}
.main-content { flex: 1; overflow: auto; min-height: 0; }
.page-header { padding: 28px 32px 20px; border-bottom: 1px solid var(--line-soft); }
.page-header.no-border { border-bottom: 0; }
.page-header .eyebrow {
  font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-3);
  text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;
}
.page-header .title {
  font-size: 22px; font-weight: 600; letter-spacing: -0.02em; color: var(--fg-0);
  display: flex; align-items: center; gap: 12px;
}
.page-header .title .num {
  font-family: var(--font-mono); font-size: var(--text-md);
  color: var(--fg-3); font-weight: 400;
}
.page-header .desc { font-size: 13px; color: var(--fg-2); margin-top: 6px; max-width: 720px; line-height: 1.55; }
.page-header .header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.page-header .header-row .actions { display: flex; gap: 8px; margin-top: 4px; flex-shrink: 0; }
.page-body { padding: 24px 32px 56px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('tln-shell-styles')) {
  const s = document.createElement('style');
  s.id = 'tln-shell-styles';
  s.textContent = SHELL_CSS;
  document.head.appendChild(s);
}

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

function crumbsForPath(path: string): string[] {
  if (path.startsWith('/sandboxes/') && path.endsWith('/terminal')) {
    const id = path.split('/')[2];
    return ['Sandboxes', id, 'Terminal'];
  }
  if (path.startsWith('/sandboxes/')) {
    const id = path.split('/')[2];
    return ['Sandboxes', id];
  }
  if (path.startsWith('/recordings/')) {
    const id = path.split('/')[2];
    return ['Recordings', id];
  }
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/sandboxes': 'Sandboxes',
    '/recordings': 'Recordings',
    '/secrets': 'Secrets',
    '/audit': 'Audit',
    '/workers': 'Workers',
    '/tenants': 'Workspaces',
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

  const crumbs = crumbsForPath(location.pathname);

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
