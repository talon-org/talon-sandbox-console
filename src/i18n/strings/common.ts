/* src/i18n/strings/common.ts — shared action labels and status words */
export const common = {
  'common.new':            { en: 'New', zh: '新建' },
  'common.cancel':         { en: 'Cancel', zh: '取消' },
  'common.save':           { en: 'Save', zh: '保存' },
  'common.refresh':        { en: 'Refresh', zh: '刷新' },
  'common.export':         { en: 'Export', zh: '导出' },
  'common.filter':         { en: 'Filter', zh: '筛选' },
  'common.search':         { en: 'Search', zh: '搜索' },
  'common.viewAll':        { en: 'View all', zh: '查看全部' },
  'common.back':           { en: 'Back', zh: '返回' },
  'common.delete':         { en: 'Delete', zh: '删除' },
  'common.kill':           { en: 'Kill', zh: '终止' },
  'common.restart':        { en: 'Restart', zh: '重启' },
  'common.pause':          { en: 'Pause', zh: '暂停' },
  'common.terminal':       { en: 'Terminal', zh: '终端' },
  'common.copy':           { en: 'Copy', zh: '复制' },
  'common.signOut':        { en: 'Sign out', zh: '退出登录' },
  'common.signIn':         { en: 'Sign in', zh: '登录' },
  'common.continue':       { en: 'Continue', zh: '继续' },
  'common.loading':        { en: 'Loading…', zh: '加载中…' },
  'common.empty':          { en: 'No data', zh: '暂无数据' },
  'common.comingSoon':     { en: 'Coming soon', zh: '即将上线' },
  'common.loadFailed':     { en: 'Failed to load', zh: '加载失败' },
  'common.retry':          { en: 'Retry', zh: '重试' },
  'common.recordings':     { en: 'Recordings', zh: '录像' },
  'common.notFound':       { en: 'Not found', zh: '未找到' },

  // ── Sandbox state labels (used by StatusPill + state filters) ────────────
  'state.running':         { en: 'Running', zh: '运行中' },
  'state.pulling-image':   { en: 'Pulling', zh: '拉取镜像' },
  'state.provisioning':    { en: 'Provisioning', zh: '调度中' },
  'state.idle':            { en: 'Idle', zh: '空闲' },
  'state.paused':          { en: 'Paused', zh: '已暂停' },
  'state.terminating':     { en: 'Terminating', zh: '终止中' },
  'state.failed':          { en: 'Failed', zh: '失败' },
  'state.evicted':         { en: 'Evicted', zh: '已驱逐' },
  'state.stopped':         { en: 'Stopped', zh: '已停止' },
  'state.destroyed':       { en: 'Destroyed', zh: '已销毁' },

  // ── Worker status ───────────────────────────────────────────────────────
  'worker.healthy':        { en: 'Healthy', zh: '健康' },
  'worker.draining':       { en: 'Draining', zh: '排空中' },
  'worker.unhealthy':      { en: 'Unhealthy', zh: '异常' },

  // ── Tenant/workspace status ──────────────────────────────────────────────
  'tenant.active':         { en: 'Active', zh: '活跃' },
  'tenant.suspended':      { en: 'Suspended', zh: '已冻结' },
} as const;
