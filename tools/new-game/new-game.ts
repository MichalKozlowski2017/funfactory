/**
 * Nowa gra z szablonu templates/game.
 *
 *   pnpm new-game <slug> --title "Nazwa Gry" [--app-id com.mkdev.slug] [--native]
 *
 * --native: od razu buduje i dodaje projekty iOS (Xcode) i Android (Android Studio) przez Capacitor.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const repo = resolve(import.meta.dirname, '../..');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    title: { type: 'string' },
    'app-id': { type: 'string' },
    native: { type: 'boolean', default: false },
  },
});

const slug = positionals[0];
if (!slug || !/^[a-z][a-z0-9-]{1,40}$/.test(slug)) {
  console.error('Użycie: pnpm new-game <slug> --title "Nazwa" [--app-id com.x.y] [--native]');
  console.error('slug: małe litery, cyfry i myślniki, np. "slime-jump"');
  process.exit(2);
}

const title = values.title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const appId = values['app-id'] ?? `com.mkdev.${slug.replace(/-/g, '')}`;
const dest = resolve(repo, 'games', slug);

if (existsSync(dest)) {
  console.error(`games/${slug} już istnieje.`);
  process.exit(1);
}

await cp(resolve(repo, 'templates/game'), dest, { recursive: true });

const replacements: [RegExp, string][] = [
  [/__SLUG__/g, slug],
  [/__TITLE__/g, title],
  [/__APP_ID__/g, appId],
];

async function walk(dir: string): Promise<void> {
  for (const name of await readdir(dir)) {
    const file = join(dir, name);
    if ((await stat(file)).isDirectory()) {
      await walk(file);
      continue;
    }
    if (!/\.(ts|json|html|md)$/.test(name)) continue;
    let text = await readFile(file, 'utf8');
    for (const [pattern, value] of replacements) text = text.replace(pattern, value);
    await writeFile(file, text);
  }
}
await walk(dest);

const run = (cmd: string, cwd = repo) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

run('pnpm install');

if (values.native) {
  run('pnpm build', dest);
  run('pnpm exec cap add ios', dest);
  run('pnpm exec cap add android', dest);
}

console.log(`
Gotowe: games/${slug}  (${title}, ${appId})

  pnpm --filter @funfactory-game/${slug} dev
  pnpm shot games/${slug}
${values.native ? '' : `  cd games/${slug} && pnpm build && pnpm exec cap add ios && pnpm exec cap add android\n`}`);
