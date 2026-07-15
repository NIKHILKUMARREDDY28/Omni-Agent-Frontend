import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:8000'
  const ngrokHost = 'omni-agent.nuark.ai'
  const allowedDevOrigins = [ngrokHost, "http://localhost:8000"]
  const proxyHeaders = {
    'ngrok-skip-browser-warning': 'true',
    ...(env.VITE_CF_ACCESS_CLIENT_ID && env.VITE_CF_ACCESS_CLIENT_SECRET
      ? {
          'CF-Access-Client-Id': env.VITE_CF_ACCESS_CLIENT_ID,
          'CF-Access-Client-Secret': env.VITE_CF_ACCESS_CLIENT_SECRET,
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
