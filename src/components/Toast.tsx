/* src/components/Toast.tsx
 * Re-exports @talon-sandbox/react toast functions and Toaster.
 * Mount <Toaster /> once in App.tsx / Shell.tsx.
 * Usage:
 *   import { toast } from '../components/Toast';
 *   toast.success('Sandbox created');
 *   toast.error('Failed to delete');
 *
 *   // In App root:
 *   import { Toaster } from '../components/Toast';
 *   <Toaster />
 */
export { toast, Toaster } from '@talon-sandbox/react';
/** @deprecated Use Toaster instead */
export { Toaster as ToastViewport } from '@talon-sandbox/react';
