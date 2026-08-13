import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'gh-pages' ? '/third-home-interface/' : '/',
  server: { port: 5180, host: '0.0.0.0' },
}))
