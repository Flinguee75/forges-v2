import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import process from 'node:process'

const commitSha = process.env.VITE_COMMIT_SHA ||
  (() => { try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'local' } })()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __COMMIT_SHA__: JSON.stringify(commitSha),
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qrcode';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['e2e/**', 'node_modules', 'dist', '.{idea,git,cache,tmp,temp}/**'],
  },
})
