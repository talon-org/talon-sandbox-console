/* src/i18n/strings/settings.ts — 账户设置页 */
export const settings = {
  'settings.title':        { en: 'Account settings', zh: '账户设置' },
  'settings.desc':         { en: 'Manage your profile and preferences.', zh: '管理你的个人资料与偏好。' },

  // ── 个人资料 ──
  'settings.profile':      { en: 'Profile', zh: '个人资料' },
  'settings.profileDesc':  { en: 'Your display name is shown across all your workspaces.', zh: '显示名在你所有空间里通用。' },
  'settings.displayName':  { en: 'Display name', zh: '显示名' },
  'settings.namePlaceholder': { en: 'How should we call you?', zh: '希望我们怎么称呼你?' },
  'settings.email':        { en: 'Email', zh: '邮箱' },
  'settings.emailHint':    { en: 'Used to sign in. Contact support to change it.', zh: '用于登录。如需变更请联系支持。' },
  'settings.role':         { en: 'Role', zh: '角色' },
  'settings.memberSince':  { en: 'Member since', zh: '加入时间' },
  'settings.saveProfile':  { en: 'Save profile', zh: '保存资料' },
  'settings.profileSaved': { en: 'Profile saved', zh: '资料已保存' },

  // ── 偏好 ──
  'settings.prefs':        { en: 'Preferences', zh: '偏好' },
  'settings.prefsDesc':    { en: 'These follow your account across devices.', zh: '这些偏好会跟随账户跨设备同步。' },
  'settings.language':     { en: 'Language', zh: '语言' },
  'settings.lang.en':      { en: 'English', zh: 'English' },
  'settings.lang.zh':      { en: '简体中文', zh: '简体中文' },
  'settings.appearance':   { en: 'Appearance', zh: '外观' },
  'settings.mode.dark':    { en: 'Dark', zh: '深色' },
  'settings.mode.light':   { en: 'Light', zh: '浅色' },
  'settings.savePrefs':    { en: 'Save preferences', zh: '保存偏好' },
  'settings.prefsSaved':   { en: 'Preferences saved', zh: '偏好已保存' },

  'settings.saveFailed':   { en: 'Save failed', zh: '保存失败' },

  // ── 工作区设置(管理员) ──
  'org.title':         { en: 'Workspace settings', zh: '工作区设置' },
  'org.desc':          { en: 'Manage your workspace. Only admins can make changes.', zh: '管理你的工作区。仅管理员可变更。' },
  'org.general':       { en: 'General', zh: '基本信息' },
  'org.name':          { en: 'Workspace name', zh: '工作区名称' },
  'org.namePlaceholder': { en: 'e.g. Acme Inc', zh: '例如:某某科技' },
  'org.id':            { en: 'Workspace ID', zh: '工作区 ID' },
  'org.plan':          { en: 'Plan', zh: '套餐' },
  'org.members':       { en: 'Members', zh: '成员' },
  'org.createdAt':     { en: 'Created', zh: '创建时间' },
  'org.viewMembers':   { en: 'Manage members', zh: '管理成员' },
  'org.viewBilling':   { en: 'View plans & billing', zh: '套餐与计费' },
  'org.save':          { en: 'Save', zh: '保存' },
  'org.saved':         { en: 'Workspace updated', zh: '工作区已更新' },
  'org.saveFailed':    { en: 'Update failed', zh: '更新失败' },
  'org.ownerOnly':     { en: 'Only the workspace admin can change these settings.', zh: '仅工作区管理员可变更这些设置。' },
} as const;
