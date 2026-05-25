/* src/components/Toast.tsx
 * Re-exports @talon-sandbox/react toast functions and ToastViewport.
 * Mount <ToastViewport /> once in App.tsx / Shell.tsx.
 * Usage:
 *   import { toast } from '../components/Toast';
 *   toast.success('Sandbox created');
 *   toast.error('Failed to delete');
 *
 *   // In App root:
 *   import { ToastViewport } from '../components/Toast';
 *   <ToastViewport />
 */
export { toast, ToastViewport } from '@talon-sandbox/react';
