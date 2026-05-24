/* TODO(page-builder): per docs/SPEC-pages.md "Page: Sandbox Detail". */
import { useParams } from 'react-router-dom';
export function PageSandboxDetail() {
  const { id } = useParams();
  return <div style={{ padding: 24 }}>Sandbox detail: {id} — TODO</div>;
}
