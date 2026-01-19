import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'
import manifestJson from './public/manifest.json'

// Convert manifest to the format expected by crx plugin
const manifest = defineManifest(manifestJson)

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
    // Keep extension build output separate from web build output (`dist`)
    // so `npm run build` (web) doesn't overwrite the extension manifest.
    outDir: 'dist-extension',
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

