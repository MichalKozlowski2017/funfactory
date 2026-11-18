import { PHYS } from './physics.ts';

/** Tryby sterowania (eksperyment): proca (ciągnij w przeciwną stronę), swipe (przesuń w stronę skoku), tap (stuknij cel). */
export type ControlMode = 'drag' | 'swipe' | 'tap';
export const CONTROL_MODES: ControlMode[] = ['drag', 'swipe', 'tap'];
export const CONTROL_NAMES: Record<ControlMode, string> = { drag: 'Proca', swipe: 'Swipe', tap: 'Tap' };

/**
 * Sterowanie tapnięciem (eksperyment na gałęzi `tap-sterowanie`): dotyk wskazuje kierunek skoku,
 * a odległość palca od slime'a reguluje siłę. Przekładamy to na „przeciągnięcie” procy,
 * więc fizyka, podgląd toru i bot zostają bez zmian.
 */
export const TAP = {
  /** Bliżej niż tyle (palec na slimie) nie strzelamy. */
  dead: 60,
  /** Od tej odległości minimalna siła. */
  min: 90,
  /** Od tej odległości pełna siła. */
  max: 480,
} as const;

/** Wektor przeciągnięcia procy dla dotyku w (px, py), gdy slime jest w (sx, sy). Null: za blisko. */
export function tapToDrag(sx: number, sy: number, px: number, py: number): { x: number; y: number } | null {
  const dx = px - sx;
  const dy = py - sy;
  const d = Math.hypot(dx, dy);
  if (d < TAP.dead) return null;
  const t = Math.min(1, Math.max(0, (d - TAP.min) / (TAP.max - TAP.min)));
  const len = PHYS.minDrag + 1 + (PHYS.maxDrag - PHYS.minDrag - 1) * t;
  // Proca strzela przeciwnie do przeciągnięcia, więc „ciągniemy” od palca.
  return { x: (-dx / d) * len, y: (-dy / d) * len };
}

/** Odwrotność: gdzie stuknąć, żeby dać to przeciągnięcie (do pokazania palca bota). */
export function dragToTap(sx: number, sy: number, dragX: number, dragY: number): { x: number; y: number } {
  const len = Math.hypot(dragX, dragY) || 1;
  const t = Math.min(1, Math.max(0, (len - PHYS.minDrag - 1) / (PHYS.maxDrag - PHYS.minDrag - 1)));
  const d = TAP.min + (TAP.max - TAP.min) * t;
  return { x: sx - (dragX / len) * d, y: sy - (dragY / len) * d };
}
