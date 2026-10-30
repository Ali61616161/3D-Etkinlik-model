// Tek dosya HTML çıktısı (çift tıkla açılır, demo/gösterim için): npm run build:single → dist-single/index.html
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { cspPlugin } from './vite.csp.js';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile(), cspPlugin({ inlineScripts: true })],
  build: { outDir: 'dist-single', target: 'es2020', chunkSizeWarningLimit: 4000 },
});
