import { BitmapFont, BitmapText } from 'pixi.js';

/**
 * Tekst bitmapowy do napisów, które zmieniają się w trakcie gry (metry, cukierki, serie, „Combo ×3”).
 * Zwykły Text przy każdej zmianie rysuje się od nowa na canvasie i wgrywa jako tekstura do GPU,
 * co na iPhonie daje zacięcia. Tu glify są w jednym atlasie wgranym raz; zmiana tekstu to tylko
 * przestawienie sprite'ów. Wygląd jak `makeText`: biały krój z ciemnym obrysem, kolor przez tint.
 */
export const HUD_FONT = 'glut-hud';
const BASE = 72;

const CHARS = [
  ['a', 'z'],
  ['A', 'Z'],
  ['0', '9'],
  ' ąćęłńóśźżĄĆĘŁŃÓŚŹŻ!?.,:;+-–×▼▲·/()%\'"#&*',
];

let installed = false;

/** Instaluje atlas (raz). `pixelRatio` z gry: glify są ostre do rozmiaru ok. BASE. */
export function installHudFont(pixelRatio: number): void {
  if (installed) return;
  installed = true;
  BitmapFont.install({
    name: HUD_FONT,
    chars: CHARS,
    resolution: Math.min(4, pixelRatio * 1.1),
    padding: 6,
    style: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: BASE,
      fontWeight: '800',
      fill: '#ffffff',
      stroke: { color: '#1e1530', width: BASE * 0.12, join: 'round' },
    },
  });
}

/** Napis HUD w rozmiarze `size` i kolorze `color` (tint). */
export function hudText(size: number, color: string | number): BitmapText {
  const t = new BitmapText({ text: '', style: { fontFamily: HUD_FONT, fontSize: size } });
  t.tint = color;
  return t;
}
