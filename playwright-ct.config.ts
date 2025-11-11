import { defineConfig } from '@playwright/experimental-ct-vue'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

export default defineConfig({
  testDir: 'src',
  // Look for files in __ct__ folders
  testMatch: /.*__ct__.*\.ct\.spec\.(ts|tsx)$/,
  fullyParallel: true,
  retries: 0,
  use: {
    ctPort: 3100,
  },
  ctTemplateDir: path.resolve(process.cwd(), 'playwright'),
  // Reuse project Vite setup for component tests
  vite: {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
})


