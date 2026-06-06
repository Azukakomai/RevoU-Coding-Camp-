import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    open: true,
    strictPort: false,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false
  },
  preview: {
    port: 4173,
    open: true
  }
})
