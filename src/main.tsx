import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// react-grab: dev-only. Select any UI element in the browser, ⌘C, paste into agent.
// Dynamic import keeps it out of the prod bundle.
if (import.meta.env.DEV) {
  import('react-grab')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
