import { Container, Graphics, Text } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { Button, type Game, type View } from '@funfactory/kit2d';
import { startMusic, stopMusic } from './assets.ts';
import { newProgress } from './sim/progress.ts';
import { saveState, state } from './state.ts';
import { COLORS } from './ui.ts';

const HOLD = 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Zębatka strefy rodzica: trzeba ją przytrzymać przez 2 s (bramka przed dziećmi, wymóg kategorii Kids).
 * Pierścień wokół pokazuje postęp przytrzymania.
 */
export class ParentGate extends Container {
  private readonly ring = new Graphics();
  private held = 0;
  private holding = false;
  onOpen: (() => void) | null = null;

  constructor() {
    super();
    const g = new Graphics();
    const r = 30;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.roundRect(Math.cos(a) * r - 9, Math.sin(a) * r - 9, 18, 18, 4).fill({ color: 0xffffff });
    }
    g.circle(0, 0, r).fill({ color: 0xffffff }).circle(0, 0, 11).fill({ color: 0xb9b0c8 });
    g.alpha = 0.85;
    this.addChild(g, this.ring);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = { contains: (x: number, y: number) => x * x + y * y <= 60 * 60 };
    this.on('pointerdown', () => (this.holding = true));
    const stop = () => {
      this.holding = false;
      this.held = 0;
      this.ring.clear();
    };
    this.on('pointerup', stop);
    this.on('pointerupoutside', stop);
  }

  tick(dt: number): void {
    if (!this.holding) return;
    this.held += dt;
    const t = Math.min(1, this.held / HOLD);
    this.ring.clear().arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2).stroke({ color: COLORS.sun, width: 10, cap: 'round' });
    if (t >= 1) {
      this.holding = false;
      this.held = 0;
      this.ring.clear();
      haptics.success();
      this.onOpen?.();
    }
  }
}

/** Strefa rodzica: muzyka, zerowanie postępów, informacja o prywatności. */
export class ParentPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly buttons: Button[] = [];
  private confirmReset = false;

  constructor(game: Game, onClose: () => void) {
    super();
    const pr = game.pixelRatio;
    this.dim.eventMode = 'static';
    const text = (value: string, size: number, color: string, weight: '600' | '800') =>
      new Text({ text: value, anchor: 0.5, resolution: pr, style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill: color, align: 'center', wordWrap: true, wordWrapWidth: 560, lineHeight: size * 1.35 } });
    const title = text('Dla rodzica', 44, '#5a3c28', '800');
    title.y = 60;
    const info = text('Bystrzakowo działa bez internetu, bez reklam i nie zbiera żadnych danych. Postępy dziecka zapisują się tylko na tym urządzeniu.', 24, '#6b5a4a', '600');
    info.y = 150;
    const musicLabel = () => (state.progress.music ? 'Muzyka: włączona' : 'Muzyka: wyłączona');
    const music: Button = new Button({ label: musicLabel(), width: 440, height: 88, fontSize: 30, color: '#5cb3ff', resolution: pr, onTap: () => toggleMusic() });
    const toggleMusic = () => {
      state.progress.music = !state.progress.music;
      if (state.progress.music) startMusic(game);
      else stopMusic(game);
      music.setLabel(musicLabel());
      void saveState();
    };
    music.y = 260;
    const reset: Button = new Button({ label: 'Wyzeruj postępy', width: 440, height: 88, fontSize: 30, color: '#e8835a', resolution: pr, onTap: () => doReset() });
    const doReset = () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        reset.setLabel('Na pewno? Dotknij jeszcze raz');
        return;
      }
      const music = state.progress.music;
      state.progress = { ...newProgress(), music };
      void saveState();
      reset.setLabel('Wyzerowano');
    };
    reset.y = 370;
    const close = new Button({ label: 'Zamknij', width: 440, height: 88, fontSize: 30, color: '#5cc36a', resolution: pr, onTap: onClose });
    close.y = 480;
    this.buttons.push(music, reset, close);
    this.body.addChild(title, info, music, reset, close);
    this.addChild(this.dim, this.panel, this.body);
  }

  layout(view: View): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x2a1a40, alpha: 0.6 });
    const w = 660;
    const h = 560;
    const x = (view.width - w) / 2;
    const y = (view.height - h) / 2;
    this.panel.clear().roundRect(x, y, w, h, 36).fill({ color: 0xfffaf2 }).stroke({ color: COLORS.ink, width: 6 });
    this.body.position.set(view.width / 2, y);
  }

  tick(dt: number): void {
    for (const b of this.buttons) b.tick(dt);
  }
}
