import { defineConfig } from 'vite';
import { cspPlugin } from './vite.csp.js';

export default defineConfig({
  base: './', // alt dizinde (GitHub Pages) ve dosya olarak da çalışsın
  plugins: [cspPlugin()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
