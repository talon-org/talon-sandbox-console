/* i18n dictionary. EN + ZH. Default ZH.
 *
 * Keys come from prototype i18n.jsx (~90 strings). page-builder will fill these
 * out as they implement each page. Do NOT inline raw Chinese in components — use
 * useT() so language switch via Tweaks panel actually works.
 *
 * Convention: dotted keys, e.g. nav.dashboard, login.title, audit.live.
 */
export type LangKey = 'en' | 'zh';

export const STRINGS: Record<string, { en: string; zh: string }> = {
  // ── nav ─────────────────────────────────────────────────────────────────
  'nav.dashboard': { en: 'Dashboard', zh: '仪表盘' },
  'nav.sandboxes': { en: 'Sandboxes', zh: '沙箱' },
  'nav.recordings': { en: 'Recordings', zh: '录像' },
  'nav.secrets': { en: 'Secrets', zh: '凭据' },
  'nav.audit': { en: 'Audit', zh: '审计' },
  'nav.workers': { en: 'Workers', zh: '节点' },
  'nav.tenants': { en: 'Workspaces', zh: '空间' },

  // ── common ──────────────────────────────────────────────────────────────
  'common.refresh': { en: 'Refresh', zh: '刷新' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.confirm': { en: 'Confirm', zh: '确认' },
  'common.save': { en: 'Save', zh: '保存' },
  'common.export': { en: 'Export', zh: '导出' },
  'common.new': { en: 'New', zh: '新建' },
  'common.search': { en: 'Search', zh: '搜索' },
  'common.loading': { en: 'Loading…', zh: '加载中…' },
  'common.empty': { en: 'No data', zh: '暂无数据' },
};
