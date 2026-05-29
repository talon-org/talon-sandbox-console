#!/usr/bin/env bash
# scripts/deploy.sh — 构建并部署 console 到目标服务器（静态 dist + Caddy）
#
# 形态：talon-sandbox-console 是独立静态 SPA（根路径、HashRouter、API_BASE=/api）。
# 部署 = pnpm build → rsync dist 到服务器静态目录 → reload Caddy。
# 后端（sandbox-api）与 Caddy 站点配置在服务器侧维护，本脚本只负责前端产物上线。
#
# 用法：
#   DEPLOY_HOST=user@host bash scripts/deploy.sh
#
# 可选环境变量（均有默认值，敏感信息不入库——通过 env 传入）：
#   DEPLOY_HOST       ssh 目标，如 deploy@example.com（必填，无默认）
#   DEPLOY_PATH       服务器静态目录（默认 /var/www/talon-sandbox-console）
#   RELOAD_CADDY      为 1 时部署后在远端 reload caddy（默认 1）
#   SKIP_BUILD        为 1 时跳过 pnpm build，直接传现有 dist/（默认 0）
#
# 首次部署需先在服务器侧配置 Caddy 站点，片段见本文件末尾注释。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/talon-sandbox-console}"
RELOAD_CADDY="${RELOAD_CADDY:-1}"
SKIP_BUILD="${SKIP_BUILD:-0}"

if [[ -z "$DEPLOY_HOST" ]]; then
  echo "错误：必须设置 DEPLOY_HOST，例如  DEPLOY_HOST=user@host bash scripts/deploy.sh" >&2
  exit 1
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "==> 1/3 构建（pnpm build）"
  pnpm build
else
  echo "==> 1/3 SKIP_BUILD=1，跳过构建"
fi

if [[ ! -f dist/index.html ]]; then
  echo "错误：dist/index.html 不存在，构建可能失败。" >&2
  exit 1
fi

echo "==> 2/3 上传 dist → ${DEPLOY_HOST}:${DEPLOY_PATH}"
# 确保远端目录存在且当前用户可写（首次部署）
ssh "$DEPLOY_HOST" "sudo mkdir -p '$DEPLOY_PATH' && sudo chown \$(whoami) '$DEPLOY_PATH'"
# --delete 让远端与本地 dist 完全一致（清掉旧 hash 资源），避免陈旧文件堆积
rsync -az --delete dist/ "${DEPLOY_HOST}:${DEPLOY_PATH}/"

if [[ "$RELOAD_CADDY" == "1" ]]; then
  echo "==> 3/3 reload caddy"
  ssh "$DEPLOY_HOST" "sudo systemctl reload caddy"
else
  echo "==> 3/3 RELOAD_CADDY!=1，跳过 caddy reload"
fi

echo "==> 完成。验证："
echo "    curl -sS -o /dev/null -w '%{http_code} %{content_type}\\n' https://<域名>/"

# ---------------------------------------------------------------------------
# 服务器侧 Caddy 站点片段（首次部署时手动加入 Caddyfile，之后本脚本只更新 dist）：
#
#   <你的域名> {
#       # /api/* → 削掉 /api 前缀转 sandbox-api 真实 /v1/*（同源 cookie，无 CORS）
#       handle /api/* {
#           uri strip_prefix /api
#           reverse_proxy 127.0.0.1:18080
#       }
#       # /v1/* → 直通后端（PTY WebSocket、前端直拼的 /v1 调用）
#       handle /v1/* {
#           reverse_proxy 127.0.0.1:18080
#       }
#       # 其余 → 静态 SPA。HashRouter 路由在 # 之后，try_files 仅作兜底。
#       handle {
#           root * /var/www/talon-sandbox-console
#           try_files {path} /index.html
#           file_server
#       }
#   }
#
# 后端地址（127.0.0.1:18080）按实际 sandbox-api 监听端口调整。
# ---------------------------------------------------------------------------
