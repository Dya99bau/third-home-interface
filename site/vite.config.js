import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  plugins: [react()],
  // relative, not hard-coded to a repo/host -- must survive an arbitrary
  // move to a different domain and an arbitrary subfolder nesting depth
  base: './',
  server: { port: 5180, host: '0.0.0.0' },
}))
