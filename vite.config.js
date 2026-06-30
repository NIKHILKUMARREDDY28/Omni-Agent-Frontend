import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:8000'
  const ngrokHost = 'scheme-curator-modulator.ngrok-free.dev'
  const allowedDevOrigins = [ngrokHost, "http://localhost:8000"]
  const proxyHeaders = {
    'ngrok-skip-browser-warning': 'true',
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
