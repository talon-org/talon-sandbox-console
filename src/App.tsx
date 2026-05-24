import { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Shell } from './layouts/Shell';
import { useApp } from './store';
import { getMe } from './api/auth';
import { PageLogin } from './pages/PageLogin';
import { PageDashboard } from './pages/PageDashboard';
import { PageSandboxes } from './pages/PageSandboxes';
import { PageSandboxDetail } from './pages/PageSandboxDetail';
import { PageTerminal } from './pages/PageTerminal';
import { PageRecordings } from './pages/PageRecordings';
import { PageRecording } from './pages/PageRecording';
import { PageSecrets } from './pages/PageSecrets';
import { PageWorkers } from './pages/PageWorkers';
import { PageTenants } from './pages/PageTenants';
import { PageAudit } from './pages/PageAudit';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const me = useApp((s) => s.me);
  const token = useApp((s) => s.authToken);
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (!me) return <div style={{ padding: 24, color: 'var(--fg-3)' }}>Loading…</div>;
  return <>{children}</>;
}

function Boot() {
  // Hydrate `me` if we have a token but no profile loaded yet (page reload case).
  const token = useApp((s) => s.authToken);
  const me = useApp((s) => s.me);
  const setAuth = useApp((s) => s.setAuth);
  useEffect(() => {
    if (token && !me) {
      const ac = new AbortController();
      getMe(ac.signal)
        .then((m) => setAuth(token, m))
        .catch(() => setAuth(null, null));
      return () => ac.abort();
    }
  }, [token, me, setAuth]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <Boot />
      <Routes>
        <Route path="/login" element={<PageLogin />} />

        {/* Full-bleed authenticated routes (no Shell). */}
        <Route
          path="/sandboxes/:id/terminal"
          element={
            <RequireAuth>
              <PageTerminal />
            </RequireAuth>
          }
        />
        <Route
          path="/recordings/:id"
          element={
            <RequireAuth>
              <PageRecording />
            </RequireAuth>
          }
        />

        {/* In-shell authenticated routes. */}
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<PageDashboard />} />
          <Route path="/sandboxes" element={<PageSandboxes />} />
          <Route path="/sandboxes/:id" element={<PageSandboxDetail />} />
          <Route path="/recordings" element={<PageRecordings />} />
          <Route path="/secrets" element={<PageSecrets />} />
          <Route path="/audit" element={<PageAudit />} />
          <Route path="/workers" element={<PageWorkers />} />
          <Route path="/tenants" element={<PageTenants />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}
