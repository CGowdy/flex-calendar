import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'url'
import { resolve } from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false, // Run smoke tests sequentially to avoid DB conflicts
  retries: 0,
  globalSetup: resolve(__dirname, 'tests/e2e/global-setup.ts'),
  globalTeardown: resolve(__dirname, 'tests/e2e/global-teardown.ts'),
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    video: 'off',
  },
  webServer: [
    {
      command: 'bunx vite --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        VITE_API_URL: 'http://localhost:3334/api',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})


