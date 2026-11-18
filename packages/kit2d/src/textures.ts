import { CanvasSource, Graphics, type Renderer, Texture } from 'pixi.js';

/**
 * SVG -> tekstura w rozdzielczości urządzenia. Rozmiar logiczny tekstury = rozmiar SVG,
 * więc sprite ma wymiary w jednostkach gry, a piksele są ostre na Retinie.
 *
 * `pixelRatio` bierz z `game.pixelRatio` (ewentualnie ×1.5, jeśli obiekt będzie powiększany).
 */
export async function svgTexture(markup: string, pixelRatio: number): Promise<Texture> {
  const blob = new Blob([markup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const res = Math.max(1, Math.min(pixelRatio, 4));
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * res);
    canvas.height = Math.ceil(h * res);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('svgTexture: no 2d context');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return new Texture({ source: new CanvasSource({ resource: canvas, resolution: res }) });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Kilka tekstur SVG naraz: `{ body: '<svg…>', eye: '<svg…>' }` -> `{ body: Texture, eye: Texture }`. */
export async function svgTextures<K extends string>(
  sources: Record<K, string>,
  pixelRatio: number,
): Promise<Record<K, Texture>> {
  const entries = await Promise.all(
    (Object.entries(sources) as [K, string][]).map(async ([k, m]) => [k, await svgTexture(m, pixelRatio)] as const),
  );
  return Object.fromEntries(entries) as Record<K, Texture>;
}

/** Miękkie białe kółko do cząsteczek (tint nadaje kolor). */
export function dotTexture(renderer: Renderer, radius = 8, soft = true): Texture {
  const g = new Graphics();
  if (soft) {
    for (let i = 4; i >= 1; i--) g.circle(radius, radius, (radius * i) / 4).fill({ color: 0xffffff, alpha: 0.25 });
  } else {
    g.circle(radius, radius, radius).fill({ color: 0xffffff });
  }
  const texture = renderer.generateTexture({ target: g, resolution: 2, antialias: true });
  g.destroy();
  return texture;
}
