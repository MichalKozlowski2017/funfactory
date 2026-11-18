import { defineConfig } from 'vite';

export default defineConfig({
  // Względne ścieżki: Capacitor serwuje build z lokalnego katalogu w aplikacji.
  base: './',
  server: { host: true },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
