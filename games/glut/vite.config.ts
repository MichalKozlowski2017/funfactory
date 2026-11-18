import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Względne ścieżki: Capacitor serwuje build z lokalnego katalogu w aplikacji.
  base: './',
  server: { host: true },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  // Wersja gry (z package.json) widoczna w ustawieniach.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
