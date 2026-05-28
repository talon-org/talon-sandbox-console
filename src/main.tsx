import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// react-grab: dev-only. Select any UI element in the browser, ⌘C, paste into agent.
// Dynamic import keeps it out of the prod bundle.
if (import.meta.env.DEV) {
  import('react-grab')
}

// StrictMode disabled temporarily: the xterm PTY page reuses a singleton
// terminal across effect runs, and the double-mount pattern makes that
// hand-off subtle to reason about. Re-enable after the terminal effect is
// fully audited.
createRoot(document.getElementById('root')!).render(<App />)
