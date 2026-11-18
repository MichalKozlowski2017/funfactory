import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { haptics, SaveStore } from '@funfactory/core';
import { dotTexture, FollowCamera, gestures, Particles, Scene, Shaker, type View } from '@funfactory/kit2d';
import { prototypeLevel, SHAFT } from '../sim/level.ts';
import { launchVelocity, PHYS, World, type Block, type StepResult } from '../sim/physics.ts';

const pal = palettes.candy;

const COLORS = {
  wall: 0x3d2c55,
  sticky: 0xc9b6e4,
  ice: 0x9fe3ff,
  spikes: 0xff4f6d,
  slime: hexToNumber(pal.swatches[0]),
  ink: hexToNumber(pal.ink),
  dot: 0xffffff,
};

interface Save {
  best: number;
}

/**
 * Szary prototyp (krok 1): proca, lot, przyklejanie, lód, kolce, kamera.
 * Grafika to proste kształty; tu sprawdzamy, czy samo strzelanie daje frajdę.
 */
export class PlayScene extends Scene {
  readonly id = 'play';
  private readonly shake = new Container();
  private readonly world = new Container();
  private readonly blocksG = new Graphics();
  private readonly dotsG = new Graphics();
  private readonly slime = new Container();
  private readonly body = new Container();
  private readonly eyes = new Container();
  private readonly pupils: Graphics[] = [];
  private readonly input = new Container();
  private readonly hud = new Container();
  private sim!: World;
  private camera!: FollowCamera;
  private shaker!: Shaker;
  private sparks!: Particles;
  private heightText!: Text;
  private bestText!: Text;
  private hint!: Text;
  private start = { x: 0, y: 0 };
  private aiming: { sx: number; sy: number; power: number; dx: number; dy: number } | null = null;
  private respawning = false;
  private best = 0;
  private readonly save = new SaveStore<Save>('glut', { best: 0 });

  override async enter(): Promise<void> {
    this.best = (await this.save.load()).best;
    const level = prototypeLevel();
    this.sim = new World(level.blocks, level.start);
    this.start = { x: this.sim.slime.x, y: this.sim.slime.y };

    this.addChild(this.shake, this.hud, this.input);
    this.shake.addChild(this.world);
    this.world.addChild(this.blocksG, this.dotsG, this.slime);
    this.drawBlocks(level.blocks);
    this.buildSlime();

    this.sparks = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.world.addChild(this.sparks.view);

    this.shaker = new Shaker(this.shake, this.game.rng);
    this.camera = new FollowCamera(this.world, { upOnly: true, lambda: 5 });

    const label = (size: number, color: string) =>
      new Text({
        text: '',
        style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '800', fill: color },
        resolution: this.game.pixelRatio,
      });
    this.heightText = label(56, pal.surface);
    this.heightText.anchor.set(0.5, 0);
    this.bestText = label(26, pal.accent);
    this.bestText.anchor.set(0.5, 0);
    this.hint = label(34, pal.surface);
    this.hint.anchor.set(0.5);
    this.hint.text = 'Przeciągnij w dół i puść';
    this.hud.addChild(this.heightText, this.bestText, this.hint);

    const input = gestures(this.input, { dragThreshold: 10 });
    input.on('dragStart', ({ x, y }) => {
      if (this.sim.slime.state === 'stuck') this.aiming = { sx: x, sy: y, power: 0, dx: 0, dy: -1 };
    });
    input.on('drag', ({ x, y }) => this.aim(x, y));
    input.on('dragEnd', ({ x, y }) => this.release(x, y));

    this.timers.after(0.1, () => this.game.markReady());
  }

  override resize(view: View): void {
    this.input.hitArea = new Rectangle(0, 0, view.width, view.height);
    this.heightText.position.set(view.width / 2, view.safe.top + 24);
    this.bestText.position.set(view.width / 2, view.safe.top + 92);
    this.hint.position.set(view.width / 2, view.height * 0.3);
    const floorView = 160 - view.height;
    this.camera.opts.maxY = floorView;
    if (this.camera.y === 0) this.camera.snap(0, floorView);
  }

  override fixedUpdate(dt: number): void {
    const result = this.sim.step(dt);
    this.react(result);
  }

  override update(dt: number): void {
    const s = this.sim.slime;
    this.camera.follow(0, s.y - this.game.view.height * 0.6, dt);
    this.shaker.update(dt);
    this.sparks.update(dt);
    this.placeSlime(dt);
    const meters = Math.max(0, Math.floor((this.start.y - s.y) / 100));
    if (meters > this.best) {
      this.best = meters;
      void this.save.save({ best: this.best });
    }
    this.heightText.text = `${meters} m`;
    this.bestText.text = `rekord ${this.best} m`;
  }

  // --- sterowanie ---

  private aim(x: number, y: number): void {
    if (!this.aiming || this.sim.slime.state !== 'stuck') return;
    const v = launchVelocity(x - this.aiming.sx, y - this.aiming.sy);
    this.dotsG.clear();
    this.aiming.power = v?.power ?? 0;
    if (!v) return;
    const speed = Math.hypot(v.vx, v.vy);
    this.aiming.dx = v.vx / speed;
    this.aiming.dy = v.vy / speed;
    const points = this.sim.predict(v.vx, v.vy);
    points.forEach((p, i) => {
      const t = i / Math.max(1, points.length - 1);
      this.dotsG.circle(p.x, p.y, 9 - t * 5).fill({ color: COLORS.dot, alpha: 0.85 - t * 0.5 });
    });
  }

  private release(x: number, y: number): void {
    const aiming = this.aiming;
    this.aiming = null;
    this.dotsG.clear();
    if (!aiming) return;
    const v = launchVelocity(x - aiming.sx, y - aiming.sy);
    if (!v || !this.sim.launch(v.vx, v.vy)) return;
    this.hint.visible = false;
    haptics.tap();
  }

  // --- reakcje na zdarzenia fizyki ---

  private react(result: StepResult): void {
    if (result.landed) {
      const l = result.landed;
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
    if (result.died) void this.die();
  }

  private async die(): Promise<void> {
    if (this.respawning) return;
    this.respawning = true;
    const s = this.sim.slime;
    this.game.hitstop(0.08);
    this.shaker.add(0.7);
    haptics.error();
    this.sparks.burst(s.x, s.y, {
      count: 40,
      speed: [200, 900],
      life: [0.4, 0.9],
      scale: [0.6, 1.6],
      endScale: 0.3,
      gravity: 2000,
      drag: 1,
      colors: [COLORS.slime, 0xffffff, COLORS.spikes],
    });
    this.slime.visible = false;
    await this.tweens.wait(0.8);
    s.x = this.start.x;
    s.y = this.start.y - 200;
    this.sim.settle();
    this.camera.snap(0, 160 - this.game.view.height);
    this.slime.visible = true;
    this.slime.scale.set(0);
    await this.tweens.to(this.slime.scale, { x: 1, y: 1 }, { duration: 0.35, ease: 'backOut' }).done;
    this.respawning = false;
  }

  // --- wygląd (szary prototyp) ---

  private drawBlocks(blocks: Block[]): void {
    const g = this.blocksG;
    for (const b of blocks) {
      const isWall = b.h > 2000 || b.w > SHAFT.width;
      const color = isWall && b.surface === 'sticky' ? COLORS.wall : COLORS[b.surface];
      g.roundRect(b.x, b.y, b.w, b.h, isWall ? 0 : 10).fill({ color });
      if (b.surface === 'spikes') {
        // Zęby karmelu skierowane na zewnątrz (w dół dla półki, do środka dla ściany).
        const vertical = b.h > b.w;
        const n = Math.floor((vertical ? b.h : b.w) / 28);
        for (let i = 0; i < n; i++) {
          if (vertical) {
            const y = b.y + (i + 0.5) * (b.h / n);
            const inward = b.x < SHAFT.width / 2 ? b.x + b.w : b.x;
            const dir = b.x < SHAFT.width / 2 ? 1 : -1;
            g.poly([inward, y - 12, inward + dir * 22, y, inward, y + 12]).fill({ color: COLORS.spikes });
          } else {
            const x = b.x + (i + 0.5) * (b.w / n);
            g.poly([x - 12, b.y + b.h, x, b.y + b.h + 22, x + 12, b.y + b.h]).fill({ color: COLORS.spikes });
          }
        }
      }
    }
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
    this.world.addChild(this.slime);
  }

  private squash(amount: number): void {
    const body = this.body;
    this.tweens.killOf(body.scale);
    body.scale.set(1 + amount, 1 - amount);
    this.tweens.to(body.scale, { x: 1, y: 1 }, { duration: 0.45, ease: 'elasticOut' });
  }

  private placeSlime(dt: number): void {
    const s = this.sim.slime;
    const r = PHYS.radius;
    this.slime.position.set(s.x, s.y);
    let look = { x: 0, y: 0 };
    if (s.state === 'flying') {
      // Rozciągnięcie wzdłuż prędkości.
      const speed = Math.hypot(s.vx, s.vy);
      const dirX = speed > 1 ? s.vx / speed : 0;
      const dirY = speed > 1 ? s.vy / speed : -1;
      this.body.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
      this.body.position.set(-dirX * r, -dirY * r);
      const stretch = Math.min(0.35, speed / 6000);
      this.tweens.killOf(this.body.scale);
      this.body.scale.set(1 - stretch * 0.6, 1 + stretch);
      look = { x: dirX, y: dirY };
    } else {
      // Przyklejony: oś ciała wzdłuż normalnej powierzchni, podstawa przy powierzchni.
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
