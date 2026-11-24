import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ITEMS } from './catalog.ts';
import { PAGES } from './coloring.ts';
import { EMOTION_CHARS, EMOTIONS } from './emotions.ts';
import { LETTER_PICS } from './letter-pics.ts';
import { ACTIVITIES, REALMS } from './realms.ts';
import { SIGN_ART } from './sorting.ts';
import { LANDSCAPES } from './stickers.ts';
import { FRAMES, STORIES } from './stories.ts';

const pub = join(import.meta.dirname, '../../public');

describe('art files', () => {
  it('every picture the game asks for exists', () => {
    const paths = [
      ...ITEMS.map((i) => `art/items/${i.id}.webp`),
      ...LETTER_PICS.map((p) => `art/letters/${p.id}.webp`),
      ...ACTIVITIES.map((a) => `art/house-${a}.webp`),
      ...REALMS.filter((r) => r.id !== 'meadow').flatMap((r) => [`art/realm-${r.id}.jpg`, `art/game-${r.id}.jpg`]),
      ...SIGN_ART.map((id) => `art/workshop/${id}.webp`),
      ...EMOTIONS.flatMap((e) => EMOTION_CHARS.map((c) => (c === 'child' ? `art/emotions/${e}.webp` : `art/emotions/${e}-${c}.webp`))),
      ...STORIES.flatMap((s) => Array.from({ length: FRAMES }, (_, i) => `art/stories/${s}-${i + 1}.webp`)),
      ...PAGES.map((p) => `art/coloring-pages/${p}.png`),
      ...LANDSCAPES.filter((l) => l !== 'meadow').map((l) => `art/landscapes/${l}.jpg`),
      ...['lusia.webp', 'bazyl.webp', 'meadow.jpg', 'background-riddle.jpg', 'gear.webp', 'hand.webp', 'workshop/crate.webp', 'workshop/pail.webp'].map((f) => `art/${f}`),
    ];
    expect(paths.filter((p) => !existsSync(join(pub, p)))).toEqual([]);
  });
});
