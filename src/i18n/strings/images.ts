/* src/i18n/strings/images.ts — 超管镜像管理页文案 */
export const images = {
  'images.title':        { en: 'Images', zh: '镜像' },
  'images.desc':         { en: 'Base images sandboxes boot from. Register, prewarm, and set the default.', zh: '沙箱启动所用的基础镜像。注册、预热、设默认。' },

  // 列表表头
  'images.colName':      { en: 'Name', zh: '名称' },
  'images.colSource':    { en: 'Source', zh: '来源' },
  'images.colArch':      { en: 'OS / Arch', zh: '系统 / 架构' },
  'images.colStatus':    { en: 'Status', zh: '状态' },
  'images.colCreated':   { en: 'Created', zh: '创建于' },

  // 来源 / 默认徽标
  'images.sourceBuiltin': { en: 'builtin', zh: '内置' },
  'images.sourceAdmin':   { en: 'admin', zh: '注册' },
  'images.isDefault':     { en: 'DEFAULT', zh: '默认' },

  // 行内操作
  'images.setDefault':   { en: 'Set default', zh: '设为默认' },
  'images.prewarm':      { en: 'Prewarm', zh: '预热' },
  'images.delete':       { en: 'Delete', zh: '删除' },
  'images.builtinLocked': { en: 'Builtin images cannot be deleted', zh: '内置镜像不可删除' },

  // 预热进度阶段
  'images.stage.pending':     { en: 'Pending', zh: '等待中' },
  'images.stage.downloading': { en: 'Downloading', zh: '下载中' },
  'images.stage.verifying':   { en: 'Verifying', zh: '校验中' },
  'images.stage.extracting':  { en: 'Extracting', zh: '解压中' },
  'images.stage.ready':       { en: 'Ready', zh: '就绪' },
  'images.stage.failed':      { en: 'Failed', zh: '失败' },
  'images.stage.notReady':    { en: 'Not prewarmed', zh: '未预热' },

  // toast
  'images.createSuccess':     { en: 'Image registered', zh: '镜像已注册' },
  'images.deleteSuccess':     { en: 'Image deleted', zh: '镜像已删除' },
  'images.setDefaultSuccess': { en: 'Default image updated', zh: '默认镜像已更新' },
  'images.prewarmStarted':    { en: 'Prewarm started', zh: '已开始预热' },

  // 空态
  'images.empty.head':   { en: 'No images registered', zh: '尚未注册镜像' },
  'images.empty.desc':   { en: 'Register a base image from a published rootfs tarball.', zh: '从已发布的 rootfs tarball 注册一个基础镜像。' },

  // 删除确认
  'images.deleteTitle':  { en: 'Delete image', zh: '删除镜像' },
  'images.deleteBody':   { en: 'Sandboxes referencing this image by name will fail to start until re-registered. This does not affect running sandboxes.', zh: '按名称引用该镜像的沙箱在重新注册前将无法启动。不影响正在运行的沙箱。' },
  'images.deleteConfirm': { en: 'Delete', zh: '删除' },

  // ── 注册抽屉 ──
  'images.create.title':        { en: 'Register image', zh: '注册镜像' },
  'images.create.identity':     { en: 'Identity', zh: '标识' },
  'images.create.artifact':     { en: 'Artifact', zh: '产物' },
  'images.create.submit':       { en: 'Register', zh: '注册' },

  'images.field.nameLabel':     { en: 'Name', zh: '名称' },
  'images.field.namePlaceholder': { en: 'talon-agent-0.1.0', zh: 'talon-agent-0.1.0' },
  'images.field.nameHint':      { en: 'Globally unique. Doubles as the worker cache key. Use a versioned name (talon-agent-0.1.0) so the version-less alias (talon-agent) resolves to the latest.', zh: '全局唯一,同时是 worker 缓存 key。用带版本的名字(talon-agent-0.1.0),无版本别名(talon-agent)会自动指向最新版。' },

  'images.field.urlLabel':      { en: 'Tarball URL', zh: 'Tarball URL' },
  'images.field.urlPlaceholder': { en: 'https://…/talon-agent-0.1.0-x86_64.tar.gz', zh: 'https://…/talon-agent-0.1.0-x86_64.tar.gz' },
  'images.field.urlHint':       { en: 'Must be https on a public host (no private IPs). raw rootfs .tar.gz.', zh: '必须是 https 公网地址(禁私网 IP)。裸 rootfs .tar.gz。' },

  'images.field.sha256Label':   { en: 'SHA-256', zh: 'SHA-256' },
  'images.field.sha256Placeholder': { en: '64 lowercase hex chars', zh: '64 位小写 hex' },
  'images.field.sha256Hint':    { en: 'Auto-fetched from <url>.sha256 when possible — verify it matches the release.', zh: '尽量从 <url>.sha256 自动抓取——请核对与 release 一致。' },
  'images.field.sha256Fetched': { en: 'Auto-filled from .sha256 sibling', zh: '已从 .sha256 同名资产自动填入' },
  'images.field.sha256Invalid': { en: 'Must be 64 lowercase hex characters', zh: '必须是 64 位小写 hex' },

  'images.field.descLabel':     { en: 'Description', zh: '描述' },
  'images.field.descPlaceholder': { en: 'What this image is for (optional)', zh: '这个镜像用途(可选)' },

  'images.field.archLabel':     { en: 'OS / Arch', zh: '系统 / 架构' },
  'images.field.defaultLabel':  { en: 'Set as default', zh: '设为默认' },
  'images.field.defaultHint':   { en: 'New sandboxes without an explicit image use the default.', zh: '未指定镜像的新沙箱使用默认镜像。' },
} as const;
