/* src/components/ConfirmDialog.tsx
 * Destructive-action confirmation dialog.
 * Usage:
 *   <ConfirmDialog
 *     open={open} onClose={() => setOpen(false)}
 *     title="Delete sandbox?"
 *     description="This action cannot be undone."
 *     confirmLabel="Delete" onConfirm={handleDelete}
 *     loading={isPending} danger
 *   />
 */
import type { ReactNode } from 'react';
import { Dialog, Button } from '@talon-sandbox/react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  /** Renders confirm button in destructive (error) color. Default: true */
  danger?: boolean;
}

export function ConfirmDialog({
  open, onClose, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, loading, danger = true,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {description && (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}>
          {description}
        </p>
      )}
    </Dialog>
  );
}
