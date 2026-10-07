import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// In Docker Compose the API runs in the "backend" container; on the laptop it runs on port 8000.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiTarget,
    },
  },
  test: {
    environment: 'jsdom',
  },
})
