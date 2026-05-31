/* src/i18n/strings/billing.ts — 租户计费页 */
export const billing = {
  'billing.title':            { en: 'Billing', zh: '计费' },
  'billing.desc':             { en: 'Your current plan, usage, and available upgrades. Only owners can change the plan.', zh: '当前套餐、用量与可升级选项。仅 owner 可变更套餐。' },

  'billing.currentPlan':      { en: 'Current plan', zh: '当前套餐' },
  'billing.renewsOn':         { en: 'Renews on', zh: '续费日期' },
  'billing.free':             { en: 'Free', zh: '免费' },
  'billing.current':          { en: 'Current', zh: '当前' },
  'billing.perMonth':         { en: '/mo', zh: '/月' },
  'billing.perYear':          { en: '/yr', zh: '/年' },

  // 订阅状态
  'billing.status.active':    { en: 'Active', zh: '生效中' },
  'billing.status.past_due':  { en: 'Past due', zh: '逾期' },
  'billing.status.canceled':  { en: 'Canceled', zh: '已取消' },
  'billing.status.none':      { en: 'No subscription', zh: '无订阅' },

  // 用量（24h，用量 vs 套餐上限进度条）
  'billing.usageTitle':         { en: 'Usage · last 24h', zh: '近 24 小时用量' },
  'billing.usage.vcpu':         { en: 'vCPU', zh: 'vCPU' },
  'billing.usage.mem':          { en: 'Memory', zh: '内存' },
  'billing.usage.secretsReads': { en: 'Secret reads', zh: 'Secret 读取' },
  'billing.usage.failures':     { en: 'Failures', zh: '失败数' },

  // 套餐卡片配额
  'billing.quota.sandboxes':  { en: 'sandboxes', zh: '沙箱' },
  'billing.quota.vcpu':       { en: 'vCPU', zh: 'vCPU' },
  'billing.quota.mem':        { en: 'GB memory', zh: 'GB 内存' },
  'billing.quota.disk':       { en: 'GB disk', zh: 'GB 磁盘' },

  // 套餐卡片标记
  'billing.recommended':      { en: 'Recommended', zh: '推荐' },
  'billing.currentBtn':       { en: 'Current plan', zh: '当前套餐' },

  // 操作
  'billing.choosePlan':       { en: 'Upgrade', zh: '升级' },
  'billing.switchPlan':       { en: 'Switch', zh: '切换' },
  'billing.downgrade':        { en: 'Downgrade', zh: '降级' },
  'billing.switchedTo':       { en: 'Switched to {plan}', zh: '已切换到 {plan}' },
  'billing.upgradeFailed':    { en: 'Failed to change plan', zh: '套餐变更失败' },
  'billing.ownerOnly':        { en: 'Only the workspace owner can change the plan.', zh: '仅空间 owner 可变更套餐。' },
} as const;
