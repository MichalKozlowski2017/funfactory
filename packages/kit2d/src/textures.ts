import { Graphics, ImageSource, type Renderer, Texture } from 'pixi.js';

const blank = new WeakSet<Texture>();

/** true, jeśli przeglądarka nie zdołała narysować SVG (tekstura jest pusta). Wtedy użyj zapasowej grafiki. */
export const isBlankTexture = (texture: Texture): boolean => blank.has(texture);

function isEmpty(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4 * 7) if ((data[i] as number) > 0) return false;
  return true;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * SVG -> tekstura w rozdzielczości urządzenia. Rozmiar logiczny tekstury = rozmiar SVG,
 * więc sprite ma wymiary w jednostkach gry, a piksele są ostre na Retinie.
 *
 * `pixelRatio` bierz z `game.pixelRatio` (ewentualnie ×1.5, jeśli obiekt będzie powiększany).
 *
 * Mobilne przeglądarki potrafią zgłosić obraz SVG jako gotowy, zanim da się go narysować
 * (wynik: pusta tekstura). Dlatego rysujemy ponownie w kolejnych klatkach, aż coś się pojawi.
 * Gdy mimo to jest pusto, tekstura jest oznaczona (`isBlankTexture`).
 *
 * Do GPU idzie ImageBitmap z odczytanych pikseli, a nie sam canvas: na prawdziwym iPhonie WebKit
 * rysuje większe canvasy w procesie GPU i wgranie canvasa do WebGL dawało przezroczystą teksturę
 * (symulator tego nie odtwarza).
 */
export async function svgTexture(markup: string, pixelRatio: number): Promise<Texture> {
  const blob = new Blob([markup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const sizeMatch = /<svg[^>]*\swidth="([\d.]+)"[^>]*\sheight="([\d.]+)"/.exec(markup);
    const img = new Image();
    if (sizeMatch) {
      img.width = Number(sizeMatch[1]);
      img.height = Number(sizeMatch[2]);
    }
    img.src = url;
    await img.decode();
    const res = Math.max(1, Math.min(pixelRatio, 4));
    const w = Number(sizeMatch?.[1]) || img.naturalWidth || img.width;
    const h = Number(sizeMatch?.[2]) || img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * res);
    canvas.height = Math.ceil(h * res);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('svgTexture: no 2d context');
    let empty = true;
    for (let attempt = 0; attempt < 8 && empty; attempt++) {
      if (attempt > 0) await nextFrame();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      empty = isEmpty(ctx, canvas.width, canvas.height);
    }
    const texture = await pixelsToTexture(ctx.getImageData(0, 0, canvas.width, canvas.height), res);
    if (empty) {
      blank.add(texture);
      console.warn('svgTexture: SVG rendered empty, use a fallback');
    }
    return texture;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Piksele -> tekstura przez ImageBitmap: ta sama ścieżka co zwykłe pliki PNG/JPG,
 * niezależna od tego, jak przeglądarka trzyma canvas (GPU/CPU).
 */
export async function pixelsToTexture(image: ImageData, resolution = 1): Promise<Texture> {
  const bitmap = await createImageBitmap(image);
  return new Texture({ source: new ImageSource({ resource: bitmap, resolution }) });
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
