import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Pin the timezone so time-of-day-sensitive simulation tests are deterministic
// regardless of the machine/CI runner locale. (Set before workers spawn so they
// inherit it.)
process.env.TZ = process.env.TZ || 'UTC'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'frontend/src/main.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './frontend/src')
    }
  }
})
