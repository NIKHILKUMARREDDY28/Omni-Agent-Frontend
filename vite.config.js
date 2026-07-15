import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl =
    env.API_PROXY_TARGET || env.BACKEND_URL || env.VITE_API_BASE_URL || 'http://localhost:8000'
  const ngrokHost = 'omni-agent.nuark.ai'
  const allowedDevOrigins = [ngrokHost, "http://localhost:8000"]
  // CF service-token vars are read server-side (no VITE_ prefix) so they are
  // never bundled into the browser. The dev proxy injects them just like the
  // production Edge Function does.
  const proxyHeaders = {
    'ngrok-skip-browser-warning': 'true',
    ...(env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET
      ? {
          'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
          'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
        }
      : {}),
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      allowedHosts: [ngrokHost],
      cors: {
        origin: allowedDevOrigins,
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          headers: proxyHeaders,
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true,
          headers: proxyHeaders,
        },
      },
    },
  }
})
