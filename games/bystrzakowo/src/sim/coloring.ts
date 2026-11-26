/** Coloring pages: public/art/coloring-pages/<id>.png (line art from Flux). */
export const PAGES = [
  'cat', 'dog', 'elephant', 'fish', 'butterfly', 'car', 'little-flower', 'dinosaur', 'turtle', 'rocket', 'owl', 'little-house',
  // Simple scenes: 2-3 big objects (car-house, picnic and train fit only a tablet).
  'sandcastle', 'cow', 'hedgehog', 'snail', 'space-rocket', 'snowman', 'fish-starfish', 'duck', 'car-house', 'picnic', 'train',
  // Busier scenes (small details colour themselves).
  'scene-beach', 'scene-sea',
];

import { MIN_WIDTH } from './coloring-sizes.ts';

/**
 * Pages that fit a picture `width` points wide (scripts/coloring-sizes.ts measured how big each must be for a finger).
 * A tiny screen where nothing fits gets the easiest half of the pages.
 */
export function pagesFor(width: number): string[] {
  const fit = PAGES.filter((p) => (MIN_WIDTH[p] ?? 0) <= width);
  if (fit.length >= 4) return fit;
  return [...PAGES].sort((a, b) => (MIN_WIDTH[a] ?? 0) - (MIN_WIDTH[b] ?? 0)).slice(0, Math.ceil(PAGES.length / 2));
}
