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

/** Krój tabliczek z metrami (Lilita One, OFL): cyfry i krótkie podpisy. */
export const SIGN_FONT = 'glut-sign';
let signInstalled = false;

/** Wczytuje Lilita One i instaluje z niej atlas (raz). Bez pliku fontu atlas powstaje z kroju systemowego. */
export async function installSignFont(pixelRatio: number): Promise<void> {
  if (signInstalled) return;
  signInstalled = true;
  let family = 'system-ui, -apple-system, sans-serif';
  try {
    const face = new FontFace('Lilita One', `url(${import.meta.env.BASE_URL}fonts/lilita-one.ttf)`);
    document.fonts.add(await face.load());
    family = '"Lilita One", system-ui, sans-serif';
  } catch {
    // zostaje krój systemowy
  }
  BitmapFont.install({
    name: SIGN_FONT,
    chars: CHARS,
    resolution: Math.min(4, pixelRatio * 1.1),
    padding: 6,
    style: {
      fontFamily: family,
      fontSize: BASE,
      fill: '#ffffff',
      stroke: { color: '#1e1530', width: BASE * 0.14, join: 'round' },
      letterSpacing: 2,
    },
  });
}

/** Napis na tabliczce (Lilita One). */
export function signText(size: number, color: string | number): BitmapText {
  const t = new BitmapText({ text: '', style: { fontFamily: SIGN_FONT, fontSize: size } });
  t.tint = color;
  return t;
}
