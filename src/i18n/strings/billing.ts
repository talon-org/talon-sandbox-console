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

  // 用量
  'billing.usageTitle':       { en: 'Usage this period', zh: '本周期用量' },
  'billing.usage.vcpuHours':  { en: 'vCPU·hours', zh: 'vCPU·时' },
  'billing.usage.memGbHours': { en: 'GB·hours (mem)', zh: 'GB·时（内存）' },
  'billing.usage.sandboxHours': { en: 'sandbox·hours', zh: '沙箱·时' },
  'billing.usage.requests':   { en: 'requests', zh: '请求数' },

  // 套餐卡片配额
  'billing.quota.sandboxes':  { en: 'sandboxes', zh: '沙箱' },
  'billing.quota.vcpu':       { en: 'vCPU', zh: 'vCPU' },
  'billing.quota.mem':        { en: 'GB memory', zh: 'GB 内存' },
  'billing.quota.disk':       { en: 'GB disk', zh: 'GB 磁盘' },

  // 操作
  'billing.choosePlan':       { en: 'Choose plan', zh: '选择套餐' },
  'billing.switchPlan':       { en: 'Switch', zh: '切换' },
  'billing.switchedTo':       { en: 'Switched to {plan}', zh: '已切换到 {plan}' },
  'billing.upgradeFailed':    { en: 'Failed to change plan', zh: '套餐变更失败' },
  'billing.ownerOnly':        { en: 'Only the workspace owner can change the plan.', zh: '仅空间 owner 可变更套餐。' },
} as const;
