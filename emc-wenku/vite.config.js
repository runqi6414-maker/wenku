import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages hosts this repository under /wenku/; local dev keeps the root path.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/wenku/' : '/',
  plugins: [vue(), vueDevTools()],
  server: { proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } } },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
