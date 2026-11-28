/** A promo clip described as data: one template (GamePromo) for every game and language. Paths are relative to public/. */

/** A gameplay cut from a recording (playtest `rec:` or the in-game bot), with its caption. */
export type Shot = {
  src: string;
  /** Start in the recording (seconds). */
  fromSec: number;
  durationSec: number;
  caption: string;
  /** Caption top edge for this shot (px), e.g. lower when an in-game panel fills the middle. */
  captionTop?: number;
  /** `hard`: no slide before this shot (it continues the previous one in the recording). */
  cut?: 'slide' | 'hard';
  /** Pulsing glow from the bottom edge: the danger (syrup) is right behind. */
  danger?: boolean;
};

export type PromoProps = {
  /** Opening animation (e.g. Wan on Legion from Flux art), played faster for energy. Leave out to open on gameplay. */
  intro?: { src: string; durationSec: number; playbackRate: number; caption: string };
  shots: Shot[];
  end: EndProps;
  music: { src: string; volume: number };
  /** Sound of the recordings under the music (0 = muted; the in-game music clashes with the track). */
  gameVolume: number;
  /** Caption top edge (px) during gameplay: above the TikTok/Reels bottom bar, below the game HUD. */
  captionTop: number;
  colors: { ink: string; text: string; highlight: string; logo: string; cta: string; danger: string };
  /** Length of the cut between scenes (frames). */
  transitionFrames: number;
};

/** A character cut-out (transparent PNG) that pops in and stays, e.g. the game's guides pointing at the screen. */
export type Character = {
  src: string;
  /** Left edge and top edge (px, may be negative). */
  x: number;
  y: number;
  width: number;
  /** Mirror horizontally (a pose pointing right placed on the right side). */
  flip?: boolean;
  delaySec: number;
};

/** End card: art with a slow zoom, game logo, tagline and a pulsing call to action. */
export type EndProps = {
  image: string;
  logo: string;
  tagline: string;
  cta: string;
  durationSec: number;
  /** `game`: the logo in Lilita One (Glut's font); `round`: Baloo 2 (Polish letters, kids' apps). */
  logoFont?: 'game' | 'round';
  characters?: Character[];
};

export const FPS = 30;

/** Total length: scenes minus the overlaps of the transitions between them. */
export const promoFrames = (p: PromoProps) => {
  const scenes = [...(p.intro ? [p.intro.durationSec] : []), ...p.shots.map((s) => s.durationSec), p.end.durationSec];
  const slides = scenes.length - 1 - p.shots.filter((s) => s.cut === 'hard').length;
  return scenes.reduce((a, s) => a + Math.round(s * FPS), 0) - p.transitionFrames * slides;
};
