import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.json'],
  },
  server: {
    port: 5173,
    proxy: {
      // Same-origin in development, so the HttpOnly refresh cookie works
      // without cross-site configuration.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // When the API is unreachable (not started yet, or restarting under
        // `node --watch`), http-proxy would otherwise surface an opaque 500.
        // Answer with a clear 503 instead. Note: this only fires on transport
        // errors — a real HTTP 500 from the API still passes through unchanged.
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' })
            }
            if (res && typeof res.end === 'function') {
              res.end(
                JSON.stringify({
                  success: false,
                  message: 'API server unreachable on http://localhost:3001 — start the backend (cd backend && npm run dev) and reload.',
                }),
              )
            }
          })
        },
      },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/*.spec.+(js|jsx|ts|tsx)'],
  },
})
