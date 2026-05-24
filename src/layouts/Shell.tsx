/* In-shell layout: Sidebar (220px) + main pane (TopBar + content).
 * page-builder will flesh out Sidebar nav (icons + labels) and TopBar (search,
 * tenant switcher, profile menu) following shell.jsx prototype 1:1.
 */
import { Outlet, NavLink } from 'react-router-dom';
import { useT } from '../i18n/useT';

export function Shell() {
  const t = useT();
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <nav>
          <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>
          <NavLink to="/sandboxes">{t('nav.sandboxes')}</NavLink>
          <NavLink to="/recordings">{t('nav.recordings')}</NavLink>
          <NavLink to="/secrets">{t('nav.secrets')}</NavLink>
          <NavLink to="/audit">{t('nav.audit')}</NavLink>
          <NavLink to="/workers">{t('nav.workers')}</NavLink>
          <NavLink to="/tenants">{t('nav.tenants')}</NavLink>
        </nav>
      </aside>
      <div className="main-pane">
        <header
          style={{
            height: 'var(--topbar-h)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
          }}
        >
          {/* TopBar TODO: search, tenant switcher, CmdK trigger, profile */}
        </header>
        <main className="main-content" style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
