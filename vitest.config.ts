import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [
        ...configDefaults.exclude,
        'e2e/**',
        'tests/e2e/**',
        'src/**/__ct__/**',
        '**/*.ct.spec.ts',
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
