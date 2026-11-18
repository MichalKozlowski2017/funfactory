import type { Block, Surface } from './physics.ts';

/** Szerokość studni i grubość ścian (ściany wchodzą w ekran na WALL jednostek). */
export const SHAFT = { width: 720, wall: 40 } as const;

/**
 * Ręcznie ułożony poziom do szarego prototypu (krok 1).
 * W kroku 2 zastąpi go generator kawałków z seedem.
 */
export function prototypeLevel(): { blocks: Block[]; start: { x: number; y: number } } {
  const top = -9000;
  const blocks: Block[] = [
    // Dno i ściany studni.
    { x: -200, y: 0, w: SHAFT.width + 400, h: 400, surface: 'sticky' },
    { x: -200, y: top, w: 200 + SHAFT.wall, h: -top + 400, surface: 'sticky' },
    { x: SHAFT.width - SHAFT.wall, y: top, w: 200 + SHAFT.wall, h: -top + 400, surface: 'sticky' },
  ];
  const ledge = (side: 'L' | 'R' | 'C', y: number, w: number, surface: Surface = 'sticky', h = 36) => {
    const x = side === 'L' ? SHAFT.wall : side === 'R' ? SHAFT.width - SHAFT.wall - w : (SHAFT.width - w) / 2;
    blocks.push({ x, y, w, h, surface });
  };
  const wallPatch = (side: 'L' | 'R', y: number, h: number, surface: Surface) => {
    const w = 18;
    const x = side === 'L' ? SHAFT.wall : SHAFT.width - SHAFT.wall - w;
    blocks.push({ x, y, w, h, surface });
  };

  ledge('L', -520, 240);
  ledge('R', -980, 220);
  ledge('C', -1420, 180);
  wallPatch('L', -2000, 380, 'ice');
  ledge('R', -1900, 200);
  ledge('L', -2380, 160);
  // Kolce na spodzie półki: nie wolno uderzyć w nią od dołu.
  ledge('R', -2840, 260);
  ledge('R', -2804 + 0, 260, 'spikes', 20);
  wallPatch('R', -3500, 420, 'ice');
  ledge('L', -3300, 200);
  ledge('C', -3780, 140);
  wallPatch('L', -4400, 300, 'spikes');
  ledge('R', -4280, 220);
  ledge('L', -4750, 200, 'ice');
  ledge('R', -5200, 240);
  ledge('C', -5650, 200);

  return { blocks, start: { x: SHAFT.width / 2, y: -60 } };
}
