import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isVercel = process.env.VERCEL === '1';

// https://vite.dev/config/
export default defineConfig({
  base: isVercel ? '/' : '/static/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/screenshots': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: isVercel ? 'dist' : '../static',
    emptyOutDir: true,
  }
})
