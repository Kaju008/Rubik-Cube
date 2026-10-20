import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// relative base so the site works on GitHub Pages (/Rubik-Cube/) or any custom domain
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  server: { host: true },
});
