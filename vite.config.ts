import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 读取所有前缀（含空前缀）的环境变量，USE_LOCAL_UI 无 VITE_ 前缀也能拿到
  const env = loadEnv(mode, process.cwd(), '')

  // 本地 UI 源码调试开关：
  //   开发期：USE_LOCAL_UI=1 npm run dev  或在 .env.local 写 VITE_USE_LOCAL_UI=1
  //   CI / npm run build 不传此变量，走 npm 安装的 dist 版本
  const useLocalUI =
    env.VITE_USE_LOCAL_UI === '1' || env.USE_LOCAL_UI === '1'

  // 用 new URL().pathname 替代 path.resolve，无需 node:path / @types/node
  const uiSrc = new URL(
    '../talon-sandbox-ui/packages/react/src',
    import.meta.url,
  ).pathname

  return {
    plugins: [react()],
    resolve: {
      alias: useLocalUI
        ? [
            // CSS 入口：dist/styles.css 的源码等价替代
            // 指向本项目内的 local-ui-styles.css，
            // 该文件用 @import 拼合了 tokens + 三个 src/styles/*.css
            {
              find: '@talon-sandbox/react/styles',
              replacement: new URL(
                'src/styles/local-ui-styles.css',
                import.meta.url,
              ).pathname,
            },
            // JS 入口：直接读 src/index.ts，Vite 实时 HMR
            {
              find: '@talon-sandbox/react',
              replacement: uiSrc,
            },
          ]
        : [],
    },
    server: {
      port: 5274,
      strictPort: true,
      fs: {
        // Allow Vite to serve files from the linked @talon-sandbox/react package
        // (../talon-sandbox-ui/packages/react). Without this, fonts referenced
        // by the package's dist CSS are blocked by Vite's fs.allow default.
        allow: ['..', '../talon-sandbox-ui'],
      },
      proxy: {
        // dev-only: forward /v1/* to a locally-running API so the browser sees
        // same-origin (cookie + no CORS). In production the SPA calls /api on
        // the same origin (VITE_API_BASE='/api'). Override the local target via
        // VITE_DEV_API_TARGET if your API listens elsewhere.
        // ws: true is required for the /v1/sandboxes/{id}/pty WebSocket
        // endpoint; without it Vite never upgrades and the browser fails.
        '/v1': {
          target: env.VITE_DEV_API_TARGET || 'http://127.0.0.1:18080',
          changeOrigin: false,
          ws: true,
        },
      },
    },
  }
})
