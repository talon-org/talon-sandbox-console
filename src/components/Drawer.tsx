/* src/components/Drawer.tsx
 * Thin wrapper over @talon-sandbox/react Drawer.
 * Adds convenience default width and standard header padding.
 * Usage:
 *   <Drawer open={open} onClose={close} title="Sandbox details" width={480}>
 *     <p>content</p>
 *   </Drawer>
 */
import type { ReactNode } from 'react';
import { Drawer as TlnDrawer } from '@talon-sandbox/react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  side?: 'right' | 'left';
  /** Default: 480 */
  width?: number | string;
  children?: ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, side = 'right', width = 480, children, className }: DrawerProps) {
  return (
    <TlnDrawer
      open={open}
      onClose={onClose}
      title={title}
      side={side}
      width={width}
      className={className}
    >
      {children}
    </TlnDrawer>
  );
}
