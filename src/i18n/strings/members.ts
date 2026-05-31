/* src/i18n/strings/members.ts — 团队成员管理页 + 接受邀请页 */
export const members = {
  // ── 页面头 ────────────────────────────────────────────────────────────────
  'members.title':            { en: 'Members', zh: '成员' },
  'members.desc':             { en: 'Manage who can access this workspace and their roles. Only owners can invite or change roles.', zh: '管理可访问此空间的成员及其角色。仅 owner 可邀请成员或修改角色。' },
  'members.invite':           { en: 'Invite member', zh: '邀请成员' },

  // ── 角色名 ────────────────────────────────────────────────────────────────
  'members.role.owner':       { en: 'Owner', zh: '所有者' },
  'members.role.developer':   { en: 'Developer', zh: '开发者' },
  'members.role.viewer':      { en: 'Viewer', zh: '只读' },

  // ── 列表列头 ──────────────────────────────────────────────────────────────
  'members.colMember':        { en: 'Member', zh: '成员' },
  'members.colRole':          { en: 'Role', zh: '角色' },
  'members.colStatus':        { en: 'Status', zh: '状态' },
  'members.colJoined':        { en: 'Joined', zh: '加入时间' },

  // ── 行内操作 ──────────────────────────────────────────────────────────────
  'members.remove':           { en: 'Remove', zh: '移除' },
  'members.removeTitle':      { en: 'Remove member?', zh: '确认移除成员？' },
  'members.removeBody':       { en: 'This member will immediately lose access to the workspace. They can be re-invited later.', zh: '该成员将立即失去对此空间的访问权限，之后可重新邀请。' },
  'members.removeConfirm':    { en: 'Remove', zh: '移除' },
  'members.removeSuccess':    { en: 'Member removed', zh: '成员已移除' },
  'members.roleUpdated':      { en: 'Role updated', zh: '角色已更新' },
  'members.roleChangeFailed': { en: 'Failed to update role', zh: '角色更新失败' },

  // ── 状态 ──────────────────────────────────────────────────────────────────
  'members.statusActive':     { en: 'Active', zh: '活跃' },

  // ── 空状态 ────────────────────────────────────────────────────────────────
  'members.empty.head':       { en: 'No members yet', zh: '尚无成员' },
  'members.empty.desc':       { en: 'Invite teammates to collaborate in this workspace.', zh: '邀请团队成员加入此空间协作。' },

  // ── 权限提示 banner（非 owner） ────────────────────────────────────────────
  'members.viewerNote':       { en: 'Only owners can invite members or change roles.', zh: '仅 owner 可邀请成员或修改角色。' },

  // ── 邀请对话框 ────────────────────────────────────────────────────────────
  'members.inviteTitle':      { en: 'Invite member', zh: '邀请成员' },
  'members.inviteEmail':      { en: 'Email', zh: '邮箱' },
  'members.inviteEmailPlaceholder': { en: 'teammate@example.com', zh: 'teammate@example.com' },
  'members.inviteRole':       { en: 'Role', zh: '角色' },
  'members.inviteRoleHint':   { en: 'Developers can manage sandboxes & keys. Viewers are read-only. Owners can manage members.', zh: 'developer 可管理 sandbox 与 Key；viewer 只读；owner 可管理成员。' },
  'members.inviteSubmit':     { en: 'Send invitation', zh: '发送邀请' },
  'members.inviteSuccess':    { en: 'Invitation sent', zh: '邀请已发送' },
  'members.inviteFailed':     { en: 'Failed to send invitation', zh: '邀请发送失败' },

  // ── accept_url 手动复制（后端未配邮件时） ─────────────────────────────────
  'members.inviteLinkTitle':  { en: 'Share this invite link', zh: '把邀请链接发给对方' },
  'members.inviteLinkDesc':   { en: 'Email delivery is not configured. Copy this link and send it to the invitee manually.', zh: '后端未配置邮件发送。请复制此链接手动发给被邀请人。' },
  'members.inviteLinkCopy':   { en: 'Copy link', zh: '复制链接' },
  'members.inviteLinkCopied': { en: 'Link copied', zh: '链接已复制' },

  // ── 待处理邀请列表 ────────────────────────────────────────────────────────
  'members.pending.title':    { en: 'Pending invitations', zh: '待处理邀请' },
  'members.pending.colEmail': { en: 'Email', zh: '邮箱' },
  'members.pending.colRole':  { en: 'Role', zh: '角色' },
  'members.pending.colExpires': { en: 'Expires', zh: '过期时间' },
  'members.pending.copyLink': { en: 'Copy invite link', zh: '复制邀请链接' },
  'members.pending.revoke':   { en: 'Revoke invitation', zh: '撤销邀请' },
  'members.pending.revokeTitle':   { en: 'Revoke invitation?', zh: '撤销邀请？' },
  'members.pending.revokeBody':    { en: 'The invite link will stop working. You can send a new invitation later.', zh: '该邀请链接将立即失效，之后可重新发送邀请。' },
  'members.pending.revokeConfirm': { en: 'Revoke', zh: '撤销' },
  'members.pending.revokeSuccess': { en: 'Invitation revoked', zh: '邀请已撤销' },
  'members.pending.empty':    { en: 'No pending invitations', zh: '暂无待处理邀请' },

  // ── 接受邀请页 ────────────────────────────────────────────────────────────
  'accept.title':             { en: 'Accept invitation', zh: '接受邀请' },
  'accept.subtitle':          { en: 'Join your team on Talon Sandbox', zh: '加入团队的 Talon Sandbox 空间' },
  'accept.nameLabel':         { en: 'Your name (optional)', zh: '你的名字（可选）' },
  'accept.namePlaceholder':   { en: 'Jane Doe', zh: '张三' },
  'accept.submit':            { en: 'Accept invitation', zh: '接受邀请' },
  'accept.missingToken':      { en: 'Invalid invitation link — the token is missing.', zh: '邀请链接无效 —— 缺少 token。' },
  'accept.failed':            { en: 'Could not accept this invitation. It may have expired or been revoked.', zh: '无法接受此邀请，可能已过期或被撤销。' },
  'accept.successTitle':      { en: 'Invitation accepted', zh: '已接受邀请' },
  'accept.successDesc':       { en: 'Sign in with this email to access your new workspace.', zh: '使用此邮箱登录即可访问新空间。' },
  'accept.goToLogin':         { en: 'Continue to sign in', zh: '前往登录' },
} as const;
