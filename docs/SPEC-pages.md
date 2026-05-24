# Talon Sandbox Console — 每页规约 (explorer 原文)

> 由 explorer subagent 读完 `.design-source/project/app/page-*.jsx` + shell + ui + i18n 后逐页产出。
> 实现时按本文件 1:1 还原, 不允许自创布局/控件/文案。

## Page: Login

- **路由路径**: `/login`, full-bleed (无 shell), `position: fixed; inset: 0`
- **结构**: 两列 grid (`1.1fr 1fr`), `<900px` 右列隐藏
  - **左列** `.login-left` (`bg-0`, subtle 32px 网格背景图案, mask radial-gradient):
    1. brand-row: `Mark(20)` + wordmark "talon" + badge "agent sandbox runtime"
    2. spacer (flex: 1)
    3. tagline (38px, 字重 600, -0.03em): 硬编码中文 "为 AI agent 准备的 一台 **随用随启** 的计算机。" (accent 色高亮)
    4. sub: 描述文字 (90ms 拉起沙箱…)
    5. code-block (`bg-1` 背景, mono, Python 示例代码含语法高亮 span: c-com/c-key/c-str/c-fn/c-num)
    6. foot: 三个统计数字 (活跃 sandbox 12,418 / 平均冷启动 87ms / 区域 3) — **写死数字, 原型占位**
  - **右列** `.login-right` (居中 card, max-width 380px):
    1. h1 + sub 标题
    2. 双 tab 切换器 (邮箱 / API key), 自定义样式 (非 TlnTabs), border 1px + padding 2px + border-radius var(--r-2)
    3. 邮箱 tab: `TlnField` × 2 (邮箱 + 密码), 密码右侧 "忘记？" 链接
    4. API key tab: 单 `TlnField`, hint "格式: tlk_… · 权限继承自 key", mono input, placeholder `tlk_•••`
    5. `TlnButton` primary lg 全宽提交 (登录中… -> go('/dashboard'), 600ms delay)
    6. sso-divider "或使用" (伪元素横线)
    7. GitHub + Google OAuth 按钮 (inline SVG logo, 全宽)
    8. footer-link "没有账号？申请试用" (toast 触发)
- **交互**: submit -> 真实调用 `POST /v1/auth/login` -> 拿 JWT cookie -> `GET /v1/auth/me` -> 写 store -> `navigate('/dashboard')`

## Page: Dashboard

- **路由路径**: `/dashboard`
- **结构** (page-body):
  1. `PageHeader`: eyebrow="概览", title="欢迎回来, **{me.name}**" (accent 色高亮名字), desc 说明, actions=刷新+新建 sandbox
  2. **metrics grid** `.dash-grid` (4 列, `<1200px` 变 2 列, gap 14px): 4 个 `Metric` card (每个是 `TlnCard` 包裹的 `.dash-metric`)
     - 运行中 sandbox: 值=18, sparkline (30点), delta badge "24h +3" (neut)
     - vCPU 占用: 值=14.8 vCPU / 48, sparkline, delta "+2.1 vCPU" (neut)
     - 内存: 值=42 GiB / 96, sparkline (info 色), delta "+1.4 GiB" (neut)
     - 出站流量: 值=4.2 MB/s, sparkline (info 色), delta "24h -12%" (bad = err 色)
     - `useCount` hook: mount 时从 0 count-up 到目标值 (700ms, cubic-ease-out)
  3. **`.dash-2col`** (`1.4fr 1fr`, gap 14px, `<1100px` 单列):
     - 左: `TlnCard` "Sandbox 状态总览": `StatesOverview` (水平堆积 bar 8px 高 + 4×2 legend grid) + 右上角 "刚刚更新"
     - 右: `TlnCard` "配额 · 24h": 4 个 `TlnProgress` row (vCPU / 内存 / Secret 访问-magenta / 失败-err)
  4. **第二个 `.dash-2col`**:
     - 左: `TlnCard` "最近活动": `RecentActivity` (grid 3列: dot 12px / time 70px / text) + 右上角 "查看全部" 按钮 -> `/audit`
     - 右: `TlnCard` "运行中 N": `RunningList` (点击行 -> `/sandboxes/:id`), 显示 running + pulling-image 状态
- **状态颜色常量** (`STATE_COLORS`): running=ok / pulling-image=warn / provisioning=warn / terminating=warn / idle=fg-3 / paused=fg-4 / failed=err / evicted=fg-4

## Page: Sandboxes

- **路由路径**: `/sandboxes`
- **结构**:
  1. `PageHeader`: eyebrow="工作区", title="沙箱", num="{active} 运行中 / {total} 总数", actions=刷新+新建
  2. `.sbx-filters` (flex wrap):
     - 两组 segmented button 组 (不使用 `TlnSegmented`, 自定义 `.sbx-filter` 样式): 全部/活跃 | 运行中/拉取中/空闲/失败, 每个 button 右侧显示 count
     - 弹性间隔
     - `TlnInput` 搜索 (width 280px, leadIcon="search", placeholder "按 id / 名称 / 镜像 过滤…")
     - `TlnButton` ghost iconOnly filter (列过滤, **无实际功能**)
  3. `.tln-tbl`: 7列 (`.sbx-row`, grid-template-columns: `1.6fr 1.2fr 1fr 0.7fr 1.1fr 0.9fr 60px`)
     - 表头: Sandbox / 镜像 / 租户 / 运行时长 / 资源 / 状态 / (空)
     - 每行点击 -> `/sandboxes/:id`
     - Sandbox 列: 彩色 iddot (5×5px) + id + name·task (截断)
     - 资源列: pulling-image 状态显示 `TlnProgress` + 百分比, 其他显示 `{cpuLimit}v · {memGiB}G`
     - 状态列: `TlnStateBadge`
     - 末列: 更多按钮 (无功能)
     - 空状态: `TlnEmpty`
  4. `CreateSandboxDrawer` (`TlnDrawer`, width=580)
- **URL 触发**: hash 包含 `new=1` 时自动打开 Drawer
- **CreateSandboxDrawer 表单** (5个 form-sect):
  1. 基本信息: 名称 (留空=自动) + 租户 (TlnSelect) + 镜像 (TlnInput mono) + 8个预设镜像快捷按钮
  2. 资源: vCPU/内存/磁盘 range slider (1-16 / 1-32 / 4-64, step 1/1/4), 实时显示当前值
  3. 网络策略: 3个 radio card (全允许/白名单/全阻断); 白名单时展示 `TlnTextarea` 输入主机列表
  4. 凭据: chip-multi (已选项可删除, 从 TLNData.secrets 添加)
  5. 环境变量: `TlnTextarea` (key=value 每行一个)
  - Footer: 预估费用 (`$0.xxx/小时`, 公式 `cpu * mem * 0.012`) + 取消/启动按钮

## Page: Sandbox Detail

- **路由路径**: `/sandboxes/:id`
- **结构** (无 PageHeader, 自定义 head):
  1. `.sbx-detail-head` (padding 24px 32px 16px):
     - 左: id (font-mono 22px) + `TlnStateBadge` + `TlnTag` (租户)
     - 下行: box icon + name + · + image (mono fg-3)
     - 右: 操作按钮组: 终端(`⌘T`) / 录像 / 重启 (ghost iconOnly) / 暂停 (ghost iconOnly) / **终止 (danger)**
  2. `.sbx-info-row` (水平 flex, 各信息项: 节点/区域/启动时间/运行时长/资源/磁盘, mono 12px)
  3. `.sbx-tabs-wrap` (padding 0 32px, border-bottom): `TlnTabs` 6个 tab: 概览/进程(count)/端口(count)/文件/网络/审计(count)
  4. `.sbx-tab-body` (padding 20px 32px 56px): tab 内容区
- **Tab: 概览**:
  - 如有 task: `TlnCard` "当前任务" (任务文字 + agent 名 (magenta) + 耗时 + 命令数, action="打开 shell" -> terminal)
  - `.sbx-2col` (1.4fr 1fr):
    - 左: `TlnCard` "资源使用", action="最近 60s · 实时", 4个 `ResRow` (vCPU/内存/磁盘-teal/出站-info)
    - 右: `TlnCard` "端口" (port-list, 每项显示 :port / proto badge / label+url / exposed dot), action="+" iconOnly
  - `TlnCard` "挂载的凭据": magenta 色 chip 列表 (key icon + name), action="管理" -> `/secrets`
- **Tab: 进程**: `TlnCard` padded={false}, table 5列 (PID/进程/命令/CPU/内存), `.proc-row` grid `60px 1.5fr 2fr 0.6fr 0.7fr`, no-click
- **Tab: 端口**: `TlnCard` "暴露的端口", action="暴露端口" primary sm, port-list 同概览
- **Tab: 文件**: `.sbx-2col`, 左=文件树 (`/workspace`, folder/fileText 图标, active 高亮 acc-soft), 右=文件内容 (`<pre class="tln-code">`) + 复制路径按钮
- **Tab: 网络**: `.sbx-2col`, 左=网络策略 (`TlnKV` + 白名单主机列表 `hostlist` ✓/✕), 右=最近拦截请求列表 (4个写死主机名, `blocked` 样式 err 色 `✕`)
- **Tab: 审计**: `TlnCard` padded={false}, table 5列 (时间/事件/发起者/目标·元信息/结果), `aud-row` 相同样式, `.no-click`
- **终止确认 Dialog**: `TlnDialog`, title 含 sandbox id (err 色), body 说明保留文件/录像, actions=取消+终止(danger)

## Page: Terminal

- **路由路径**: `/sandboxes/:id/terminal`, **full-bleed**
- **结构** (`.term-page`, fixed inset 0, flex column):
  1. `.term-chrome-top` (高 44px, border-bottom): 返回按钮 + 垂直分割线 + info 区 (绿点 + sandbox id + "主 shell" + task 截断) + 右侧 actions (录制切换 / 新开 shell / 脱离 / more)
  2. `.term-body` (flex:1, `bg-0`, padding 8px 12px): xterm.js 挂载点
  3. `.term-chrome-bot` (高 28px, border-top, mono 10.5px): 左=pid/节点/镜像, 右=编码/尺寸/连接状态 (绿色)
- **xterm.js 配置**: fontSize=13, lineHeight=1.4, cursorBlink=true, fontFamily=CSS var(--font-mono), 主题色全部从 CSS 变量读, FitAddon 自适应
- **MutationObserver** 监听 `data-theme/data-mode/data-font` 变化, 实时更新 xterm theme
- **实际实现替换 fake shell 为 WebSocket 连 `/v1/sandboxes/{id}/pty`**

## Page: Recordings (列表)

- **路由路径**: `/recordings`
- **结构**:
  1. `PageHeader`: eyebrow="工作区", title="录像", num="{n} 个会话", actions=筛选+导出
  2. `.tln-tbl`, 7列 (`.rec-row`, grid `1.8fr 1fr 0.8fr 0.9fr 0.6fr 0.6fr 60px`):
     - 表头: 录像 / Sandbox / Agent / 启动 / 时长 / 步骤 / (空)
     - 录像列: title + id·sizeKB·frames (mono fg-3)
     - Agent 列: `<span class="pill">` magenta 背景 + agent icon + agent 名
     - 点击行 -> `/recordings/:id`

## Page: Recording (播放)

- **路由路径**: `/recordings/:id`, **full-bleed**
- **结构** (`.recp`, fixed inset 0, grid `56px 1fr 88px` rows + `1fr 320px` cols):
  1. `.recp-top` (col 1/-1, 56px): 返回 + meta (title + sandboxId + 时长 + agent badge) + actions (复制分享链接/导出 .cast)
  2. `.recp-stage` (bg-0, CRT 扫描线背景, border-right): 滚动文本播放区, agent 行前缀 `◆`, 播放中末尾 `.caret` 闪烁
  3. `.recp-side` (宽 320px, bg-2): Agent 步骤列表 (可点击 seek)
  4. `.recp-bot` (col 1/-1, 88px, flex column gap-8): scrubber (步骤 marker 竖线) + controls (播放圆形 acc 色 / mm:ss / 重播 / 速度 0.5×/1×/2×/4×)
- **播放逻辑**: requestAnimationFrame 驱动, `t` 秒为时间轴, `speed` 倍速, `visibleFrames = frames.filter(f => f.at <= t)`

## Page: Secrets

- **路由路径**: `/secrets`
- **结构**:
  1. `PageHeader`: eyebrow="工作区 · 凭据", title, num="{n} 个", actions=导出+新建
  2. `.sec-summary` (4列 grid, gap 14px): 4个 mini card (总数/24h 访问/待轮换/加密方式), 待轮换 > 0 时值变 warn 色
  3. 过滤栏 (`.sbx-filters` 复用样式): 4个 scope filter (全部/租户范围/Sandbox 范围/待轮换) + 搜索 280px
  4. `.tln-tbl`, 7列 (`.sec-row`, grid `1.5fr 1fr 1fr 0.8fr 0.8fr 0.9fr 60px`):
     - 表头: 名称·范围 / 上次轮换 / 上次使用 / 使用次数·30d / Sandbox数 / 创建者 / (空)
     - 名称列: magenta 24×24 icon box + name + rotate-warn badge (如需轮换) + scope pill
     - scope pill: tenant=默认, sandbox=info 色背景
     - 末列: 查看 (eye, toast 提示 30s) / 轮换 (refresh, 开 Dialog) / more
     - 行为 **no-click** (不跳转)
  5. `CreateSecretDrawer` (width=520): 名称 (大写验证) + 范围 select + 凭据值 (textarea, 可 show/hide) + 轮换策略 (`TlnSwitch` 90天自动轮换)
  6. 轮换 `TlnDialog`: confirm -> toast

## Page: Workers

- **路由路径**: `/workers`
- **结构**:
  1. `PageHeader`: eyebrow="管理", title="节点", num="{total} 个节点 · {regions} 个区域", actions=同步+加入节点
  2. `.wkr-summary` (4列 grid): 健康(ok)/渡出中(warn)/不健康(err)/Sandbox占容量 (含 `TlnProgress`)
  3. 按 region 分组, 每组:
     - `.region-head`: globe icon (teal) + region名 + count + 右侧汇总 (sandbox数 + 平均负载%)
     - `.tln-tbl`, 6列 (`.wkr-row`, grid `1fr 0.8fr 1.4fr 0.7fr 0.7fr 50px`): Worker/状态/负载/Sandbox/运行时间/actions
     - 负载列: 3行子 grid (CPU/MEM/DSK) 各含 label + `TlnProgress thin` + 百分比 (≥90% err/hot, ≥70% warn/warm)
     - unhealthy worker 下方展开 `.wkr-error-strip` (err-soft 背景, alert icon, 错误消息, "Drain·重启" ghost 按钮)
  - 行为 **no-click**

## Page: Tenants

- **路由路径**: `/tenants`
- **结构**:
  1. `PageHeader`: eyebrow="管理", title="租户", num="{n} 个", actions=导出CSV+新建租户
  2. `.tln-tbl`, 7列 (`.ten-row`, grid `1.6fr 0.8fr 0.7fr 0.8fr 1.6fr 0.8fr 60px`):
     - 表头: 租户/套餐/成员/Sandbox/配额使用·vCPU·内存·磁盘/创建/(空)
     - 名称列: 28×28 avatar (acc-soft, 首字母, suspended=err-soft) + name (suspended 显示 "已暂停" err badge) + `tenant_{id}`
     - 套餐列: plan badge (Enterprise=acc, Team=info, Free=bg-3/fg-2)
     - 配额列: 2行 sub-grid (CPU/MEM progress thin + 数值), 无磁盘行
     - 点击行 -> setDetail(t) 打开 Drawer
  3. `TenantDrawer` (`TlnDrawer` width=620):
     - Header bar: 48px avatar + name + plan + 成员/运行sandbox 信息 + plan `TlnSegmented` (切换)
     - 配额 section: 3行 quota-row (vCPU/内存/磁盘, `TlnProgress` + 已用 + editable number input)
     - 成员 section: 成员列表 (avatar/email/role badge/加入时间/more), 角色 admin=acc/member=bg-3/agent=magenta; "邀请" 按钮 (无功能)
     - 安全 section: `TlnKV` (KMS key ARN / 轮换周期 / 网络策略 / 2FA)
     - Footer: 暂停 (danger) + 保存修改 (primary, toast 确认)

## Page: Audit

- **路由路径**: `/audit`
- **结构**:
  1. `PageHeader`: eyebrow="工作区 · 审计", title="审计日志", desc (含 `●` 绿色实时指示), actions=高级过滤+导出CSV
  2. 过滤栏: 6个 type filter (全部/Sandbox/凭据/认证/PTY/镜像) 含 count + 弹性间隔 + time range `TlnSegmented` (1h/24h/7d/30d) + 搜索 280px
  3. `.tln-tbl`, 7列 (`.aud-row`, grid `100px 1fr 1fr 1.4fr 0.7fr 1.5fr 70px`):
     - 表头: 时间/事件/发起者/目标/结果/元信息/(空)
     - 时间列: 相对时间 (fg-2) + ISO 时间 (HH:MM:SS)
     - 事件列: `<span class="kind {type}">` 颜色 badge + 事件子类型
     - 发起者列: 图标 (user/agent/box/server) + actor
     - 结果列: `TlnBadge` ok/err, dot=false
     - 行为 **no-click**
  4. **实时流模拟**: `setInterval` 4.2秒 prepend 新事件, 最多 200 条 (生产实现应换 WebSocket 或 SSE; P1 fallback 用 polling)

---

## 缺失 platform endpoint 清单 (binder → patcher 工单)

| 缺失端点 | 页面依赖 | 优先级 |
|---|---|---|
| `GET /v1/metrics/dashboard` JSON 聚合 | Dashboard 4 metric + states bar | P0 |
| `GET /v1/users/me` 包含 email/role/name | Sidebar foot | P0 |
| `GET /v1/admin/workers` DTO 含 cpu%/mem%/disk%/sandboxes/capacity/uptimeSec/lastError | Workers 页 | P0 |
| `GET /v1/recordings` 全局列表 | Recordings 页 | P1 |
| `POST /v1/secrets/{id}/rotate` | Secrets 轮换 | P1 |
| `GET /v1/admin/tenants/{id}` 含 members 列表 | Tenant Drawer | P1 |
| `GET /v1/sandboxes/{id}/processes` 含 cpu%/mem% 实时值 | Sandbox Detail 进程 tab | P1 |
| `GET /v1/audit/events` SSE/WS 实时流 | Audit 页实时 (P1 用 polling fallback) | P2 |
| `POST /v1/sandboxes/{id}/recordings/start` + `/stop` | Terminal 录制按钮 | P2 |
| `POST /v1/admin/tenants` | Tenants 新建 | P2 |
| `DELETE /v1/admin/tenants/{id}` (暂停) | Tenant Drawer 暂停 | P2 |
| Preview URL 域名格式确认 | Sandbox Detail 端口 tab | P1 |

## 风险 / 歧义

1. **`/v1/auth/me` 实际 DTO 字段**: 需 platform-patcher 确认是否含 email + role + name; 缺则补
2. **登录后 auth state 真实化**: 原型用 `setTimeout` mock, 实现必须真接 `/v1/auth/login` + JWT cookie
3. **Tweaks 面板归属**: 已决策 — closed beta 保留浮层, public beta 前迁 Settings
4. **CmdK 导航文字**: 原型用中文字面量, 实现时必须 i18n 化
5. **Dashboard `dangerouslySetInnerHTML`**: 改纯 React 渲染
6. **Files Tab / Network Tab 写死内容**: 实接 `/v1/sandboxes/{id}/fs-*`; Network 拦截 host 列表对接审计过滤 (P2) 或标记 "暂未实现"
7. **Workers "加入节点" / Tenants "新建租户"**: 原型占位 button, 实现先标 disabled 或 toast "Coming soon"
9. **Dashboard `statesByCount`**: 缺 endpoint 时前端在 `GET /v1/admin/sandboxes` 自行计数

## 实现顺序

**P0 (登录后可用):** Login -> Shell -> Dashboard -> Sandboxes 列表
**P1:** Sandbox Detail -> Terminal -> Secrets -> Audit
**P2:** Workers -> Tenants -> Recordings -> Tweaks 迁移决策
