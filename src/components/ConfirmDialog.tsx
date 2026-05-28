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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button,
} from '@talon-sandbox/react';
import './ConfirmDialog.css';

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="confirm-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && (
          <p className="confirm-dialog-desc">{description}</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            className={danger ? 'confirm-dialog-danger' : undefined}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
