import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works at the domain root on Render and under a sub-path elsewhere.
  base: './',
  server: { port: 5173, strictPort: true },
  // Keep Vite's hashed bundle out of /assets, which holds the game's art.
  build: { target: 'es2020', assetsDir: 'bundle', chunkSizeWarningLimit: 1500 },
});
