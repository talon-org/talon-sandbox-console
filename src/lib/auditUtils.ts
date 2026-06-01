/* AuditRow / PageAudit 共享的事件分类辅助。
 * 抽到独立文件,避免在 AuditRow.tsx 内非组件 export 触发 Fast Refresh 失效。
 */

/* typeKind 把后端 event_type 归类到 UI 过滤分组。
 *
 * **必须对齐后端真实枚举(internal/observability/audit/audit.go)**:后端用
 * 下划线命名(login_success / jwt_issued / tenant_updated …),不是点分前缀。
 * 之前用 startsWith('auth') 这类假设,导致 login_success/jwt_issued/tenant_* 全
 * 落到未展示的 system 分组,过滤计数与实际事件对不上(全部 4、分组加起来 1)。
 *
 * 分组语义:
 *   sandbox — sandbox 生命周期 + 其内的运行时活动(browser/agent/调度/自愈/录像)
 *   secret  — 凭据全生命周期与绑定/注入
 *   auth    — 登录、令牌签发、API key、验证码、限流(身份与访问)
 *   pty     — 交互式终端会话
 *   image   — baseimage 拉取/预热
 *   system  — 组织/计费/平台配置等运维事件(租户、订阅、平台配置、跨租户代行)
 */
export function typeKind(type: string): string {
  // auth.code_* 是点分;其余下划线。先归一前缀片段。
  if (
    type.startsWith('login') ||
    type.startsWith('jwt') ||
    type.startsWith('apikey') ||
    type.startsWith('auth') ||      // auth.code_requested / auth.code_verified
    type === 'rate_limited'
  ) return 'auth';

  if (type.startsWith('secret')) return 'secret';

  if (type.startsWith('pty')) return 'pty';

  if (type.startsWith('image')) return 'image';

  if (
    type.startsWith('sandbox') ||
    type.startsWith('browser') ||
    type.startsWith('agent') ||
    type.startsWith('recording') ||
    type.startsWith('autopilot') ||
    type.startsWith('scheduler') ||
    type === 'admin_reassign'
  ) return 'sandbox';

  // tenant_* / billing_* / platform_settings_* / admin_tenant_override 等
  // 组织·计费·平台级运维事件。
  return 'system';
}
