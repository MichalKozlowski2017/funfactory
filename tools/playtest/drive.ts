/**
 * Sesja do grania „na żywo” (np. agent testujący jak dziecko): uruchamia grę raz i przyjmuje polecenia przez HTTP.
 * Współrzędne w pikselach zrzutu (to, co widać na obrazku), więc agent stuka tam, gdzie widzi przycisk.
 *
 *   node tools/playtest/drive.ts games/bystrzakowo --port 7777 --size 956x440 --query "full&lang=pl" --out .shots/drive
 *   curl -s localhost:7777/shot?name=a          → zapisuje <out>/a.png, zwraca ścieżkę, scenę i nowe błędy JS
 *   curl -s "localhost:7777/tap?x=300&y=200"
 *   curl -s "localhost:7777/drag?x1=..&y1=..&x2=..&y2=..&ms=500"
 *   curl -s "localhost:7777/wait?ms=1500"
 *   curl -s --data-urlencode "js=window.__ff.scene" localhost:7777/eval
 *   curl -s localhost:7777/quit
 * Każda odpowiedź to JSON z polami scene i errors (błędy JS od poprzedniego polecenia).
 */
import { createServer as http } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: 'string', default: '7777' },
    size: { type: 'string', default: '956x440' },
    query: { type: 'string', default: '' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: '.shots/drive' },
  },
});
const repo = resolve(import.meta.dirname, '../..');
const root = resolve(repo, positionals[0] ?? 'lab');
const out = resolve(repo, values.out);
await mkdir(out, { recursive: true });

const vite = await createServer({ root, configFile: resolve(root, 'vite.config.ts'), logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await vite.listen();
const addr = vite.httpServer?.address();
const port = typeof addr === 'object' && addr ? addr.port : 5173;
const [w, h] = values.size.split('x').map(Number) as [number, number];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await context.newPage();
let errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
await page.goto(`http://127.0.0.1:${port}/?seed=${values.seed}${values.query ? `&${values.query}` : ''}`);
await page.waitForFunction(() => (window as unknown as { __ff?: { ready?: boolean } }).__ff?.ready === true, undefined, { timeout: 30000 });

async function drag(x1: number, y1: number, x2: number, y2: number, ms: number): Promise<void> {
  await page.evaluate(
    async ({ x1, y1, x2, y2, ms }) => {
      const c = document.querySelector('canvas')!;
      const fire = (type: string, x: number, y: number) =>
        c.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, pressure: type === 'pointerup' ? 0 : 0.5, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      fire('pointerdown', x1, y1);
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const step = () => {
          const t = Math.min((performance.now() - t0) / ms, 1);
          fire('pointermove', x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
          if (t < 1) setTimeout(step, 8);
          else done();
        };
        setTimeout(step, 8);
      });
      fire('pointerup', x2, y2);
    },
    { x1, y1, x2, y2, ms },
  );
}

const scene = () => page.evaluate(() => (window as unknown as { __ff?: { scene?: string } }).__ff?.scene ?? '?');
http(async (req, res) => {
  const u = new URL(req.url ?? '/', 'http://x');
  const q = (k: string, d = '0') => Number(u.searchParams.get(k) ?? d);
  const reply: Record<string, unknown> = {};
  try {
    if (u.pathname === '/tap') await page.touchscreen.tap(q('x'), q('y'));
    else if (u.pathname === '/drag') await drag(q('x1'), q('y1'), q('x2'), q('y2'), q('ms', '500'));
    else if (u.pathname === '/wait') await page.waitForTimeout(q('ms', '1000'));
    else if (u.pathname === '/shot') {
      const file = resolve(out, `${u.searchParams.get('name') ?? Date.now()}.png`);
      await page.screenshot({ path: file });
      reply.file = file;
    } else if (u.pathname === '/eval') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const js = new URLSearchParams(body).get('js') ?? u.searchParams.get('js') ?? '';
      reply.result = await page.evaluate(js);
    } else if (u.pathname === '/quit') {
      res.end('{"ok":true}');
      await browser.close();
      await vite.close();
      process.exit(0);
    }
    reply.scene = await scene();
  } catch (e) {
    reply.failure = String(e);
  }
  reply.errors = errors;
  errors = [];
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(reply));
}).listen(Number(values.port), '127.0.0.1', () => console.log(`drive: http://127.0.0.1:${values.port} (gra: ${root})`));
