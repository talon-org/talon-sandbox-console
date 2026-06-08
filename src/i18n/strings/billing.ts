/* src/i18n/strings/billing.ts — 套餐与计费页(移植自 Claude Design 原型) */
export const billing = {
  'billing.title':            { en: 'Plans & Billing', zh: '套餐与计费' },
  'billing.desc':             { en: 'Choose the plan that fits your workload. Billed on the selected cycle; changes take effect immediately and are prorated.', zh: '选择匹配你工作负载的套餐。计费按所选周期结算,变更立即生效、差额按比例计算。' },

  // 计费周期切换
  'billing.monthly':          { en: 'Monthly', zh: '月付' },
  'billing.annual':           { en: 'Annual', zh: '年付' },
  'billing.annualOff':        { en: 'Annual −20%', zh: '年付 −20%' },

  // 当前套餐条
  'billing.currentPlan':      { en: 'Current plan', zh: '当前套餐' },
  'billing.free':             { en: 'Free', zh: '免费' },
  'billing.freeTier':         { en: 'Free tier', zh: '免费版' },
  'billing.subscribed':       { en: 'Subscribed', zh: '已订阅' },
  'billing.freeForever':      { en: 'Free · forever', zh: '免费 · 永久' },
  'billing.perMonthBilled':   { en: '/ mo · next renewal 2026-06-30', zh: '/ 月 · 下次续费 2026-06-30' },
  'billing.perYearBilled':    { en: '/ yr billed', zh: '/ 年结算' },

  // 订阅状态(banner badge)
  'billing.status.active':    { en: 'Active', zh: '生效中' },
  'billing.status.past_due':  { en: 'Past due', zh: '逾期' },
  'billing.status.canceled':  { en: 'Canceled', zh: '已取消' },
  'billing.status.none':      { en: 'Free tier', zh: '免费版' },

  // 当前用量 meters
  'billing.usage.sandboxes':    { en: 'Concurrent sandboxes', zh: '并发沙箱' },
  'billing.usage.secretsReads': { en: 'Secret reads', zh: 'Secret 读取' },
  'billing.usage.failures':     { en: 'Failures', zh: '失败数' },

  // 套餐卡:价格/周期
  'billing.perMonth':         { en: '/mo', zh: '/月' },
  'billing.annualPerMonth':   { en: 'annual: $/mo', zh: '年付每月' },
  'billing.save20':           { en: 'save 20%', zh: '省 20%' },

  // 套餐定位 tagline(按 code)
  'billing.tagline.free':       { en: 'Kick the tires, no card required.', zh: '免费试用,无需绑卡。' },
  'billing.tagline.starter':    { en: 'For solo builders shipping side projects.', zh: '适合独立开发者跑边车项目。' },
  'billing.tagline.team':       { en: 'For teams running real workloads.', zh: '适合团队承载真实负载。' },
  'billing.tagline.enterprise': { en: 'Scale, isolation, and priority support.', zh: '规模、隔离与优先支持。' },
  'billing.tagline.generic':    { en: 'Everything you need to scale.', zh: '扩容所需的一切。' },

  // 套餐卡:配额(spec 行)
  'billing.quota.sandboxes':  { en: 'sandboxes', zh: '并发沙箱' },
  'billing.quota.vcpu':       { en: 'vCPU', zh: 'vCPU' },
  'billing.quota.mem':        { en: 'GB memory', zh: 'GB 内存' },
  'billing.quota.disk':       { en: 'GB disk', zh: 'GB 磁盘' },

  // 套餐卡:标记 + CTA
  'billing.recommended':      { en: 'Most popular', zh: '最受欢迎' },
  'billing.current':          { en: 'Current', zh: '当前' },
  'billing.currentBtn':       { en: 'Current plan', zh: '当前套餐' },
  'billing.choosePlan':       { en: 'Upgrade', zh: '升级' },
  'billing.switchPlan':       { en: 'Switch', zh: '切换' },
  'billing.contactSales':     { en: 'Contact sales', zh: '联系销售' },

  // toast
  'billing.switchedTo':       { en: 'Switched to {plan}', zh: '套餐已切换到 {plan}' },
  'billing.upgradeFailed':    { en: 'Failed to change plan', zh: '套餐变更失败' },
  'billing.enterpriseToast':  { en: 'Noted — our sales team will reach out within 1 business day.', zh: '已记录 · 销售团队会在 1 个工作日内联系你' },

  // 切换确认对话框
  'billing.confirmTitle':     { en: 'Change plan', zh: '变更套餐' },
  'billing.confirmFrom':      { en: 'Change from', zh: '从' },
  'billing.confirmTo':        { en: 'to', zh: '变更到' },
  'billing.confirmBilled':    { en: 'billed {period} at ${price}/mo.', zh: '按 {period} 结算 ${price}/月。' },
  'billing.confirmDowngrade': { en: 'downgrading to the free plan.', zh: '降级为免费套餐。' },
  'billing.effectiveAt':      { en: 'Effective', zh: '生效时间' },
  'billing.effectiveProrated':{ en: 'immediately · prorated', zh: '立即 · 差额按比例' },
  'billing.confirmBtn':       { en: 'Confirm change', zh: '确认变更' },
  'billing.unit.count':       { en: '', zh: '个' },

  // 页脚
  'billing.ownerOnly':        { en: 'Only the workspace admin can change the plan.', zh: '仅工作区管理员可变更套餐。' },

  // ── 按终端用户用量 ──────────────────────────────────────────────────────────
  'billing.byLabel.title':         { en: 'Usage by End User', zh: '按终端用户用量' },
  'billing.byLabel.desc':          { en: 'Resource usage grouped by label. Useful for billing end users in your integration.', zh: '按标签（label）归因的资源用量，适合对你的集成用户进行二次计费分账。' },
  'billing.byLabel.labelKey':      { en: 'Split dimension', zh: '拆分维度' },
  'billing.byLabel.labelKeyValue': { en: 'Current key: {key}', zh: '当前维度：{key}' },
  'billing.byLabel.noKey':         { en: 'No split dimension configured', zh: '未配置拆分维度' },
  'billing.byLabel.noKeyDesc':     { en: 'Set a label key (e.g. end_user_id) to see per-user usage. Only workspace owner can configure.', zh: '设置一个 label key（如 end_user_id）后，此处将按终端用户展示资源用量。仅工作区拥有者可配置。' },
  'billing.byLabel.configure':     { en: 'Configure split dimension', zh: '配置拆分维度' },
  'billing.byLabel.keyPlaceholder':{ en: 'e.g. end_user_id', zh: '如 end_user_id' },
  'billing.byLabel.save':          { en: 'Save', zh: '保存' },
  'billing.byLabel.saveSuccess':   { en: 'Split dimension saved', zh: '拆分维度已保存' },
  'billing.byLabel.saveFailed':    { en: 'Failed to save split dimension', zh: '拆分维度保存失败' },
  'billing.byLabel.colUser':       { en: 'End user', zh: '终端用户' },
  'billing.byLabel.colCpu':        { en: 'CPU (core·s)', zh: 'CPU（核·秒）' },
  'billing.byLabel.colMemory':     { en: 'Memory (GB·s)', zh: '内存（GB·秒）' },
  'billing.byLabel.colDisk':       { en: 'Disk (GB·s)', zh: '磁盘（GB·秒）' },
  'billing.byLabel.colSandbox':    { en: 'Sandbox (s)', zh: '沙箱（秒）' },
  'billing.byLabel.empty':         { en: 'No usage data for this period', zh: '当前时段暂无用量数据' },
  'billing.byLabel.dateRange':     { en: 'Date range', zh: '日期范围' },
  'billing.byLabel.disable':       { en: 'Disable (empty key)', zh: '关闭（清空 key）' },
} as const;
