import { defineConfig } from '@playwright/experimental-ct-vue'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

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
    plugins: [
      vue(),
      {
        name: 'mock-api-client-plugin',
        resolveId(source) {
          if (source === '@/lib/apiClient') {
            return path.resolve(process.cwd(), 'playwright/mocks/apiClient.ts')
          }
          return null
        },
      },
    ],
    resolve: {
      alias: [
        { find: /^@\/lib\/apiClient$/, replacement: path.resolve(process.cwd(), 'playwright/mocks/apiClient.ts') },
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        { find: /^@api\//, replacement: path.resolve(process.cwd(), 'src/features/calendar/api/') },
        { find: /^@components\//, replacement: path.resolve(process.cwd(), 'src/features/calendar/components/') },
        { find: /^@composables\//, replacement: path.resolve(process.cwd(), 'src/features/calendar/composables/') },
        { find: /^@stores\//, replacement: path.resolve(process.cwd(), 'src/features/calendar/stores/') },
        { find: /^@views\//, replacement: path.resolve(process.cwd(), 'src/features/calendar/views/') },
        { find: /^@lib\//, replacement: path.resolve(process.cwd(), 'src/lib/') },
      ],
    },
  },
})


