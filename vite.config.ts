import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5274,
    strictPort: true,
    proxy: {
      // dev-only: forward /v1/* to local sandbox-api so the browser sees
      // same-origin (cookie + no CORS). Prod uses Caddy /api → 18080 and
      // VITE_API_BASE='/api'.
      '/v1': {
        target: 'http://127.0.0.1:18080',
        changeOrigin: false,
      },
    },
  },
})
