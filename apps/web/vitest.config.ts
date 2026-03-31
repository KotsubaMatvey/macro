import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@macroaccess/types': fileURLToPath(new URL('../../packages/types/src/index.ts', import.meta.url)),
      '@macroaccess/config': fileURLToPath(new URL('../../packages/config/src/index.ts', import.meta.url)),
      '@macroaccess/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
