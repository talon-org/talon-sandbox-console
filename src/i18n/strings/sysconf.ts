/* src/i18n/strings/sysconf.ts — 超管平台配置中心(Spec 52)文案 */
export const sysconf = {
  'sysconf.title':            { en: 'System Config', zh: '系统配置' },
  'sysconf.desc':             { en: 'Platform runtime settings. Changes take effect immediately — no restart.', zh: '平台运行时配置,修改后即时生效,无需重启。' },
  'sysconf.save':             { en: 'Save changes', zh: '保存修改' },
  'sysconf.saved':            { en: 'Settings saved', zh: '配置已保存' },
  'common.saving':            { en: 'Saving…', zh: '保存中…' },

  // 邮件
  'sysconf.email.title':         { en: 'Email Delivery', zh: '邮件服务' },
  'sysconf.email.provider':      { en: 'Provider', zh: '服务商' },
  'sysconf.email.providerHint':  { en: 'Selects how verification-code emails are sent.', zh: '决定验证码邮件如何发送。' },
  'sysconf.email.providerNone':  { en: 'None (log only)', zh: '不启用(仅日志)' },
  'sysconf.email.from':          { en: 'From address', zh: '发件地址' },
  'sysconf.email.fromHint':      { en: 'Must be under a domain verified at your provider.', zh: '须为服务商已验证发件域下的地址。' },
  'sysconf.email.apiKey':        { en: 'API key', zh: 'API 密钥' },
  'sysconf.email.returnPath':    { en: 'Return-Path (SparkPost)', zh: '信封发件人(SparkPost)' },
  'sysconf.email.returnPathHint':{ en: 'Bounce address; same domain as From for best deliverability.', zh: '退信地址,与发件地址同域投递率最佳。' },
  'sysconf.email.apiBase':       { en: 'API base URL', zh: 'API 基址' },

  // 限流
  'sysconf.rl.title':   { en: 'Rate Limiting', zh: '速率限流' },
  'sysconf.rl.rps':     { en: 'Requests / sec per tenant', zh: '每租户每秒请求数' },
  'sysconf.rl.rpsHint': { en: '0 = unlimited.', zh: '0 = 不限流。' },
  'sysconf.rl.burst':   { en: 'Burst', zh: '突发上限' },
  'sysconf.rl.burstHint':{ en: '0 = fall back to RPS.', zh: '0 = 取每秒请求数兜底。' },

  // 自动驾驶
  'sysconf.pilot.title':        { en: 'Autopilots', zh: '自动驾驶' },
  'sysconf.pilot.autopilot':    { en: 'Auto-reassign dead workers', zh: '故障节点自动迁移' },
  'sysconf.pilot.autopilotHint':{ en: 'Reassign sandboxes off a dead worker to a live one.', zh: '把故障节点上的 sandbox 自动迁移到健康节点。' },
  'sysconf.pilot.lifecycle':    { en: 'Lifecycle auto-stop', zh: '生命周期自动停止' },
  'sysconf.pilot.lifecycleHint':{ en: 'Auto pause/destroy idle or expired sandboxes.', zh: '对空闲/过期的 sandbox 自动暂停或销毁。' },
  'sysconf.pilot.metering':     { en: 'Usage metering', zh: '用量计量' },
  'sysconf.pilot.meteringHint': { en: 'Accumulate resource-seconds for billing.', zh: '累计资源·秒,计费地基。' },

  // 计费
  'sysconf.billing.title':         { en: 'Billing (Stripe)', zh: '计费(Stripe)' },
  'sysconf.billing.secretKey':     { en: 'Secret key', zh: 'Secret Key' },
  'sysconf.billing.webhookSecret': { en: 'Webhook secret', zh: 'Webhook Secret' },
  'sysconf.billing.prices':        { en: 'Price ID map (JSON)', zh: '价格 ID 映射(JSON)' },
  'sysconf.billing.pricesHint':    { en: 'planCode → Stripe price ID, e.g. {"team":"price_xxx"}.', zh: '套餐码 → Stripe 价格 ID,如 {"team":"price_xxx"}。' },

  // secret 通用
  'sysconf.secret.configured':  { en: 'Configured', zh: '已配置' },
  'sysconf.secret.unset':       { en: 'Not set', zh: '未配置' },
  'sysconf.secret.keepHint':    { en: 'leave blank to keep', zh: '留空则不改' },
  'sysconf.secret.unsetHint':   { en: 'enter value to set', zh: '输入以设置' },
} as const;
