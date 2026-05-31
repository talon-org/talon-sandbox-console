/* src/i18n/strings/billing.ts — 租户计费页 */
export const billing = {
  'billing.title':            { en: 'Plans & Billing', zh: '套餐与计费' },
  'billing.desc':             { en: 'Choose the plan that fits your workload. Only owners can change the plan.', zh: '选择匹配你工作负载的套餐。仅 owner 可变更套餐。' },

  'billing.currentPlan':      { en: 'Current plan', zh: '当前套餐' },
  'billing.renewsOn':         { en: 'Renews', zh: '续费' },
  'billing.free':             { en: 'Free', zh: '免费' },
  'billing.current':          { en: 'Current', zh: '当前' },
  'billing.perMonth':         { en: '/mo', zh: '/月' },
  'billing.perYear':          { en: '/yr', zh: '/年' },
  'billing.forever':          { en: 'forever', zh: '永久' },

  // 订阅状态
  'billing.status.active':    { en: 'Active', zh: '生效中' },
  'billing.status.past_due':  { en: 'Past due', zh: '逾期' },
  'billing.status.canceled':  { en: 'Canceled', zh: '已取消' },
  'billing.status.none':      { en: 'No subscription', zh: '免费版' },

  // 当前用量(本周期),只展示有上限的维度
  'billing.usageThisPeriod':  { en: 'Usage this period', zh: '本周期用量' },
  'billing.usage.vcpu':       { en: 'vCPU', zh: 'vCPU' },
  'billing.usage.mem':        { en: 'Memory', zh: '内存' },
  'billing.usage.secretsReads': { en: 'Secret reads', zh: 'Secret 读取' },
  'billing.usage.failures':   { en: 'Failures', zh: '失败数' },
  'billing.usage.unlimited':  { en: 'Unlimited', zh: '不限' },
  'billing.usageEmpty':       { en: 'No usage limits on the free plan.', zh: '免费版无用量上限。' },

  // 套餐定位 tagline(按 code)
  'billing.tagline.free':       { en: 'Kick the tires, no card required.', zh: '免费试用,无需绑卡。' },
  'billing.tagline.starter':    { en: 'For solo builders shipping side projects.', zh: '适合独立开发者跑边车项目。' },
  'billing.tagline.team':       { en: 'For teams running real workloads.', zh: '适合团队承载真实负载。' },
  'billing.tagline.enterprise': { en: 'Scale, isolation, and priority support.', zh: '规模、隔离与优先支持。' },
  'billing.tagline.generic':    { en: 'Everything you need to scale.', zh: '扩容所需的一切。' },

  // 套餐卡片配额(作为「包含的能力」陈列)
  'billing.quota.sandboxes':  { en: 'concurrent sandboxes', zh: '并发沙箱' },
  'billing.quota.vcpu':       { en: 'vCPU', zh: 'vCPU' },
  'billing.quota.mem':        { en: 'GB memory', zh: 'GB 内存' },
  'billing.quota.disk':       { en: 'GB disk', zh: 'GB 磁盘' },

  // 套餐卡片标记
  'billing.recommended':      { en: 'Most popular', zh: '最受欢迎' },
  'billing.currentBtn':       { en: 'Your current plan', zh: '当前套餐' },

  // 操作
  'billing.choosePlan':       { en: 'Upgrade', zh: '升级' },
  'billing.switchPlan':       { en: 'Switch to this', zh: '切换' },
  'billing.downgrade':        { en: 'Downgrade', zh: '降级' },
  'billing.switchedTo':       { en: 'Switched to {plan}', zh: '已切换到 {plan}' },
  'billing.upgradeFailed':    { en: 'Failed to change plan', zh: '套餐变更失败' },
  'billing.ownerOnly':        { en: 'Only the workspace owner can change the plan.', zh: '仅空间 owner 可变更套餐。' },
} as const;
