/* src/components/PageHeader.tsx
 * Title + eyebrow/breadcrumb + optional num badge + actions slot.
 * Delegates to @talon-sandbox/react PageHeader for base styles.
 * Usage:
 *   <PageHeader eyebrow="workspace" title="Sandboxes" num="18 / 24"
 *     actions={<Button>New</Button>} />
 */
import { PageHeader as TlnPageHeader } from '@talon-sandbox/react';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  num?: string;
  desc?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, num, desc, actions }: PageHeaderProps) {
  return (
    <TlnPageHeader
      eyebrow={eyebrow}
      title={title}
      num={num}
      desc={desc}
      actions={actions}
    />
  );
}
