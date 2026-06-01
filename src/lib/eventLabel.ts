/* 审计事件类型 → 人类可读中文标题的唯一收口。
 * dashboard 活动流 + 审计页 + 任何展示 event_type 的地方都调这里,
 * 不要各自 t(`event.${k}`) 或裸显英文(同一份数据只此一处转换)。
 *
 * 映射在 i18n 的 event.* 命名空间(src/i18n/strings/audit.ts),覆盖后端
 * audit.EventType 全枚举;未映射的回退原始 type(不裸露 i18n key)。 */

/** 事件类型 → 中文标题。t 为 useT() 返回的翻译函数。 */
export function eventLabel(eventType: string, t: (k: string) => string): string {
  const key = `event.${eventType}`;
  const s = t(key);
  return s === key ? eventType : s;
}
