/* TODO(page-builder): per docs/SPEC-pages.md "Page: Terminal".
 * Full-bleed. xterm.js + WebSocket /v1/sandboxes/{id}/pty.
 */
import { useParams } from 'react-router-dom';
export function PageTerminal() {
  const { id } = useParams();
  return <div style={{ position: 'fixed', inset: 0, padding: 24, color: 'var(--fg-1)' }}>Terminal: {id} — TODO</div>;
}
