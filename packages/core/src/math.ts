export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number): number => (a === b ? 0 : (v - a) / (b - a));

export const remap = (v: number, a0: number, a1: number, b0: number, b1: number): number =>
  lerp(b0, b1, invLerp(a0, a1, v));

/**
 * Wygładzanie niezależne od liczby klatek: `x = damp(x, target, 10, dt)`.
 * `lambda` to szybkość dochodzenia (większa = szybciej).
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Najkrótsza różnica kątów w radianach, wynik w (-PI, PI]. */
export const angleDelta = (from: number, to: number): number => {
  const d = (to - from) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d <= -Math.PI ? d + Math.PI * 2 : d;
};

export const approach = (current: number, target: number, step: number): number =>
  current < target ? Math.min(current + step, target) : Math.max(current - step, target);
