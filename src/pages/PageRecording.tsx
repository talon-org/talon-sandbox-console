/* TODO(page-builder): per docs/SPEC-pages.md "Page: Recording (播放)".
 * Full-bleed. rAF-driven frame replay.
 */
import { useParams } from 'react-router-dom';
export function PageRecording() {
  const { id } = useParams();
  return <div style={{ position: 'fixed', inset: 0, padding: 24, color: 'var(--fg-1)' }}>Recording: {id} — TODO</div>;
}
