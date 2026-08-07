import { defineConfig } from 'vite';

export default defineConfig({
  // If index.html is in public/ or src/
  root: './public', // or './src'
  build: {
    outDir: '../dist'
  }
});