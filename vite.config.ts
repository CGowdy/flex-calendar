import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { config as loadEnv } from 'dotenv'

loadEnv()

const apiTarget = process.env.VITE_API_URL ?? 'http://localhost:3333'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@api': fileURLToPath(new URL('./src/features/calendar/api', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/features/calendar/components', import.meta.url)),
      '@composables': fileURLToPath(new URL('./src/features/calendar/composables', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/features/calendar/stores', import.meta.url)),
      '@views': fileURLToPath(new URL('./src/features/calendar/views', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
  server: {
    watch: {
      // Helps Docker on Windows/WSL bind-mounts pick up changes
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
