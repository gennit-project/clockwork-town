import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: 'frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/graphql': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
