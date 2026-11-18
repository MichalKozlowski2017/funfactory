import { Container, FillGradient, Graphics, Rectangle, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { haptics, SaveStore } from '@funfactory/core';
import {
  Button,
  dotTexture,
  FollowCamera,
  gestures,
  Particles,
  popIn,
  pulse,
  Scene,
  Shaker,
  type View,
} from '@funfactory/kit2d';
import { launchVelocity, PHYS, type Block } from '../sim/physics.ts';
import { Run, type RunStep } from '../sim/run.ts';
import { SHAFT } from '../sim/shaft.ts';

const pal = palettes.candy;

const COLORS = {
  wall: 0x3d2c55,
  sticky: 0xc9b6e4,
  ice: 0x9fe3ff,
  spikes: 0xff4f6d,
  syrup: 0xff8fb1,
  syrupTop: 0xffc2d4,
  slime: hexToNumber(pal.swatches[0]),
  ink: hexToNumber(pal.ink),
  dot: 0xffffff,
};

const FONT = 'system-ui, -apple-system, sans-serif';

interface Save {
  best: number;
}

/**
 * Krok 2: pełna pętla. Generowana studnia, syrop, śmierć, ekran końca, rekord.
 * Grafika nadal szara; sztuka przyjdzie w kroku 3.
 */
export class PlayScene extends Scene {
  readonly id = 'play';
  private readonly shake = new Container();
  private readonly world = new Container();
  private readonly chunkLayer = new Container();
  private readonly chunkViews = new Map<number, Graphics>();
  private readonly dotsG = new Graphics();
  private readonly syrupG = new Graphics();
  private readonly slime = new Container();
  private readonly body = new Container();
  private readonly eyes = new Container();
  private readonly pupils: Graphics[] = [];
  private readonly input = new Container();
  private readonly hud = new Container();
  private readonly overlay = new Container();
  /** Różowa poświata od dołu ekranu: syrop jest blisko. */
  private readonly glow = new Graphics();
  private heartbeat = 0;
  private run!: Run;
  private camera!: FollowCamera;
  private shaker!: Shaker;
  private sparks!: Particles;
  private heightText!: Text;
  private bestText!: Text;
  private hint!: Text;
  private syrupWarn!: Text;
  private againButton: Button | null = null;
  private aiming: { sx: number; sy: number; power: number; dx: number; dy: number } | null = null;
  private best = 0;
  private bestAtStart = 0;
  private runs = 0;
  private time = 0;
  private readonly save = new SaveStore<Save>('glut', { best: 0 });

  override async enter(): Promise<void> {
    this.best = (await this.save.load()).best;

    this.addChild(this.shake, this.hud, this.input, this.overlay);
    this.shake.addChild(this.world);
    this.world.addChild(this.chunkLayer, this.dotsG, this.slime, this.syrupG);
    this.buildSlime();
    this.sparks = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.world.addChild(this.sparks.view);

    this.shaker = new Shaker(this.shake, this.game.rng);
    this.camera = new FollowCamera(this.world, { upOnly: true, lambda: 5 });

    this.heightText = this.makeText(56, pal.surface);
    this.heightText.anchor.set(0.5, 0);
    this.bestText = this.makeText(26, pal.accent);
    this.bestText.anchor.set(0.5, 0);
    this.hint = this.makeText(34, pal.surface);
    this.hint.anchor.set(0.5);
    this.hint.text = 'Przeciągnij w dół i puść';
    this.syrupWarn = this.makeText(28, '#ffc2d4');
    this.syrupWarn.anchor.set(0.5, 1);
    this.hud.addChild(this.glow, this.heightText, this.bestText, this.hint, this.syrupWarn);

    const input = gestures(this.input, { dragThreshold: 10 });
    input.on('dragStart', ({ x, y }) => {
      if (this.run.slime.state === 'stuck' && !this.run.over) this.aiming = { sx: x, sy: y, power: 0, dx: 0, dy: -1 };
    });
    input.on('drag', ({ x, y }) => this.aim(x, y));
    input.on('dragEnd', ({ x, y }) => this.release(x, y));

    this.newRun();
    this.timers.after(0.1, () => this.game.markReady());
  }

  override resize(view: View): void {
    this.input.hitArea = new Rectangle(0, 0, view.width, view.height);
    this.heightText.position.set(view.width / 2, view.safe.top + 24);
    this.bestText.position.set(view.width / 2, view.safe.top + 92);
    this.hint.position.set(view.width / 2, view.height * 0.3);
    this.syrupWarn.position.set(view.width / 2, view.height - view.safe.bottom - 24);
    const glowH = view.height * 0.35;
    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: 'rgba(255,143,177,0)' },
        { offset: 0.7, color: 'rgba(255,143,177,0.35)' },
        { offset: 1, color: 'rgba(255,120,160,0.85)' },
      ],
    });
    this.glow.clear().rect(0, view.height - glowH, view.width, glowH).fill(gradient);
    this.camera.opts.maxY = this.floorView();
    if (!this.run.started) this.camera.snap(0, this.floorView());
    this.layoutOverlay();
  }

  override fixedUpdate(dt: number): void {
    this.react(this.run.step(dt));
  }

  override update(dt: number): void {
    this.time += dt;
    const s = this.run.slime;
    const view = this.game.view;
    if (s.state !== 'dead') {
      // Normalnie slime na 60% wysokości ekranu. Gdy syrop jest w zasięgu, kamera kadruje tak,
      // żeby jego powierzchnia była widoczna u dołu, ale slime zostaje co najmniej 30% od góry.
      let target = s.y - view.height * 0.6;
      if (this.run.started) target = Math.max(target, Math.min(this.run.syrupY - view.height + 170, s.y - view.height * 0.3));
      this.camera.follow(0, target, dt);
    }
    this.shaker.update(dt);
    this.sparks.update(dt);
    this.againButton?.tick(dt);
    this.placeSlime(dt);
    this.drawSyrup();

    const meters = this.run.meters;
    if (meters > this.best) {
      this.best = meters;
      void this.save.save({ best: this.best });
    }
    this.heightText.text = `${meters} m`;
    this.bestText.text = `rekord ${this.best} m`;

    this.pressure(dt);

    // Syrop pod ekranem: pokaż, jak daleko jest.
    const below = this.run.syrupY - (this.camera.y + view.height);
    this.syrupWarn.visible = this.run.started && !this.run.over && below > 0;
    if (this.syrupWarn.visible) {
      this.syrupWarn.text = `▼ syrop ${Math.ceil(below / 100)} m`;
      this.syrupWarn.alpha = below < 600 ? 0.6 + 0.4 * Math.sin(this.time * 12) : 0.7;
    }
  }

  /** Presja syropu: poświata, bąbelki z dołu ekranu i bicie serca, gdy jest tuż pod slime'em. */
  private pressure(dt: number): void {
    const run = this.run;
    const view = this.game.view;
    if (!run.started || run.over) {
      this.glow.alpha = Math.max(0, this.glow.alpha - dt * 3);
      return;
    }
    const screenBottom = this.camera.y + view.height;
    const below = run.syrupY - screenBottom;
    // 0 = syrop daleko, 1 = syrop na ekranie albo tuż pod nim.
    const near = Math.min(1, Math.max(0, 1 - below / 1300));
    const gap = run.syrupY - run.slime.y;
    const danger = Math.min(1, Math.max(0, 1 - (gap - 150) / 650));
    const beat = 0.5 + 0.5 * Math.sin(this.time * (3 + danger * 9));
    this.glow.alpha = near * (0.45 + 0.55 * beat) * (0.6 + 0.4 * danger);

    // Bąbelki wylatujące z dołu ekranu.
    if (this.game.rng.chance(near * dt * 30)) {
      const x = this.game.rng.range(60, SHAFT.width - 60);
      this.sparks.burst(x, Math.min(run.syrupY, screenBottom + 30), {
        count: 1 + Math.round(danger * 2),
        speed: [250, 520 + danger * 400],
        angle: -Math.PI / 2,
        spread: 0.5,
        life: [0.5, 1.0],
        scale: [0.5, 1.3],
        endScale: 0.2,
        gravity: 600,
        colors: [COLORS.syrup, COLORS.syrupTop],
      });
    }

    // Bicie serca w haptyce i lekkie drganie, gdy syrop jest o krok.
    if (danger > 0.55) {
      this.heartbeat -= dt;
      if (this.heartbeat <= 0) {
        haptics.tap();
        this.shaker.add(0.08 + danger * 0.08);
        this.heartbeat = 0.85 - danger * 0.45;
      }
    } else {
      this.heartbeat = 0;
    }
  }

  // --- bieg ---

  private newRun(): void {
    this.runs++;
    this.run = new Run(this.game.rng.int(1, 2 ** 31 - 1));
    this.bestAtStart = this.best;
    for (const view of this.chunkViews.values()) view.destroy();
    this.chunkViews.clear();
    for (const k of this.run.shaft.chunks.keys()) this.addChunkView(k);
    this.overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.againButton = null;
    this.slime.visible = true;
    this.slime.scale.set(1);
    this.hint.visible = this.runs === 1;
    this.glow.alpha = 0;
    this.heartbeat = 0;
    this.camera.snap(0, this.floorView());
  }

  private floorView(): number {
    return 160 - this.game.view.height;
  }

  // --- sterowanie ---

  private aim(x: number, y: number): void {
    if (!this.aiming || this.run.slime.state !== 'stuck') return;
    const v = launchVelocity(x - this.aiming.sx, y - this.aiming.sy);
    this.dotsG.clear();
    this.aiming.power = v?.power ?? 0;
    if (!v) return;
    const speed = Math.hypot(v.vx, v.vy);
    this.aiming.dx = v.vx / speed;
    this.aiming.dy = v.vy / speed;
    const p = this.run.world.predict(v.vx, v.vy);
    p.points.forEach((pt, i) => {
      const last = i === p.points.length - 1;
      const t = i / Math.max(1, p.points.length - 1);
      const color = last && p.end === 'death' ? COLORS.spikes : COLORS.dot;
      this.dotsG.circle(pt.x, pt.y, last && p.end ? 10 : 9 - t * 5).fill({ color, alpha: last ? 0.95 : 0.85 - t * 0.5 });
    });
  }

  private release(x: number, y: number): void {
    const aiming = this.aiming;
    this.aiming = null;
    this.dotsG.clear();
    if (!aiming) return;
    const v = launchVelocity(x - aiming.sx, y - aiming.sy);
    if (!v || !this.run.launch(v.vx, v.vy)) return;
    this.hint.visible = false;
    haptics.tap();
  }

  // --- reakcje na zdarzenia ---

  private react(r: RunStep): void {
    for (const k of r.added ?? []) this.addChunkView(k);
    for (const k of r.removed ?? []) {
      this.chunkViews.get(k)?.destroy();
      this.chunkViews.delete(k);
    }
    if (r.landed) {
      const l = r.landed;
      const strength = Math.min(1, l.speed / PHYS.maxSpeed);
      this.squash(0.15 + strength * 0.3);
      if (strength > 0.15) {
        this.sparks.burst(l.x - l.nx * PHYS.radius, l.y - l.ny * PHYS.radius, {
          count: Math.round(6 + strength * 14),
          speed: [120, 260 + strength * 400],
          angle: Math.atan2(l.ny, l.nx),
          spread: Math.PI * 0.9,
          life: [0.25, 0.5],
          scale: [0.5, 1.1],
          gravity: 1800,
          colors: [COLORS.slime, 0xffffff],
        });
        haptics.hit();
      }
      if (strength > 0.6) this.shaker.add(0.25);
    }
    if (r.died) this.die('spikes');
    if (r.drowned) this.die('syrup');
  }

  private die(cause: 'spikes' | 'syrup'): void {
    const s = this.run.slime;
    this.aiming = null;
    this.dotsG.clear();
    this.game.hitstop(0.08);
    this.shaker.add(0.7);
    haptics.error();
    this.sparks.burst(s.x, s.y, {
      count: 40,
      speed: [200, 900],
      angle: cause === 'syrup' ? -Math.PI / 2 : 0,
      spread: cause === 'syrup' ? Math.PI : Math.PI * 2,
      life: [0.4, 0.9],
      scale: [0.6, 1.6],
      endScale: 0.3,
      gravity: 2000,
      drag: 1,
      colors: cause === 'syrup' ? [COLORS.slime, COLORS.syrup, 0xffffff] : [COLORS.slime, 0xffffff, COLORS.spikes],
    });
    this.slime.visible = false;
    this.timers.after(0.55, () => this.showGameOver(cause));
  }

  private showGameOver(cause: 'spikes' | 'syrup'): void {
    const meters = this.run.meters;
    const record = meters > this.bestAtStart && meters > 0;
    const panel = new Container();
    const dim = new Graphics();
    dim.label = 'dim';
    const title = this.makeText(52, pal.surface);
    title.text = cause === 'syrup' ? 'Syrop cię dopadł!' : 'Au, kolce!';
    const score = this.makeText(110, '#ffffff');
    score.text = `${meters} m`;
    const sub = this.makeText(34, record ? pal.accent : pal.surface);
    sub.text = record ? 'Nowy rekord!' : `rekord ${this.best} m`;
    for (const t of [title, score, sub]) t.anchor.set(0.5);
    title.position.set(0, -230);
    score.position.set(0, -110);
    sub.position.set(0, -10);
    const again = new Button({
      label: 'Jeszcze raz',
      color: pal.accent,
      width: 380,
      resolution: this.game.pixelRatio,
      onTap: () => this.newRun(),
    });
    again.position.set(0, 140);
    this.againButton = again;
    panel.addChild(title, score, sub, again);
    panel.label = 'panel';
    this.overlay.addChild(dim, panel);
    this.layoutOverlay();
    dim.alpha = 0;
    this.tweens.to(dim, { alpha: 1 }, { duration: 0.25 });
    void popIn(this.tweens, panel, 0.4);
    if (record) {
      haptics.success();
      this.timers.after(0.35, () => void pulse(this.tweens, sub, 0.25));
    }
  }

  private layoutOverlay(): void {
    const view = this.game.view;
    const dim = this.overlay.getChildByLabel('dim') as Graphics | null;
    dim?.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.72 });
    this.overlay.getChildByLabel('panel')?.position.set(view.width / 2, view.height * 0.45);
  }

  // --- wygląd (szary) ---

  private makeText(size: number, color: string): Text {
    return new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: size, fontWeight: '800', fill: color },
      resolution: this.game.pixelRatio,
    });
  }

  private addChunkView(k: number): void {
    const blocks = this.run.shaft.chunks.get(k);
    if (!blocks || this.chunkViews.has(k)) return;
    const g = new Graphics();
    for (const b of blocks) this.drawBlock(g, b);
    this.chunkViews.set(k, g);
    this.chunkLayer.addChild(g);
  }

  private drawBlock(g: Graphics, b: Block): void {
    const isWall = b.x < 0 || b.x >= SHAFT.width - SHAFT.wall;
    const color = isWall && b.surface === 'sticky' ? COLORS.wall : COLORS[b.surface];
    g.roundRect(b.x, b.y, b.w, b.h, isWall ? 0 : 10).fill({ color });
    if (b.surface !== 'spikes') return;
    if (isWall) {
      // Zęby karmelu skierowane do środka studni.
      const left = b.x < 0;
      const edge = left ? b.x + b.w : b.x;
      const dir = left ? 1 : -1;
      const n = Math.max(1, Math.floor(b.h / 28));
      for (let i = 0; i < n; i++) {
        const y = b.y + (i + 0.5) * (b.h / n);
        g.poly([edge, y - 12, edge + dir * 20, y, edge, y + 12]).fill({ color: COLORS.spikes });
      }
    } else {
      // Pod półką: zęby w dół.
      const n = Math.max(1, Math.floor(b.w / 28));
      for (let i = 0; i < n; i++) {
        const x = b.x + (i + 0.5) * (b.w / n);
        g.poly([x - 12, b.y + b.h, x, b.y + b.h + 20, x + 12, b.y + b.h]).fill({ color: COLORS.spikes });
      }
    }
  }

  private drawSyrup(): void {
    const y = this.run.syrupY;
    const bottom = this.camera.y + this.game.view.height + 200;
    const g = this.syrupG.clear();
    if (y > bottom) return;
    const wave: number[] = [];
    for (let x = -40; x <= SHAFT.width + 40; x += 30) {
      wave.push(x, y + Math.sin(x * 0.02 + this.time * 3) * 8 + Math.sin(x * 0.045 - this.time * 2) * 5);
    }
    g.poly([...wave, SHAFT.width + 40, bottom, -40, bottom]).fill({ color: COLORS.syrup, alpha: 0.92 });
    // Jaśniejszy pas tuż pod powierzchnią: fala, potem ta sama fala przesunięta w dół, w odwrotnej kolejności.
    const band: number[] = [...wave];
    for (let i = wave.length - 2; i >= 0; i -= 2) band.push(wave[i] as number, (wave[i + 1] as number) + 14);
    g.poly(band).fill({ color: COLORS.syrupTop, alpha: 0.9 });
  }

  private buildSlime(): void {
    const r = PHYS.radius;
    const blob = new Graphics().circle(0, -r, r).fill({ color: COLORS.slime }).stroke({ color: COLORS.ink, width: 5 });
    blob.circle(-r * 0.35, -r * 1.45, r * 0.22).fill({ color: 0xffffff, alpha: 0.5 });
    this.body.addChild(blob);
    for (const dx of [-11, 11]) {
      const white = new Graphics().ellipse(dx, -4, 8, 10).fill({ color: 0xffffff }).stroke({ color: COLORS.ink, width: 3 });
      const pupil = new Graphics().circle(0, 0, 4).fill({ color: COLORS.ink });
      pupil.position.set(dx, -3);
      this.pupils.push(pupil);
      this.eyes.addChild(white, pupil);
    }
    this.slime.addChild(this.body, this.eyes);
  }

  private squash(amount: number): void {
    const body = this.body;
    this.tweens.killOf(body.scale);
    body.scale.set(1 + amount, 1 - amount);
    this.tweens.to(body.scale, { x: 1, y: 1 }, { duration: 0.45, ease: 'elasticOut' });
  }

  private placeSlime(dt: number): void {
    const s = this.run.slime;
    const r = PHYS.radius;
    this.slime.position.set(s.x, s.y);
    let look = { x: 0, y: 0 };
    if (s.state === 'flying') {
      const speed = Math.hypot(s.vx, s.vy);
      const dirX = speed > 1 ? s.vx / speed : 0;
      const dirY = speed > 1 ? s.vy / speed : -1;
      this.body.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
      this.body.position.set(-dirX * r, -dirY * r);
      const stretch = Math.min(0.35, speed / 6000);
      this.tweens.killOf(this.body.scale);
      this.body.scale.set(1 - stretch * 0.6, 1 + stretch);
      look = { x: dirX, y: dirY };
    } else if (s.state === 'stuck') {
      this.body.rotation = Math.atan2(s.ny, s.nx) + Math.PI / 2;
      this.body.position.set(-s.nx * r, -s.ny * r);
      if (this.aiming && this.aiming.power > 0) {
        const p = this.aiming.power;
        const tremble = p > 0.98 ? (this.game.rng.next() - 0.5) * 0.04 : 0;
        this.body.scale.set(1 + p * 0.15 + tremble, 1 - p * 0.22 + tremble);
      }
      if (this.aiming) look = { x: this.aiming.dx, y: this.aiming.dy };
    }
    for (const pupil of this.pupils) {
      const baseX = pupil.x > 0 ? 11 : -11;
      pupil.x += (baseX + look.x * 3 - pupil.x) * Math.min(1, dt * 12);
      pupil.y += (-3 + look.y * 4 - pupil.y) * Math.min(1, dt * 12);
    }
  }
}
