// Tek dosya HTML çıktısı (çift tıkla açılır, demo/gösterim için): npm run build:single → dist-single/index.html
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: { outDir: 'dist-single', target: 'es2020', chunkSizeWarningLimit: 4000 },
});
