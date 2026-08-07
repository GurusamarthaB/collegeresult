import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'public'),
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'public/index.html'),
        result: resolve(__dirname, 'public/result.html'),
        admin: resolve(__dirname, 'public/admin.html'),
        'admin-login': resolve(__dirname, 'public/admin-login.html')
      },
      output: {
        manualChunks: undefined
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
