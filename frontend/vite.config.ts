import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import os from 'os'

// Use temp directory for cache to avoid OneDrive sync issues
const cacheDir = path.join(os.tmpdir(), 'vite-cache-dairy-erp')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: cacheDir,
  server: {
    port: 5173,
    strictPort: false,
  },
  optimizeDeps: {
    force: false, // Set to true to force re-optimization
  },
})

