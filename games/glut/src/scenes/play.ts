import { Assets, Container, FillGradient, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { circle, defs, ellipse, hexToNumber, palettes, path, radialGradient, svg } from '@funfactory/art';
import { haptics, SaveStore, Spring } from '@funfactory/core';
import {
  Button,
  dotTexture,
  FollowCamera,
  gestures,
  Particles,
  pixelsToTexture,
  popIn,
  pulse,
  Scene,
  Shaker,
  svgTexture,
  type View,
} from '@funfactory/kit2d';
import { fallbackIcon, POWER_INFO, POWER_KINDS, PowerBubble, PowerHud } from '../fx/power-fx.ts';
import { POWER_SFX, SFX } from '../fx/sfx.ts';
import { bodyScale, bodySprite, SlimeFace, slimeTextures } from '../fx/slime-art.ts';
import { drawBlock, SURFACE } from '../fx/surfaces.ts';
import { botCanShoot, chooseShot, type BotShot } from '../sim/bot.ts';
import { launchVelocity, PHYS } from '../sim/physics.ts';
import { Run, type RunStep } from '../sim/run.ts';
import { SHAFT, type Candy, type PowerKind, type PowerUp } from '../sim/shaft.ts';
import { HATS, NEW_SAVE, normalizeSave, tapHat, type Save } from '../sim/shop.ts';
import { ShopPanel } from '../ui/shop-panel.ts';
import { TitleOverlay } from '../ui/title.ts';

const pal = palettes.candy;

const COLORS = {
  syrup: 0xff8fb1,
  syrupTop: 0xffc2d4,
  slime: hexToNumber(pal.swatches[0]),
  dot: 0xffffff,
  danger: SURFACE.caramel,
};

const FONT = 'system-ui, -apple-system, sans-serif';
/** Autopilot (?bot): tempo „ludzkiego” bota do nagrań i pokazów. */
const PILOT = { reaction: 0.35, aimTime: 0.32, hold: 0.12, start: 1.2, restart: 1.6 };
const PILOT_MODE = new URLSearchParams(location.search).has('bot');

const ART = `${import.meta.env.BASE_URL}art/`;

/** Wczytuje grafikę z public/art; brak pliku = null (gra używa wersji z kodu). */
async function optionalTexture(name: string): Promise<Texture | null> {
  try {
    return (await Assets.load<Texture>(`${ART}${name}`)) ?? null;
  } catch {
    return null;
  }
}

/** Tekstura powtarzalna w pionie bez szwu: obraz + jego odbicie lustrzane pod spodem. */
async function mirrorTile(texture: Texture): Promise<Texture> {
  const src = texture.source.resource as CanvasImageSource;
  const w = texture.source.pixelWidth;
  const h = texture.source.pixelHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return texture;
  ctx.drawImage(src, 0, 0, w, h);
  ctx.translate(0, h * 2);
  ctx.scale(1, -1);
  ctx.drawImage(src, 0, 0, w, h);
  // Przez ImageBitmap, nie przez canvas: na prawdziwym iPhonie wgranie dużego canvasa do WebGL bywa puste.
  return pixelsToTexture(ctx.getImageData(0, 0, w, h * 2));
}

/**
 * Glut: rozgrywka. Generowana studnia, syrop, cukierki, ekran końca.
 */
export class PlayScene extends Scene {
  readonly id = 'play';
  private readonly backdrop = new Container();
  private readonly shake = new Container();
  private readonly world = new Container();
  private readonly chunkLayer = new Container();
  private readonly decalLayer = new Container();
  private readonly candyLayer = new Container();
  private readonly chunkViews = new Map<number, Container>();
  private readonly candyViews = new Map<string, { sprite: Sprite; candy: Candy }>();
  private readonly powerViews = new Map<string, PowerBubble>();
  private readonly powerTex = new Map<PowerKind, Texture>();
  private powerHud!: PowerHud;
  /** Efekty power-upów wokół slime'a (nie obracają się z ciałem). */
  private readonly aura = new Graphics();
  /** Celowanie w locie (drugi oddech): zwolniony czas. */
  private airAim = false;
  private readonly dotsG = new Graphics();
  private readonly syrupG = new Graphics();
  private readonly slime = new Container();
  private readonly body = new Container();
  private face!: SlimeFace;
  private readonly input = new Container();
  private readonly hud = new Container();
  private readonly overlay = new Container();
  private readonly glow = new Graphics();
  private bg: TilingSprite | null = null;
  private candyTex!: Texture;
  private decor: (Texture | null)[] = [];
  run!: Run;
  private camera!: FollowCamera;
  private shaker!: Shaker;
  private sparks!: Particles;
  private heightText!: Text;
  private bestText!: Text;
  private candyText!: Text;
  private candyIcon!: Sprite;
  private hint!: Text;
  private syrupWarn!: Text;
  private againButton: Button | null = null;
  private menuButton: Button | null = null;
  private aiming: { sx: number; sy: number; power: number; dx: number; dy: number } | null = null;
  private best = 0;
  private bestAtStart = 0;
  private bank = 0;
  private runs = 0;
  private time = 0;
  private heartbeat = 0;
  private combo = 0;
  private trailIn = 0;
  /** Bot gra osobnym zapisem, żeby nie ruszać rekordu i cukierków gracza. */
  private readonly store = new SaveStore<Save>(PILOT_MODE ? 'glut-bot' : 'glut', NEW_SAVE);
  private autopilot: { wait: number; shot: BotShot | null; t: number; hold: number; sx: number; sy: number } | null = null;
  private readonly finger = new Graphics();
  private owned: string[] = [];
  private hatId: string | null = null;
  private readonly hatTextures = new Map<string, Texture | null>();
  private readonly hat = new Container();
  private readonly hatSwing = new Spring(0, 260, 9);
  /** 'title' = ekran startowy (gra czeka), 'play' = rozgrywka. */
  private mode: 'title' | 'play' = 'title';
  private title: TitleOverlay | null = null;
  private shop: ShopPanel | null = null;

  override async enter(): Promise<void> {
    const saved = normalizeSave(await this.store.load());
    this.best = saved.best;
    this.bank = saved.candies;
    this.owned = saved.owned;
    this.hatId = saved.hat;
    const pr = this.game.pixelRatio;

    const [slimeTex, bgTex, candyArt, crystal, lolly] = await Promise.all([
      slimeTextures(pal.swatches[0], pal.ink, pr),
      optionalTexture('bg.jpg'),
      optionalTexture('candy.png'),
      optionalTexture('decor/crystal.png'),
      optionalTexture('decor/lolly.png'),
    ]);
    this.decor = [crystal, lolly];
    const powerArt = await Promise.all(POWER_KINDS.map((k) => optionalTexture(`power/${k}.png`)));
    for (const [i, kind] of POWER_KINDS.entries()) this.powerTex.set(kind, powerArt[i] ?? (await fallbackIcon(kind, pr)));
    const hatTex = await Promise.all(HATS.map((h) => optionalTexture(h.file)));
    HATS.forEach((h, i) => this.hatTextures.set(h.id, hatTex[i] ?? null));
    this.candyTex = candyArt ?? (await svgTexture(candySvg(), pr));

    this.addChild(this.backdrop, this.shake, this.hud, this.input, this.overlay);
    if (bgTex) {
      this.bg = new TilingSprite({ texture: await mirrorTile(bgTex), width: SHAFT.width, height: 2000 });
      this.bg.tileScale.set(SHAFT.width / bgTex.width);
      this.bg.tint = 0x8e7ea0;
      this.backdrop.addChild(this.bg);
    }
    this.shake.addChild(this.world);
    this.world.addChild(this.chunkLayer, this.decalLayer, this.candyLayer, this.dotsG, this.slime, this.syrupG);

    const scale = bodyScale(PHYS.radius);
    this.body.addChild(bodySprite(slimeTex, scale), this.hat);
    this.wearHat();
    this.face = new SlimeFace(slimeTex, scale);
    this.slime.addChild(this.aura, this.body, this.face);
    if (new URLSearchParams(location.search).has('diag')) this.setupDiag(slimeTex.body);

    this.sparks = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.world.addChild(this.sparks.view);
    this.shaker = new Shaker(this.shake, this.game.rng);
    this.camera = new FollowCamera(this.world, { upOnly: true, lambda: 5 });

    this.heightText = this.makeText(56, pal.surface);
    this.heightText.anchor.set(0.5, 0);
    this.bestText = this.makeText(26, pal.accent);
    this.bestText.anchor.set(0.5, 0);
    this.candyText = this.makeText(36, pal.surface);
    this.candyText.anchor.set(1, 0.5);
    this.candyIcon = new Sprite({ texture: this.candyTex, anchor: 0.5 });
    this.candyIcon.scale.set(54 / Math.max(this.candyTex.width, this.candyTex.height));
    this.hint = this.makeText(34, pal.surface);
    this.hint.anchor.set(0.5);
    this.hint.text = 'Przeciągnij w dół i puść';
    this.syrupWarn = this.makeText(28, '#ffc2d4');
    this.syrupWarn.anchor.set(0.5, 1);
    this.powerHud = new PowerHud(this.powerTex);
    this.hud.addChild(this.glow, this.powerHud, this.heightText, this.bestText, this.candyIcon, this.candyText, this.hint, this.syrupWarn);

    const input = gestures(this.input, { dragThreshold: 10 });
    input.on('dragStart', ({ x, y }) => {
      if (this.mode !== 'play' || this.autopilot) return;
      if (!this.run.canAim) return;
      this.aiming = { sx: x, sy: y, power: 0, dx: 0, dy: -1 };
      if (this.run.slime.state === 'flying') {
        // Drugi oddech: celowanie w locie w zwolnionym tempie.
        this.airAim = true;
        this.game.loop.timeScale = 0.25;
      }
    });
    input.on('drag', ({ x, y }) => !this.autopilot && this.aim(x, y));
    input.on('dragEnd', ({ x, y }) => !this.autopilot && this.release(x, y));
    if (PILOT_MODE) {
      this.autopilot = { wait: PILOT.start, shot: null, t: 0, hold: 0, sx: 0, sy: 0 };
      this.finger.circle(0, 0, 30).fill({ color: 0xffffff, alpha: 0.35 }).circle(0, 0, 30).stroke({ color: 0xffffff, width: 4, alpha: 0.8 });
      this.finger.visible = false;
      this.hud.addChild(this.finger);
    }

    this.newRun();
    this.showTitle();
    // Uchwyt dla playtestów (tylko w trybie deweloperskim).
    if (import.meta.env.DEV) (window as unknown as { __glut: PlayScene }).__glut = this;
    this.timers.after(0.1, () => this.game.markReady());
  }

  override resize(view: View): void {
    this.input.hitArea = new Rectangle(0, 0, view.width, view.height);
    this.heightText.position.set(view.width / 2, view.safe.top + 24);
    this.bestText.position.set(view.width / 2, view.safe.top + 92);
    this.candyIcon.position.set(view.width - 52, view.safe.top + 58);
    this.candyText.position.set(view.width - 90, view.safe.top + 58);
    this.powerHud.position.set(52, view.safe.top + 58);
    this.hint.position.set(view.width / 2, view.height * 0.3);
    this.syrupWarn.position.set(view.width / 2, view.height - view.safe.bottom - 24);
    if (this.bg) this.bg.height = view.height;
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
    this.title?.layout(view);
    this.shop?.layout(view);
  }

  override fixedUpdate(dt: number): void {
    this.react(this.run.step(dt));
  }

  override update(dt: number): void {
    this.time += dt;
    this.pilot(dt);
    const s = this.run.slime;
    const view = this.game.view;
    if (s.state !== 'dead') {
      // Normalnie slime na 60% wysokości ekranu. Gdy syrop jest w zasięgu, kamera kadruje tak,
      // żeby jego powierzchnia była widoczna u dołu, ale slime zostaje co najmniej 30% od góry.
      let target = s.y - view.height * 0.6;
      if (this.run.started) target = Math.max(target, Math.min(this.run.syrupY - view.height + 170, s.y - view.height * 0.3));
      this.camera.follow(0, target, dt);
    }
    if (this.bg) this.bg.tilePosition.y = -this.camera.y * 0.35;
    this.shaker.update(dt);
    this.sparks.update(dt);
    this.againButton?.tick(dt);
    this.menuButton?.tick(dt);
    this.title?.tick(dt);
    this.shop?.tick(dt);
    this.hat.rotation = this.hatSwing.update(dt);
    this.placeSlime(dt);
    this.animateCandies();
    for (const b of this.powerViews.values()) b.tick(this.time);
    this.powerHud.update(this.run);
    this.drawAura(dt);
    this.drawSyrup();
    this.pressure(dt);

    const meters = this.run.meters;
    if (meters > this.best) {
      this.best = meters;
      void this.persist();
    }
    this.heightText.text = `${meters} m`;
    this.bestText.text = `rekord ${this.best} m`;
    this.candyText.text = `${this.run.candies}`;

    const below = this.run.syrupY - (this.camera.y + view.height);
    this.syrupWarn.visible = this.run.started && !this.run.over && below > 0;
    if (this.syrupWarn.visible) {
      this.syrupWarn.text = `▼ syrop ${Math.ceil(below / 100)} m`;
      this.syrupWarn.alpha = below < 600 ? 0.6 + 0.4 * Math.sin(this.time * 12) : 0.7;
    }
  }

  private persist(): Promise<void> {
    return this.store.save({ best: this.best, candies: this.bank + this.run.candies, owned: this.owned, hat: this.hatId });
  }

  private snapshot(): Save {
    return { best: this.best, candies: this.bank + this.run.candies, owned: this.owned, hat: this.hatId };
  }

  // --- ekran startowy i sklep ---

  private showTitle(): void {
    this.mode = 'title';
    this.hint.visible = false;
    for (const t of [this.heightText, this.bestText, this.candyIcon, this.candyText]) t.visible = false;
    this.title = new TitleOverlay({
      candyTex: this.candyTex,
      pixelRatio: this.game.pixelRatio,
      onStart: () => this.startPlaying(),
      onShop: () => this.openShop(),
    });
    this.title.setStats(this.best, this.bank + this.run.candies);
    this.overlay.addChild(this.title);
    this.title.layout(this.game.view);
  }

  private startPlaying(): void {
    if (this.mode === 'play' || this.shop) return;
    this.game.sound.synth(SFX.tap);
    const title = this.title;
    this.title = null;
    if (title) {
      this.tweens.to(title, { alpha: 0 }, { duration: 0.2 });
      this.timers.after(0.21, () => title.destroy({ children: true }));
    }
    this.mode = 'play';
    for (const t of [this.heightText, this.bestText, this.candyIcon, this.candyText]) t.visible = true;
    this.hint.visible = this.runs === 1;
    this.squash(0.25);
  }

  private openShop(): void {
    if (this.shop) return;
    this.game.sound.synth(SFX.tap);
    this.shop = new ShopPanel({
      hats: this.hatTextures,
      candyTex: this.candyTex,
      pixelRatio: this.game.pixelRatio,
      tweens: this.tweens,
      onTap: (id) => this.tapHat(id),
      onClose: () => this.closeShop(),
    });
    this.shop.refresh(this.snapshot());
    this.shop.layout(this.game.view);
    this.overlay.addChild(this.shop);
    this.shop.alpha = 0;
    this.tweens.to(this.shop, { alpha: 1 }, { duration: 0.18 });
  }

  private closeShop(): void {
    const shop = this.shop;
    this.shop = null;
    if (!shop) return;
    this.game.sound.synth(SFX.tap);
    this.tweens.to(shop, { alpha: 0 }, { duration: 0.15 });
    this.timers.after(0.16, () => shop.destroy({ children: true }));
    this.title?.setStats(this.best, this.bank + this.run.candies);
  }

  private tapHat(id: string): void {
    const r = tapHat(this.snapshot(), id);
    if (!r.ok) {
      if (r.reason === 'poor') this.shop?.deny(id, r.missing ?? 0);
      haptics.error();
      return;
    }
    // Sklep działa tylko na ekranie startowym, gdzie bieg ma 0 cukierków: całe konto jest w `bank`.
    this.bank = r.save.candies - this.run.candies;
    this.owned = r.save.owned;
    this.hatId = r.save.hat;
    void this.persist();
    this.wearHat();
    this.shop?.refresh(r.save);
    this.title?.setStats(this.best, r.save.candies);
    if (r.action === 'bought') {
      this.shop?.celebrate(id);
      this.game.sound.synth(SFX.record);
      haptics.success();
    } else {
      this.game.sound.synth(SFX.tap);
      haptics.tap();
    }
    this.squash(0.3);
    this.hatSwing.kick(4);
  }

  /** Czapka siedzi na czubku ciała: obraca się i spłaszcza razem z nim. */
  private wearHat(): void {
    this.hat.removeChildren().forEach((c) => c.destroy());
    const def = HATS.find((h) => h.id === this.hatId);
    const tex = def ? this.hatTextures.get(def.id) : null;
    if (!def || !tex) return;
    const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: 0.9 } });
    s.scale.set(def.width / tex.width);
    s.position.set(0, def.y);
    s.rotation = def.tilt;
    this.hat.addChild(s);
  }

  // --- bieg ---

  private newRun(): void {
    if (this.run) this.bank += this.run.candies;
    this.runs++;
    this.run = new Run(this.game.rng.int(1, 2 ** 31 - 1));
    this.bestAtStart = this.best;
    for (const view of this.chunkViews.values()) view.destroy({ children: true });
    this.chunkViews.clear();
    for (const v of this.candyViews.values()) v.sprite.destroy();
    this.candyViews.clear();
    for (const b of this.powerViews.values()) b.destroy({ children: true });
    this.powerViews.clear();
    this.decalLayer.removeChildren().forEach((c) => c.destroy());
    for (const k of this.run.shaft.chunks.keys()) this.addChunkView(k);
    this.overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.againButton = null;
    this.slime.visible = true;
    this.slime.scale.set(1);
    this.hint.visible = this.mode === 'play' && this.runs === 1;
    this.menuButton = null;
    this.glow.alpha = 0;
    this.heartbeat = 0;
    this.combo = 0;
    this.camera.snap(0, this.floorView());
  }

  private floorView(): number {
    return 160 - this.game.view.height;
  }

  // --- sterowanie ---

  private aim(x: number, y: number): void {
    if (!this.aiming || !this.run.canAim) {
      this.endAirAim();
      this.dotsG.clear();
      return;
    }
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
      const color = last && p.end === 'death' ? COLORS.danger : COLORS.dot;
      this.dotsG.circle(pt.x, pt.y, last && p.end ? 10 : 9 - t * 5).fill({ color, alpha: last ? 0.95 : 0.85 - t * 0.5 });
    });
  }

  private release(x: number, y: number): void {
    const aiming = this.aiming;
    this.aiming = null;
    this.dotsG.clear();
    const inAir = this.airAim;
    this.endAirAim();
    if (!aiming) return;
    const v = launchVelocity(x - aiming.sx, y - aiming.sy);
    if (!v || !this.run.launch(v.vx, v.vy)) return;
    if (inAir) {
      this.game.sound.synth(POWER_SFX.air);
      this.sparks.burst(this.run.slime.x, this.run.slime.y, { count: 14, speed: [150, 400], life: [0.3, 0.5], scale: [0.5, 1], colors: [0xffffff, 0xc8f5ff] });
    }
    this.hint.visible = false;
    this.combo = 0;
    this.hatSwing.kick(-v.vx / 600);
    this.game.sound.synth(SFX.launch, { pitch: 0.8 + v.power * 0.5 });
    haptics.tap();
  }

  private pickPower(p: PowerUp): void {
    const info = POWER_INFO[p.kind];
    const bubble = this.powerViews.get(p.id);
    this.powerViews.delete(p.id);
    if (bubble) {
      this.tweens.to(bubble, { alpha: 0 }, { duration: 0.3 });
      void this.tweens.to(bubble.scale, { x: 2.2, y: 2.2 }, { duration: 0.3, ease: 'quadOut' }).done.then(() => bubble.destroy({ children: true }));
    }
    this.game.sound.synth(POWER_SFX.pickup);
    if (p.kind === 'rocket') this.game.sound.synth(POWER_SFX.rocket);
    if (p.kind === 'frost') this.game.sound.synth(POWER_SFX.frost);
    haptics.success();
    this.sparks.burst(p.x, p.y, { count: 26, speed: [200, 600], life: [0.4, 0.8], scale: [0.6, 1.3], endScale: 0.2, colors: [info.color, 0xffffff, 0xffd166] });
    this.shaker.add(p.kind === 'rocket' ? 0.5 : 0.2);
    this.floatText(p.x, p.y - 70, `${info.name}!`, info.css);
    this.hatSwing.kick(5);
  }

  /** Napis unoszący się w świecie (nazwa power-upu, „Odbite!”). */
  private floatText(x: number, y: number, message: string, color: string): void {
    const t = this.makeText(38, color);
    t.text = message;
    t.anchor.set(0.5);
    // Nie pod górnym paskiem (wysokość, rekord, cukierki).
    y = Math.max(y, this.camera.y + this.game.view.safe.top + 230);
    t.position.set(Math.max(150, Math.min(SHAFT.width - 150, x)), y);
    this.world.addChild(t);
    void popIn(this.tweens, t, 0.25);
    this.tweens.to(t, { y: y - 90, alpha: 0 }, { duration: 1.1, delay: 0.5, ease: 'quadIn' });
    this.timers.after(1.7, () => t.destroy());
  }

  /** Efekty aktywnych power-upów wokół slime'a. */
  private drawAura(dt: number): void {
    const run = this.run;
    const s = run.slime;
    const g = this.aura.clear();
    const pulse = 1 + Math.sin(this.time * 6) * 0.05;
    if (run.timers.shell > 0) {
      const fade = run.timers.shell < 2 ? 0.4 + 0.4 * Math.abs(Math.sin(this.time * 10)) : 0.8;
      g.circle(0, 0, 54 * pulse).fill({ color: POWER_INFO.shell.color, alpha: 0.18 * fade }).stroke({ color: 0xffffff, width: 4, alpha: fade });
      g.ellipse(-18, -26, 10, 6).fill({ color: 0xffffff, alpha: 0.6 * fade });
    }
    if (run.timers.magnet > 0) {
      const r = 300 * (0.92 + 0.08 * Math.sin(this.time * 4));
      g.circle(0, 0, r).stroke({ color: POWER_INFO.magnet.color, width: 3, alpha: 0.25 });
    }
    if (run.air > 0) {
      // Skrzydełka: ładunek drugiego oddechu.
      const flap = Math.sin(this.time * 12) * 0.25;
      for (const side of [-1, 1]) {
        g.ellipse(side * 44, -10 + flap * 10, 18, 10).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ color: 0x1e1530, width: 3 });
      }
    }
    this.body.tint = run.timers.glue > 0 ? 0xc8ffd0 : 0xffffff;
    if (run.timers.rocket > 0 && s.state !== 'dead') {
      this.shaker.add(dt * 0.6);
      this.sparks.burst(s.x + (this.game.rng.next() - 0.5) * 20, s.y + 40, {
        count: 3,
        speed: [200, 500],
        angle: Math.PI / 2,
        spread: 0.7,
        life: [0.2, 0.45],
        scale: [0.7, 1.4],
        endScale: 0.1,
        colors: [0xff6a3d, 0xffd166, 0xffffff],
      });
    }
  }

  /** Autopilot: bot z symulacji „przeciąga palcem” jak gracz (kropki, slow-mo w locie, restart). */
  private pilot(dt: number): void {
    const p = this.autopilot;
    if (!p) return;
    const real = dt / (this.game.loop.timeScale || 1);
    if (this.mode === 'title' || this.againButton) {
      this.finger.visible = false;
      p.wait -= real;
      if (p.wait > 0) return;
      if (this.mode === 'title') this.startPlaying();
      else {
        this.game.sound.synth(SFX.tap);
        this.newRun();
      }
      p.wait = PILOT.reaction;
      return;
    }
    if (this.run.over) {
      p.shot = null;
      p.wait = PILOT.restart;
      this.finger.visible = false;
      return;
    }
    if (p.shot) {
      if (!this.run.canAim) {
        p.shot = null;
        this.aiming = null;
        this.dotsG.clear();
        this.endAirAim();
        this.finger.visible = false;
        return;
      }
      p.t = Math.min(1, p.t + real / PILOT.aimTime);
      const e = 1 - (1 - p.t) ** 3;
      const x = p.sx + p.shot.dragX * e;
      const y = p.sy + p.shot.dragY * e;
      this.aim(x, y);
      this.finger.position.set(x, y);
      this.finger.visible = true;
      if (p.t < 1) return;
      p.hold -= real;
      if (p.hold > 0) return;
      this.release(x, y);
      p.shot = null;
      p.wait = PILOT.reaction;
      this.finger.visible = false;
      return;
    }
    if (!botCanShoot(this.run)) return;
    p.wait -= dt;
    if (p.wait > 0) return;
    const shot = chooseShot(this.run, this.game.rng);
    if (!shot) {
      p.wait = 0.1;
      return;
    }
    // Palec startuje przy slimie, przesunięty tak, żeby całe przeciągnięcie zmieściło się na ekranie.
    const view = this.game.view;
    const s = this.run.slime;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    p.sx = clamp(s.x, 50 - Math.min(0, shot.dragX), view.width - 50 - Math.max(0, shot.dragX));
    p.sy = clamp(s.y - this.camera.y, view.safe.top + 160 - Math.min(0, shot.dragY), view.height - 50 - Math.max(0, shot.dragY));
    p.shot = shot;
    p.t = 0;
    p.hold = PILOT.hold;
    this.aiming = { sx: p.sx, sy: p.sy, power: 0, dx: 0, dy: -1 };
    if (s.state === 'flying') {
      this.airAim = true;
      this.game.loop.timeScale = 0.25;
    }
  }

  private endAirAim(): void {
    if (!this.airAim) return;
    this.airAim = false;
    this.game.loop.timeScale = 1;
  }

  // --- reakcje na zdarzenia ---

  private react(r: RunStep): void {
    for (const k of r.added ?? []) this.addChunkView(k);
    for (const k of r.removed ?? []) this.removeChunkView(k);
    for (const c of r.collected ?? []) this.collectCandy(c);
    if (r.powered) this.pickPower(r.powered);
    if (r.shielded) {
      const s = this.run.slime;
      this.game.sound.synth(POWER_SFX.shield);
      haptics.heavy();
      this.shaker.add(0.4);
      this.sparks.burst(s.x, s.y, { count: 30, speed: [200, 600], life: [0.3, 0.6], scale: [0.6, 1.2], colors: [POWER_INFO.shell.color, 0xffffff] });
      this.floatText(s.x, s.y - 60, 'Odbite!', POWER_INFO.shell.css);
    }
    if (r.landed && this.airAim) this.endAirAim();
    if (r.landed) {
      const l = r.landed;
      const strength = Math.min(1, l.speed / PHYS.maxSpeed);
      this.squash(0.15 + strength * 0.3);
      this.hatSwing.kick((this.game.rng.next() - 0.5) * 10 * (0.3 + strength));
      if (strength > 0.15) {
        const cx = l.x - l.nx * PHYS.radius;
        const cy = l.y - l.ny * PHYS.radius;
        this.sparks.burst(cx, cy, {
          count: Math.round(6 + strength * 14),
          speed: [120, 260 + strength * 400],
          angle: Math.atan2(l.ny, l.nx),
          spread: Math.PI * 0.9,
          life: [0.25, 0.5],
          scale: [0.5, 1.1],
          gravity: 1800,
          colors: [COLORS.slime, 0xffffff],
        });
        this.splat(cx, cy, l.nx, l.ny, strength);
        this.game.sound.synth(SFX.land, { volume: 0.4 + strength * 0.6, pitch: 0.9 + this.game.rng.next() * 0.2 });
        haptics.hit();
      }
      if (strength > 0.6) this.shaker.add(0.25);
    }
    if (r.died) this.die('spikes');
    if (r.drowned) this.die('syrup');
  }

  private collectCandy(c: Candy): void {
    this.combo++;
    const sprite = this.candyViews.get(c.id)?.sprite;
    this.candyViews.delete(c.id);
    this.game.sound.synth(SFX.candy, { pitch: 1 + Math.min(this.combo - 1, 8) * 0.12 });
    this.sparks.burst(c.x, c.y, {
      count: 10,
      speed: [120, 380],
      life: [0.25, 0.5],
      scale: [0.4, 0.9],
      colors: [0xffffff, 0xffd166, COLORS.slime],
    });
    void pulse(this.tweens, this.candyIcon, 0.35);
    if (sprite) {
      this.tweens.to(sprite, { alpha: 0 }, { duration: 0.25 });
      void this.tweens
        .to(sprite.scale, { x: sprite.scale.x * 1.8, y: sprite.scale.y * 1.8 }, { duration: 0.25, ease: 'backOut' })
        .done.then(() => sprite.destroy());
    }
  }

  private die(cause: 'spikes' | 'syrup'): void {
    const s = this.run.slime;
    this.endAirAim();
    this.aiming = null;
    this.dotsG.clear();
    this.game.hitstop(0.08);
    this.shaker.add(0.7);
    this.game.sound.synth(SFX.death);
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
      colors: cause === 'syrup' ? [COLORS.slime, COLORS.syrup, 0xffffff] : [COLORS.slime, 0xffffff, COLORS.danger],
    });
    this.slime.visible = false;
    void this.persist();
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
    const sweets = this.makeText(30, pal.surface);
    sweets.text = `+${this.run.candies} cukierków (razem ${this.bank + this.run.candies})`;
    for (const t of [title, score, sub, sweets]) t.anchor.set(0.5);
    title.position.set(0, -250);
    score.position.set(0, -130);
    sub.position.set(0, -30);
    sweets.position.set(0, 30);
    const again = new Button({
      label: 'Jeszcze raz',
      color: pal.accent,
      width: 380,
      resolution: this.game.pixelRatio,
      onTap: () => {
        this.game.sound.synth(SFX.tap);
        this.newRun();
      },
    });
    again.position.set(0, 170);
    this.againButton = again;
    const menu = new Button({
      label: 'Czapki i menu',
      color: '#9b8cff',
      width: 380,
      height: 90,
      fontSize: 34,
      resolution: this.game.pixelRatio,
      onTap: () => {
        this.game.sound.synth(SFX.tap);
        this.newRun();
        this.showTitle();
      },
    });
    menu.position.set(0, 300);
    this.menuButton = menu;
    panel.addChild(title, score, sub, sweets, again, menu);
    panel.label = 'panel';
    this.overlay.addChild(dim, panel);
    this.layoutOverlay();
    dim.alpha = 0;
    this.tweens.to(dim, { alpha: 1 }, { duration: 0.25 });
    void popIn(this.tweens, panel, 0.4);
    if (record) {
      haptics.success();
      this.game.sound.synth(SFX.record);
      this.timers.after(0.35, () => void pulse(this.tweens, sub, 0.25));
      const view = this.game.view;
      this.sparks.burst(view.width / 2, this.camera.y + view.height * 0.25, {
        count: 90,
        speed: [400, 1100],
        angle: -Math.PI / 2,
        spread: Math.PI * 0.9,
        life: [1.2, 2],
        scale: [0.5, 1.2],
        gravity: 1400,
        drag: 1.2,
        spin: [-8, 8],
        colors: pal.swatches.map(hexToNumber),
      });
    }
  }

  private layoutOverlay(): void {
    const view = this.game.view;
    const dim = this.overlay.getChildByLabel('dim') as Graphics | null;
    dim?.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.72 });
    this.overlay.getChildByLabel('panel')?.position.set(view.width / 2, view.height * 0.45);
  }

  /** Presja syropu: poświata, bąbelki z dołu ekranu, bicie serca i przestraszone oczy. */
  private pressure(dt: number): void {
    const run = this.run;
    const view = this.game.view;
    if (!run.started || run.over) {
      this.glow.alpha = Math.max(0, this.glow.alpha - dt * 3);
      this.face.fright = 0;
      return;
    }
    const screenBottom = this.camera.y + view.height;
    const below = run.syrupY - screenBottom;
    const near = Math.min(1, Math.max(0, 1 - below / 1300));
    const gap = run.syrupY - run.slime.y;
    const danger = Math.min(1, Math.max(0, 1 - (gap - 150) / 650));
    const beat = 0.5 + 0.5 * Math.sin(this.time * (3 + danger * 9));
    this.glow.alpha = near * (0.45 + 0.55 * beat) * (0.6 + 0.4 * danger);
    this.face.fright = danger;

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

    if (danger > 0.55) {
      this.heartbeat -= dt;
      if (this.heartbeat <= 0) {
        haptics.tap();
        this.game.sound.synth(SFX.heartbeat, { volume: 0.5 + danger * 0.5 });
        this.shaker.add(0.08 + danger * 0.08);
        this.heartbeat = 0.85 - danger * 0.45;
      }
    } else {
      this.heartbeat = 0;
    }
  }

  // --- wygląd ---

  private makeText(size: number, color: string): Text {
    return new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: size,
        fontWeight: '800',
        fill: color,
        stroke: { color: '#1e1530', width: Math.max(3, size * 0.12), join: 'round' },
      },
      resolution: this.game.pixelRatio,
    });
  }

  private addChunkView(k: number): void {
    const blocks = this.run.shaft.chunks.get(k);
    if (!blocks || this.chunkViews.has(k)) return;
    const view = new Container();
    const g = new Graphics();
    for (const b of blocks) drawBlock(g, b);
    view.addChild(g);
    if (k === 0) {
      // Dekoracje na dnie studni (tylko wygląd, bez kolizji).
      const [crystal, lolly] = this.decor;
      const place = (tex: Texture | null | undefined, x: number, h: number, flip = false) => {
        if (!tex) return;
        const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: 0.92 } });
        s.scale.set((h / tex.height) * (flip ? -1 : 1), h / tex.height);
        s.position.set(x, 4);
        view.addChildAt(s, 0);
      };
      place(crystal, 110, 110);
      place(lolly, SHAFT.width - 120, 120, true);
      place(crystal, SHAFT.width - 200, 70, true);
    }
    this.chunkViews.set(k, view);
    this.chunkLayer.addChild(view);
    for (const c of this.run.shaft.candies.get(k) ?? []) {
      if (c.taken) continue;
      const sprite = new Sprite({ texture: this.candyTex, anchor: 0.5 });
      sprite.scale.set(52 / Math.max(this.candyTex.width, this.candyTex.height));
      sprite.position.set(c.x, c.y);
      this.candyViews.set(c.id, { sprite, candy: c });
      this.candyLayer.addChild(sprite);
    }
    for (const p of this.run.shaft.powers.get(k) ?? []) {
      if (p.taken) continue;
      const tex = this.powerTex.get(p.kind);
      if (!tex) continue;
      const bubble = new PowerBubble(p.kind, tex, p.x * 0.01);
      bubble.position.set(p.x, p.y);
      this.powerViews.set(p.id, bubble);
      this.candyLayer.addChild(bubble);
    }
  }

  private removeChunkView(k: number): void {
    this.chunkViews.get(k)?.destroy({ children: true });
    this.chunkViews.delete(k);
    for (const [id, v] of this.candyViews) {
      if (id.startsWith(`${k}:`)) {
        v.sprite.destroy();
        this.candyViews.delete(id);
      }
    }
    const bubble = this.powerViews.get(`${k}:p`);
    bubble?.destroy({ children: true });
    this.powerViews.delete(`${k}:p`);
  }

  private animateCandies(): void {
    for (const [id, { sprite, candy }] of this.candyViews) {
      sprite.position.set(candy.x, candy.y); // magnes przesuwa cukierki
      const phase = id.length * 1.7 + id.charCodeAt(0) * 0.3;
      sprite.rotation = Math.sin(this.time * 2.2 + phase) * 0.18;
      sprite.pivot.y = (Math.sin(this.time * 3 + phase) * 4) / sprite.scale.y;
    }
  }

  /** Kleks lukru w miejscu lądowania, znika po kilku sekundach. */
  private splat(x: number, y: number, nx: number, ny: number, strength: number): void {
    const g = new Graphics();
    const rng = this.game.rng;
    const w = 30 + strength * 30;
    g.ellipse(0, 0, w, 7 + strength * 4).fill({ color: COLORS.slime, alpha: 0.85 });
    for (let i = 0; i < 3 + Math.round(strength * 4); i++) {
      g.circle(rng.range(-w * 1.2, w * 1.2), rng.range(-10, 2), rng.range(2.5, 6)).fill({ color: COLORS.slime, alpha: 0.85 });
    }
    g.position.set(x, y);
    g.rotation = Math.atan2(ny, nx) + Math.PI / 2;
    this.decalLayer.addChild(g);
    if (this.decalLayer.children.length > 18) this.decalLayer.children[0]?.destroy();
    this.tweens.to(g, { alpha: 0 }, { duration: 1.2, delay: 3 });
    this.timers.after(4.3, () => {
      if (!g.destroyed) g.destroy();
    });
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
    const frozen = this.run.timers.frost > 0;
    g.poly([...wave, SHAFT.width + 40, bottom, -40, bottom]).fill({ color: frozen ? 0xa8dcf0 : COLORS.syrup, alpha: 0.92 });
    const band: number[] = [...wave];
    for (let i = wave.length - 2; i >= 0; i -= 2) band.push(wave[i] as number, (wave[i + 1] as number) + 14);
    g.poly(band).fill({ color: frozen ? 0xe8f8ff : COLORS.syrupTop, alpha: 0.9 });
    if (frozen) {
      // Lodowe kryształki na zamarzniętej powierzchni.
      for (let x = 30; x < SHAFT.width; x += 70) g.poly([x - 10, y + 4, x, y - 18, x + 10, y + 4]).fill({ color: 0xffffff, alpha: 0.8 });
    }
  }

  private squash(amount: number): void {
    const body = this.body;
    this.tweens.killOf(body.scale);
    body.scale.set(1 + amount, 1 - amount);
    this.tweens.to(body.scale, { x: 1, y: 1 }, { duration: 0.45, ease: 'elasticOut' });
  }

  // --- diagnostyka (?diag): dane z prawdziwego urządzenia ---

  private diagText: Text | null = null;

  private setupDiag(bodyTex: Texture): void {
    const probe = new Sprite({ texture: bodyTex });
    probe.position.set(20, 200);
    probe.scale.set(1.2);
    const frame = new Graphics().rect(18, 198, bodyTex.width * 1.2 + 4, bodyTex.height * 1.2 + 4).stroke({ color: 0x00ff88, width: 2 });
    this.diagText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 18, fill: '#00ff88', stroke: { color: '#000000', width: 4 } },
      resolution: this.game.pixelRatio,
    });
    this.diagText.position.set(20, 330);
    this.overlay.parent?.addChild(frame, probe, this.diagText);
  }

  private updateDiag(): void {
    if (!this.diagText) return;
    const body = this.body.children[0];
    const src = body instanceof Sprite ? body.texture.source : null;
    const b = this.body.getBounds();
    const r = this.game.app.renderer;
    this.diagText.text = [
      `renderer ${r.name} type ${r.type} res ${r.resolution}`,
      `dpr ${window.devicePixelRatio} pixelRatio ${this.game.pixelRatio.toFixed(2)}`,
      `body ${body?.constructor.name} vis ${body?.visible} alpha ${body?.alpha}`,
      `tex ${src ? `${src.pixelWidth}x${src.pixelHeight} res ${src.resolution.toFixed(2)}` : '-'}`,
      `body.scale ${this.body.scale.x.toFixed(2)},${this.body.scale.y.toFixed(2)} rot ${this.body.rotation.toFixed(2)}`,
      `body.pos ${this.body.x.toFixed(1)},${this.body.y.toFixed(1)}`,
      `bounds ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.width.toFixed(0)}x${b.height.toFixed(0)}`,
      `slime ${this.run.slime.state} n ${this.run.slime.nx.toFixed(2)},${this.run.slime.ny.toFixed(2)}`,
      `audio ${this.game.sound.state} muted ${this.game.sound.muted}`,
      `ua ${navigator.userAgent.slice(-60)}`,
    ].join('\n');
  }

  private placeSlime(dt: number): void {
    const s = this.run.slime;
    this.slime.position.set(s.x, s.y);
    let look = { x: 0, y: 0 };
    if (s.state === 'flying') {
      const speed = Math.hypot(s.vx, s.vy);
      const dirX = speed > 1 ? s.vx / speed : 0;
      const dirY = speed > 1 ? s.vy / speed : -1;
      // Kopuła „czubkiem” do przodu, podstawa z tyłu.
      this.body.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
      this.body.position.set(-dirX * PHYS.radius, -dirY * PHYS.radius);
      const stretch = Math.min(0.35, speed / 6000);
      this.tweens.killOf(this.body.scale);
      this.body.scale.set(1 - stretch * 0.6, 1 + stretch);
      look = { x: dirX, y: dirY };
      this.trailIn -= dt;
      if (this.trailIn <= 0 && speed > 400) {
        this.trailIn = 0.03;
        this.sparks.burst(s.x - dirX * 20, s.y - dirY * 20, {
          count: 1,
          speed: [10, 60],
          life: [0.25, 0.45],
          scale: [0.5, 0.9],
          endScale: 0.1,
          colors: [COLORS.slime],
        });
      }
    } else if (s.state === 'stuck') {
      this.body.rotation = Math.atan2(s.ny, s.nx) + Math.PI / 2;
      this.body.position.set(-s.nx * PHYS.radius, -s.ny * PHYS.radius);
      if (this.aiming && this.aiming.power > 0) {
        const p = this.aiming.power;
        const tremble = p > 0.98 ? (this.game.rng.next() - 0.5) * 0.04 : 0;
        this.body.scale.set(1 + p * 0.15 + tremble, 1 - p * 0.22 + tremble);
      }
      if (this.aiming) look = { x: this.aiming.dx, y: this.aiming.dy };
    }
    this.face.tick(dt, look.x, look.y, () => this.game.rng.next());
    this.updateDiag();
  }
}

/** Cukierek z kodu (zapas, gdy nie ma grafiki z Flux). */
function candySvg(): string {
  return svg(84, 52, [
    defs([radialGradient('c', [[0, '#ffffff'], [0.5, '#ff9ebb'], [1, '#e2507f']])]),
    path('M18,26 L2,12 L6,26 L2,40 Z', { fill: '#ffd166', stroke: '#1e1530', strokeWidth: 3, strokeLinejoin: 'round' }),
    path('M66,26 L82,12 L78,26 L82,40 Z', { fill: '#ffd166', stroke: '#1e1530', strokeWidth: 3, strokeLinejoin: 'round' }),
    circle(42, 26, 22, { fill: 'url(#c)', stroke: '#1e1530', strokeWidth: 3.5 }),
    ellipse(35, 18, 7, 4, { fill: '#ffffff', opacity: 0.7 }),
  ]);
}
