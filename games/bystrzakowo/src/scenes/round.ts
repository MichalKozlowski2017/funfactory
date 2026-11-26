import { Container, Graphics, Sprite } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { dotTexture, idleBreath, Particles, popIn, Scene, squash, type View } from '@funfactory/kit2d';
import { itemVoices, loadArt, say, startMusic, type Art, type Guide } from '../assets.ts';
import { pickSticker } from '../sim/progress.ts';
import { nextLevel } from '../sim/puzzles.ts';
import { realmOf, type Activity } from '../sim/realms.ts';
import { logFact, logTask, logTempo } from '../log.ts';
import { saveState, state } from '../state.ts';
import { COLORS, cover, IconButton, sfx } from '../ui.ts';
import { Hand, type Gesture, type P } from '../hand.ts';
import { markHand, needsHand } from '../sim/onboarding.ts';

/** After how many idle seconds the guide repeats the prompt, and after how many it gives a hint. */
const IDLE_REPEAT = 8;
const IDLE_HINT = 16;

/**
 * Common frame of every activity: realm background, guide, progress stars, hints when idle,
 * reward (sticker) and return to the realm. No losing: mistakes only lower the next round's level.
 * The subclass prepares the round (`prepare`), shows a task (`show`) and calls `solved()` / `missed()`.
 */
export abstract class RoundScene extends Scene {
  protected readonly kind: Activity;
  protected readonly guide: Guide;
  protected art!: Art;
  protected bg!: Sprite;
  protected guideSprite!: Sprite;
  protected home!: IconButton;
  protected dots!: Graphics;
  /** Task layer (cleared between tasks). */
  protected readonly layer = new Container();
  protected particles!: Particles;
  /** Number of tasks in a round. */
  protected length = 5;
  protected index = 0;
  protected mistakes = 0;
  /** Task solved, waiting for the next one (touch ignored). */
  protected busy = false;
  protected overlay: Container | null = null;
  protected leaving = false;
  protected idle = 0;
  private tapHintAt = -10;
  private clock = 0;
  private hinted = 0;
  private solvedAt = -1;
  /** Mistakes in the current task (for the journal). */
  private taskMisses = 0;
  private voices: string[] = [];
  private updateNext: ((dt: number) => void) | null = null;
  /** Hand showing the gesture: the first time in an activity and after a longer idle time. */
  protected hand!: Hand;

  constructor(kind: Activity, guide: Guide) {
    super();
    this.kind = kind;
    this.guide = guide;
  }

  /** Round setup (data, textures). Sets `length`. */
  protected abstract prepare(): Promise<void>;
  /** Shows task `index` in `layer`. */
  protected abstract show(): void;
  /** Prompt recording of the current task. */
  protected abstract promptLine(): string;
  /** Hint after a longer idle time (e.g. wiggling the right card). */
  protected abstract hint(): void;
  /** Layout of the task elements (after a screen size change). */
  protected abstract place(): void;
  /** Entry animation (after `place`, so the elements already have their final scale). */
  protected appear(): void {}
  /** Items whose names the narrator may say in this round (their recordings are loaded at the start of the round). */
  protected roundItems(): string[] {
    return [];
  }
  /** Other recordings of this round to load at the start and release after it (e.g. "A is for apple"). */
  protected roundVoices(): string[] {
    return [];
  }
  /**
   * Skills tested in the current task (e.g. "number:5", "color:green") for the parent journal.
   * Result: correct if the task went without mistakes.
   */
  protected taskFacts(): string[] {
    return [];
  }
  /** Whether the current task offered a choice of only two answers (a hit counts as half). */
  protected taskEasy(): boolean {
    return false;
  }
  /** Task animation frame. */
  protected step(_dt: number): void {}
  /** Skill group for measuring tempo (e.g. "color"); null: activity without measurement (dragging, drawing). */
  protected tempoGroup(): string | null {
    return null;
  }
  /** Moment the prompt ends (scene clock): the answer time is measured from it. */
  private askedAt = -1;
  /** The activity reports that the prompt will finish in `delay` s (usually the recording length). */
  protected markAsked(delay: number): void {
    this.askedAt = this.clock + delay;
  }
  /** Gesture shown by the hand (scene coordinates); null: no hand, the regular hint stays. */
  protected gesture(): Gesture | null {
    return null;
  }
  /**
   * Play area: the whole screen, but on a tall one (iPad in portrait, iPadOS 26 window) a band with the proportions
   * of a landscape tablet in the middle. Background and guide stay on the whole screen, the task layer shifts by `stageY`.
   * Activities lay out their elements in this area in `place()` (layer coordinates).
   */
  protected get stage(): View {
    const v = this.game.view;
    const h = Math.min(v.height, Math.max(720, v.width * 0.78));
    const off = (v.height - h) / 2;
    return { width: v.width, height: h, safe: { ...v.safe, top: Math.max(0, v.safe.top - off), bottom: Math.max(0, v.safe.bottom - off) } };
  }

  protected get stageY(): number {
    return (this.game.view.height - this.stage.height) / 2;
  }

  /** Center of an object in task layer coordinates (for hand gestures). */
  protected spot(obj: Container, dx = 0, dy = 0): P {
    const p = this.layer.toLocal(obj.getGlobalPosition());
    return { x: p.x + dx, y: p.y + dy };
  }
  /** Center of the object's bounding rectangle (when the anchor isn't in the center, e.g. xylophone bars). */
  protected middle(obj: Container): P {
    const r = obj.getBounds();
    return this.layer.toLocal({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  }

  override async enter(): Promise<void> {
    this.art = await loadArt();
    await this.prepare();
    // Item names of this round: decoded before the start (at most 3 s of waiting), released on exit.
    this.voices = [...itemVoices(this.roundItems()), ...this.roundVoices()];
    await Promise.race([this.game.sound.load(this.voices), new Promise((r) => setTimeout(r, 3000))]);
    this.bg = new Sprite(this.art.playBg[realmOf(this.kind).id]);
    this.guideSprite = new Sprite({ texture: this.guide === 'lusia' ? this.art.lusia : this.art.bazyl, anchor: { x: 0.5, y: 1 } });
    this.guideSprite.scale.set(300 / this.guideSprite.texture.height);
    this.guideSprite.eventMode = 'static';
    this.guideSprite.cursor = 'pointer';
    this.guideSprite.on('pointertap', () => this.repeatPrompt());
    this.home = new IconButton('home');
    this.home.onTap = () => this.leave();
    this.dots = new Graphics();
    this.particles = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.hand = new Hand(this.art.hand);
    this.addChild(this.bg, this.guideSprite, this.layer, this.dots, this.home, this.particles.view, this.hand);
    idleBreath(this.tweens, this.guideSprite, 0.03, 1.8);
    this.eventMode = 'static';
    this.on('pointerdown', () => {
      this.idle = 0;
      startMusic(this.game);
      // The child touched the screen: the hand disappears, and the demo in this activity counts as seen.
      if (this.hand.active) {
        this.hand.stop();
        markHand(state.progress, this.kind);
        void saveState();
      }
    });
    this.game.markReady();
    this.timers.after(0.35, () => this.begin());
  }

  /** New task: clears the layer and calls `show`. */
  protected begin(): void {
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.layer.alpha = 1;
    this.busy = false;
    this.idle = 0;
    this.hinted = 0;
    this.taskMisses = 0;
    this.show();
    this.place();
    this.appear();
    this.drawDots();
    this.hand.stop();
    // First time in this activity: the hand shows the gesture (after the guide's prompt, until the child touches the screen).
    if (this.index === 0 && needsHand(state.progress, this.kind)) this.timers.after(1.6, () => this.demo());
  }

  /** The hand shows the current task's gesture. False when the activity has none. */
  protected demo(): boolean {
    if (this.busy || this.overlay || this.leaving) return false;
    const g = this.gesture();
    if (!g) return false;
    // The gesture is in task layer coordinates (shifted down on a tall screen).
    this.hand.position.set(this.layer.x, this.layer.y);
    this.hand.show(g);
    this.addChild(this.hand);
    return true;
  }

  /** Prompt once more (tapping the guide). */
  protected repeatPrompt(): void {
    if (this.busy || this.overlay) return;
    this.idle = 0;
    void squash(this.tweens, this.guideSprite, 0.08);
    say(this.game, this.guide, this.promptLine());
  }

  /** Confetti at a point (scene coordinates). */
  protected burst(x: number, y: number, count = 30): void {
    this.particles.burst(x, y, { count, speed: [200, 600], life: [0.4, 0.9], gravity: 700, scale: [0.5, 1.1], colors: COLORS.confetti });
  }

  /** Mistake: sound, haptics, the guide's "oops". The subclass animates the element. */
  protected missed(): void {
    this.mistakes++;
    this.taskMisses++;
    sfx.bad(this.game.sound);
    haptics.error();
    void squash(this.tweens, this.guideSprite, 0.08);
    say(this.game, this.guide, `oops-${this.game.rng.int(1, 2)}`);
  }

  /**
   * Task solved: the guide jumps, praise and the next task.
   * `afterLen`: how many seconds the narrator's current line (e.g. the item name) lasts before the praise.
   */
  protected solved(afterLen = 0): void {
    // Each task finishes once (e.g. in memory the last pairs can report the end almost simultaneously).
    if (this.solvedAt === this.index) return;
    this.solvedAt = this.index;
    this.busy = true;
    this.hand.stop();
    logTask(this.kind, this.taskMisses);
    // Tempo: only an answer without mistakes, after the prompt ended, without long pauses (the child walked away from the tablet).
    const group = this.tempoGroup();
    const took = this.clock - this.askedAt;
    if (group && this.askedAt >= 0 && this.taskMisses === 0 && took > 0.3 && took < 20) logTempo(group, this.kind, took);
    this.askedAt = -1;
    for (const f of this.taskFacts()) logFact(f, this.taskMisses === 0, this.taskEasy());
    sfx.good(this.game.sound);
    haptics.success();
    this.jumpGuide();
    this.timers.after(afterLen + 0.15, () => {
      const len = say(this.game, this.guide, `bravo-${this.game.rng.int(1, 5)}`);
      this.timers.after(Math.max(0.8, len) + 0.3, () => this.next());
    });
  }

  protected jumpGuide(): void {
    const g = this.guideSprite;
    const y = g.y;
    this.tweens.killOf(g);
    void this.tweens.to(g, { y: y - 50 }, { duration: 0.18, ease: 'quadOut', yoyo: true, repeat: 1 }).done.then(() => (g.y = y));
  }

  private next(): void {
    this.index++;
    if (this.index >= this.length) return this.finish();
    this.tweens.to(this.layer, { alpha: 0 }, { duration: 0.2 });
    this.timers.after(0.25, () => this.begin());
  }

  private finish(): void {
    const p = state.progress;
    p.levels[this.kind] = nextLevel(p.levels[this.kind] ?? 0, this.mistakes);
    const sticker = pickSticker(this.game.rng, p.stickers);
    p.stickers.push(sticker);
    p.rounds++;
    void saveState();
    this.drawDots();
    this.tweens.to(this.layer, { alpha: 0 }, { duration: 0.3 });
    this.showReward(sticker);
  }

  private showReward(id: string): void {
    const view = this.game.view;
    const o = new Container();
    o.addChild(new Graphics().rect(0, 0, view.width, view.height).fill({ color: 0x2a1a40, alpha: 0.55 }));
    o.eventMode = 'static';
    const badge = new Container();
    badge.position.set(view.width / 2, view.height / 2 - 30);
    const star = new Graphics().star(0, 0, 8, 230, 170).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 8, join: 'round' });
    const pic = new Sprite({ texture: this.art.items.get(id)!, anchor: 0.5 });
    pic.scale.set(230 / Math.max(pic.texture.width, pic.texture.height));
    badge.addChild(star, pic);
    // ▶ = "keep playing": a new round of the same activity (that's how kids understand it); house = back to the realm.
    const next = new IconButton('next', 62);
    next.position.set(view.width / 2 + 70, view.height - 90);
    next.visible = false;
    next.onTap = () => this.again();
    const back = new IconButton('home', 50);
    back.position.set(view.width / 2 - 90, view.height - 90);
    back.visible = false;
    back.onTap = () => this.leave();
    o.addChild(badge, next, back);
    this.overlay = o;
    this.addChild(o);
    this.addChild(this.particles.view);
    this.tweens.to(star, { rotation: Math.PI * 2 }, { duration: 12, repeat: -1, ease: 'linear' });
    void popIn(this.tweens, badge, 0.6);
    sfx.fanfare(this.game.sound);
    haptics.success();
    for (let i = 0; i < 3; i++)
      this.timers.after(i * 0.25, () =>
        this.particles.burst(view.width * (0.25 + i * 0.25), view.height * 0.35, { count: 50, speed: [250, 750], life: [0.8, 1.6], gravity: 600, scale: [0.6, 1.3], colors: COLORS.confetti }),
      );
    const len = say(this.game, this.guide, 'reward');
    this.timers.after(Math.max(1.2, len), () => {
      next.visible = back.visible = true;
      void popIn(this.tweens, next, 0.4);
      void popIn(this.tweens, back, 0.4, 0.1);
      this.updateNext = (dt) => {
        next.tick(dt);
        back.tick(dt);
      };
    });
  }

  /** Another round of the same activity (from the reward screen). */
  private again(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.game.sound.stopChannel('voice');
    this.game.sound.unload(this.voices);
    void import('./factory.ts').then(({ sceneFor }) => this.game.scenes.go(sceneFor(this.kind), { fade: 0.3, color: 0xfff6e8 }));
  }

  protected leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.game.sound.stopChannel('voice');
    this.game.sound.unload(this.voices);
    void import('./world.ts').then(({ WorldScene }) => this.game.scenes.go(new WorldScene(), { fade: 0.3, color: 0xfff6e8 }));
  }

  /**
   * The child tapped a draggable element instead of moving it: we show a hint (the element slides
   * towards the target), at most every 3 s.
   */
  protected tapHint(): void {
    if (this.busy || this.clock - this.tapHintAt < 3) return;
    this.tapHintAt = this.clock;
    this.hint();
  }

  private idleTick(dt: number): void {
    this.clock += dt;
    if (this.busy || this.overlay || this.leaving || this.index >= this.length) return;
    this.idle += dt;
    if (this.hinted === 0 && this.idle > IDLE_REPEAT) {
      this.hinted = 1;
      say(this.game, this.guide, this.promptLine());
      void squash(this.tweens, this.guideSprite, 0.1);
    } else if (this.hinted === 1 && this.idle > IDLE_HINT) {
      this.hinted = 2;
      if (!this.demo()) this.hint();
      say(this.game, this.guide, 'help');
    }
  }

  protected drawDots(): void {
    const g = this.dots.clear();
    // A single-task round (coloring) has nothing to count: a lone dot only puzzles the child.
    if (this.length <= 1) return;
    const gap = 54;
    for (let i = 0; i < this.length; i++) {
      const x = (i - (this.length - 1) / 2) * gap;
      if (i < this.index) g.star(x, 0, 5, 22, 10).fill({ color: COLORS.sun }).stroke({ color: COLORS.ink, width: 4, join: 'round' });
      else g.circle(x, 0, i === this.index ? 15 : 12).fill({ color: 0xffffff, alpha: 0.95 }).stroke({ color: COLORS.ink, width: 4 });
    }
  }

  override update(dt: number): void {
    this.home.tick(dt);
    this.updateNext?.(dt);
    this.particles.update(dt);
    this.step(dt);
    this.idleTick(dt);
    this.hand.update(dt);
  }

  override resize(view: View): void {
    cover(this.bg, view.width, view.height);
    const top = this.stageY;
    this.layer.y = top;
    this.particles.view.y = top;
    this.guideSprite.position.set(view.safe.left + 130, top + this.stage.height - 10);
    this.home.position.set(view.safe.left + 80, view.safe.top + 75);
    this.dots.position.set(view.width / 2 + 100, Math.max(view.safe.top + 60, top + 60));
    if (this.index < this.length && this.layer.children.length) this.place();
    // Gesture computed for the old layout: after a rotation or resize the hand disappears.
    this.hand?.stop();
  }
}
