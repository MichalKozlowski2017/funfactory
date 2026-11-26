/** Coloring pages: public/art/coloring-pages/<id>.png (line art from Flux). */
export const PAGES = [
  'cat', 'car', 'elephant', 'fish', 'butterfly', 'little-flower', 'turtle', 'owl', 'little-house',
  // Simplest pages: 1-2 objects, a few big parts.
  'apple-pear', 'duck-ball', 'sun-cloud', 'balloons', 'sailboat', 'ice-cream', 'mushroom-snail', 'rocket-moon',
  // Simple scenes.
  'snail', 'snowman',
]

import { MIN_WIDTH } from './coloring-sizes.ts';

/**
 * Narrowest part a child colours (inscribed radius, points: 24 pt across, about 4 mm on a phone). Narrower parts become
 * ink in the game (sim/fill.ts inkSmallParts), and scripts/coloring-sizes.ts picks pages that lose little to ink.
 */
export const FINGER_RADIUS_PT = 12;

/**
 * Pages that fit a picture `width` points wide (scripts/coloring-sizes.ts measured how big each must be for a finger).
 * A tiny screen where nothing fits gets the easiest half of the pages.
 */
export function pagesFor(width: number): string[] {
  const fit = PAGES.filter((p) => (MIN_WIDTH[p] ?? 0) <= width);
  if (fit.length >= 4) return fit;
  return [...PAGES].sort((a, b) => (MIN_WIDTH[a] ?? 0) - (MIN_WIDTH[b] ?? 0)).slice(0, Math.ceil(PAGES.length / 2));
}
