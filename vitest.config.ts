import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: [['text', { skipFull: false }], 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.spec.ts', 'src/server.ts'],
    },
  },
})
