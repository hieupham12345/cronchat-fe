// vite.config.js
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    host: true,          // cho phép truy cập qua LAN (10.x.x.x)
    port: 3000,          // ép port m muốn
    strictPort: true,    // nếu 3000 bận → báo lỗi, không nhảy sang 5173
    watch: {
      usePolling: true,
      interval: 200
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    env: {
      VITE_API_BASE_URL: 'http://api.test',
    },
  },
})
