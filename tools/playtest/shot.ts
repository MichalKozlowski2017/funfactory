/**
 * Playtest: uruchamia aplikację (lab albo grę) w Vite, otwiera ją w emulowanym telefonie,
 * wykonuje kroki i zapisuje zrzuty do .shots/<nazwa>/.
 *
 *   pnpm shot lab
 *   pnpm shot games/foo --device "Pixel 8" --steps "shot:start,tap:360:900,wait:400,shot:after"
 *   pnpm shot lab --video
 *
 * Kroki (współrzędne w jednostkach gry, szerokość 720):
 *   wait:<ms>                 czekaj
 *   shot:<nazwa>              zrzut ekranu
 *   tap:<x>:<y>               stuknięcie
 *   drag:<x1>:<y1>:<x2>:<y2>  przeciągnięcie (300 ms)
 *   swipe:<x1>:<y1>:<x2>:<y2> szybkie przeciągnięcie (80 ms)
 *   hold:<x1>:<y1>:<x2>:<y2>  przeciągnij i trzymaj palec (np. celowanie), potem `release`
 *   release                   puść palec po `hold`
 *
 * Kod wyjścia 1, gdy na stronie wystąpił błąd JS albo gra nie zgłosiła gotowości.
 */
import { mkdir, rm } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, devices, webkit, type Page } from '@playwright/test';
import { createServer } from 'vite';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    device: { type: 'string', default: 'iPhone 15 Pro' },
    browser: { type: 'string', default: 'chromium' },
    steps: { type: 'string', default: 'shot:ready,wait:1200,shot:later' },
    out: { type: 'string' },
    video: { type: 'boolean', default: false },
    seed: { type: 'string', default: '1' },
    timeout: { type: 'string', default: '15000' },
  },
});

const target = positionals[0];
if (!target) {
  console.error('Użycie: pnpm shot <lab | games/nazwa> [--device "Pixel 8"] [--steps "..."] [--video]');
  process.exit(2);
}

const repo = resolve(import.meta.dirname, '../..');
const root = resolve(repo, target);
const name = basename(root);
const outDir = resolve(repo, values.out ?? `.shots/${name}`);
const device = devices[values.device];
if (!device) {
  console.error(`Nieznane urządzenie "${values.device}". Przykłady: "iPhone 15 Pro", "Pixel 8", "iPad Pro 11".`);
  process.exit(2);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  logLevel: 'error',
  server: { port: 0, host: '127.0.0.1' },
});
await server.listen();
const address = server.httpServer?.address();
const port = typeof address === 'object' && address ? address.port : 5173;
const url = `http://127.0.0.1:${port}/?seed=${values.seed}`;

const engine = values.browser === 'webkit' ? webkit : chromium;
const browser = await engine.launch();
const { defaultBrowserType: _ignored, ...deviceOpts } = device;
const context = await browser.newContext({
  ...deviceOpts,
  ...(values.video ? { recordVideo: { dir: outDir, size: deviceOpts.viewport } } : {}),
});
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});

let failed = false;
const saved: string[] = [];
try {
  await page.goto(url);
  await page.waitForFunction(() => window.__ff?.ready === true, undefined, { timeout: Number(values.timeout) });
  for (const step of values.steps.split(',').map((s) => s.trim()).filter(Boolean)) {
    await runStep(page, step);
  }
  const hookErrors = await page.evaluate(() => window.__ff?.errors ?? []);
  errors.push(...hookErrors);
} catch (err) {
  failed = true;
  errors.push(`playtest: ${(err as Error).message.split('\n')[0]}`);
  await page.screenshot({ path: resolve(outDir, 'failure.png') }).catch(() => {});
}

const info = await page
  .evaluate(() => ({ scene: window.__ff?.scene, frames: window.__ff?.frames, view: window.__ff?.game.view }))
  .catch(() => null);
await context.close();
await browser.close();
await server.close();

console.log(`urządzenie: ${values.device} (${values.browser}), scena: ${info?.scene ?? '?'}, klatki: ${info?.frames ?? '?'}`);
if (info?.view) console.log(`widok: ${Math.round(info.view.width)}×${Math.round(info.view.height)} jednostek`);
for (const file of saved) console.log(`zrzut: ${file}`);
if (values.video) console.log(`wideo: ${outDir}/*.webm`);
if (errors.length) {
  console.error('BŁĘDY:');
  for (const e of errors) console.error(`  ${e}`);
}
process.exit(failed || errors.length ? 1 : 0);

async function runStep(page: Page, step: string): Promise<void> {
  const [kind, ...args] = step.split(':');
  const nums = args.map(Number);
  switch (kind) {
    case 'wait':
      await page.waitForTimeout(nums[0] ?? 500);
      return;
    case 'shot': {
      const file = resolve(outDir, `${saved.length + 1}-${args[0] || 'shot'}.png`);
      await page.screenshot({ path: file });
      saved.push(file);
      return;
    }
    case 'tap': {
      const [x, y] = await toScreen(page, nums[0] ?? 0, nums[1] ?? 0);
      await page.touchscreen.tap(x, y);
      return;
    }
    case 'drag':
    case 'swipe': {
      const [x1, y1] = await toScreen(page, nums[0] ?? 0, nums[1] ?? 0);
      const [x2, y2] = await toScreen(page, nums[2] ?? 0, nums[3] ?? 0);
      await gesture(page, [x1, y1], [x2, y2], kind === 'drag' ? 400 : 90);
      return;
    }
    case 'hold': {
      const [x1, y1] = await toScreen(page, nums[0] ?? 0, nums[1] ?? 0);
      const [x2, y2] = await toScreen(page, nums[2] ?? 0, nums[3] ?? 0);
      await gesture(page, [x1, y1], [x2, y2], 300, false);
      return;
    }
    case 'release':
      await page.evaluate(() => {
        const held = (window as unknown as { __ffHeld?: [number, number] }).__ffHeld;
        const canvas = document.querySelector('canvas');
        if (!held || !canvas) throw new Error('release bez hold');
        canvas.dispatchEvent(
          new PointerEvent('pointerup', {
            clientX: held[0], clientY: held[1], pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, button: 0, buttons: 0,
          }),
        );
      });
      return;
    default:
      throw new Error(`Nieznany krok "${step}"`);
  }
}

/**
 * Gest palca symulowany wewnątrz strony (PointerEvent co ~8 ms), żeby prędkość była realistyczna.
 * Ruchy myszy z Playwrighta mają ~100 ms opóźnienia na krok w headless, co psuje swipe.
 */
async function gesture(page: Page, from: [number, number], to: [number, number], durationMs: number, lift = true): Promise<void> {
  await page.evaluate(
    async ({ from, to, durationMs, lift }) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('no canvas');
      const fire = (type: string, x: number, y: number) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            clientX: x,
            clientY: y,
            pointerId: 7,
            pointerType: 'touch',
            isPrimary: true,
            bubbles: true,
            cancelable: true,
            pressure: type === 'pointerup' ? 0 : 0.5,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
          }),
        );
      fire('pointerdown', from[0], from[1]);
      const start = performance.now();
      await new Promise<void>((done) => {
        const step = () => {
          const t = Math.min((performance.now() - start) / durationMs, 1);
          fire('pointermove', from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
          if (t < 1) setTimeout(step, 8);
          else done();
        };
        setTimeout(step, 8);
      });
      if (lift) fire('pointerup', to[0], to[1]);
      else (window as unknown as { __ffHeld?: [number, number] }).__ffHeld = to;
    },
    { from, to, durationMs, lift },
  );
}

async function toScreen(page: Page, x: number, y: number): Promise<[number, number]> {
  const scale = await page.evaluate(() => {
    const game = window.__ff?.game;
    return game ? game.app.screen.width / game.designWidth : 1;
  });
  return [x * scale, y * scale];
}
