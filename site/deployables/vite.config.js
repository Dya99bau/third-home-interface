import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // relative -- correct regardless of where the parent site/ folder is
  // served from (was '/deployables/', which assumed domain root)
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist/deployables',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
