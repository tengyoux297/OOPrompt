import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  define: {
    'process.env': {}
  },
  envPrefix: 'VITE_',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'index.html',
      },
    },
    // Ensure proper chunking for extension
    chunkSizeWarningLimit: 1000,
  },
  // Extension-specific optimizations
  optimizeDeps: {
    exclude: ['@crxjs/vite-plugin']
  }
})

