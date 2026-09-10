import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend talks to the Python API under /api.
// In dev, Vite proxies /api to a local backend (see README for running api/index.py locally).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
