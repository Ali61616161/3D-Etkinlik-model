import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // alt dizinde (GitHub Pages) ve dosya olarak da çalışsın
  server: { host: true, port: 5173 },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
