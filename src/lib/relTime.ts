/**
 * relTime.ts — i18n 感知的相对时间格式化工具
 * 使用 audit.relTime.* 翻译键，支持中英文输出。
 *
 * 用法：relTime(secAgo, t)
 *   secAgo — 距现在的秒数
 *   t      — useT() 返回的翻译函数
 *
 * 输出示例（zh）：刚刚 / 3 秒前 / 5 分钟前 / 2 小时前 / 1 天前
 * 输出示例（en）：just now / 3s ago / 5m ago / 2h ago / 1d ago
 */
export function relTime(secAgo: number, t: (key: string) => string): string {
  if (secAgo < 5)     return t('audit.relTime.justNow');
  if (secAgo < 60)    return t('audit.relTime.secAgo').replace('{n}', String(secAgo));
  if (secAgo < 3600)  return t('audit.relTime.minAgo').replace('{n}', String(Math.floor(secAgo / 60)));
  if (secAgo < 86400) return t('audit.relTime.hourAgo').replace('{n}', String(Math.floor(secAgo / 3600)));
  return t('audit.relTime.dayAgo').replace('{n}', String(Math.floor(secAgo / 86400)));
}
