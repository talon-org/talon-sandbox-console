/* AuditRow / PageAudit 共享的事件分类辅助。
 * 抽到独立文件,避免在 AuditRow.tsx 内非组件 export 触发 Fast Refresh 失效。
 */

export function typeKind(type: string): string {
  if (type.startsWith('sandbox')) return 'sandbox';
  if (type.startsWith('secret'))  return 'secret';
  if (type.startsWith('auth'))    return 'auth';
  if (type.startsWith('pty'))     return 'pty';
  if (type.startsWith('image'))   return 'image';
  return 'system';
}
