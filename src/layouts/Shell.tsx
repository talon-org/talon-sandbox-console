/* Shell — Sidebar (220px) + TopBar (48px) + main content.
 * 1:1 port of shell.jsx prototype. Styles defined in Shell.css.
 * v0.3: PageHeader removed from local impl — now re-exported from @talon-sandbox/react.
 *       TweaksPanel restored as local business shell (fixed bottom-right).
 */
import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon, Mark } from '../icons/TlnIcon';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
  Toaster,
} from '@talon-sandbox/react';
import { TweaksPanel } from '../components/TweaksPanel';

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
    return [t('nav.sandboxes'), id!, t('common.terminal')];
  }
  if (path.startsWith('/sandboxes/')) {
    const id = path.split('/')[2];
    return [t('nav.sandboxes'), id!];
  }
  if (path.startsWith('/recordings/')) {
    const id = path.split('/')[2];
    return [t('nav.recordings'), id!];
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
  return match ? [map[match]!] : ['—'];
}

export function Shell() {
  const t        = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const me       = useApp(s => s.me);
  const logout   = useApp(s => s.logout);
  const cmdkOpen = useApp(s => s.cmdkOpen);
  const setCmdK  = useApp(s => s.setCmdK);

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
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.dashboard'),   icon: <TlnIcon name="home"    size={15} />, kbd: 'G D', action: () => navigate('/dashboard') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.sandboxes'),   icon: <TlnIcon name="box"     size={15} />, kbd: 'G S', action: () => navigate('/sandboxes') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.recordings'),  icon: <TlnIcon name="film"    size={15} />, kbd: 'G R', action: () => navigate('/recordings') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.secrets'),     icon: <TlnIcon name="key"     size={15} />, kbd: 'G K', action: () => navigate('/secrets') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.audit'),       icon: <TlnIcon name="scroll"  size={15} />, kbd: 'G A', action: () => navigate('/audit') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.workers'),     icon: <TlnIcon name="server"  size={15} />,             action: () => navigate('/workers') },
    { group: t('cmdk.group.nav'), name: t('cmdk.nav.tenants'),     icon: <TlnIcon name="users"   size={15} />,             action: () => navigate('/tenants') },
    { group: t('cmdk.group.actions'), name: t('cmdk.action.newSandbox'), icon: <TlnIcon name="plus"   size={15} />, kbd: 'C N', action: () => navigate('/sandboxes?new=1') },
    { group: t('cmdk.group.actions'), name: t('cmdk.action.newSecret'),  icon: <TlnIcon name="key"    size={15} />,           action: () => navigate('/secrets?new=1') },
    { group: t('cmdk.group.actions'), name: t('cmdk.action.signOut'),    icon: <TlnIcon name="logout" size={15} />,           action: () => { logout(); navigate('/login'); } },
  ];

  // Avatar initials: name → email → tenant_id prefix → '?'
  const initials = (() => {
    const src = me?.name || me?.email || me?.tenant_id || '';
    return src ? src.replace(/^tnt_/, '').charAt(0).toUpperCase() : '?';
  })();

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
            {/* API Key flow has no email — fallback to name, then tenant_id sans prefix */}
            <span className="email">{me?.email ?? me?.name ?? me?.tenant_id?.replace(/^tnt_/, '') ?? '—'}</span>
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

      {/* Tweaks panel — fixed bottom-right, collapsible */}
      <TweaksPanel />

      {/* CmdK overlay */}
      <CommandDialog open={cmdkOpen} onOpenChange={setCmdK}>
        <CommandInput placeholder={t('cmdk.placeholder')} />
        <CommandList>
          <CommandEmpty>{t('cmdk.noResults', 'No results')}</CommandEmpty>
          {(() => {
            const groups: Record<string, typeof cmdkItems> = {};
            for (const item of cmdkItems) {
              if (!groups[item.group]) groups[item.group] = [];
              groups[item.group]!.push(item);
            }
            return Object.entries(groups).map(([groupName, items]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {items.map(it => (
                  <CommandItem
                    key={it.name}
                    value={it.name}
                    onSelect={() => { it.action(); setCmdK(false); }}
                  >
                    {it.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{it.icon}</span>}
                    <span>{it.name}</span>
                    {it.kbd && <CommandShortcut>{it.kbd}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ));
          })()}
        </CommandList>
      </CommandDialog>

      {/* Toast viewport */}
      <Toaster />
    </div>
  );
}

// PageHeader is now imported from @talon-sandbox/react wherever needed.
// Re-export it here so existing imports from '../layouts/Shell' keep working.
export { PageHeader } from '@talon-sandbox/react';
