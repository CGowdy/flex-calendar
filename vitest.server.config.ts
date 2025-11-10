import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/server/**/*.spec.ts'],
    globals: true,
    setupFiles: ['src/server/tests/setup.ts'],
    coverage: {
      provider: 'v8',
    },
  },
})

