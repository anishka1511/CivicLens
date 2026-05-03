import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/static'
  }
  ,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js'
  }
})