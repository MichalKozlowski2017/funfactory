import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths: Capacitor serves the build from a local directory inside the app.
  base: './',
  server: { host: true },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
