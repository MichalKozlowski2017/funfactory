import { Texture } from 'pixi.js';
import { popIn, pulse } from '@funfactory/kit2d';
import { say } from '../assets.ts';
import { EMOTION_CHARS, EMOTIONS, makeEmotionRound, type Emotion, type EmotionQuestion } from '../sim/emotions.ts';
import { state } from '../state.ts';
import { Card, label, sfx } from '../ui.ts';
import { RoundScene } from './round.ts';
import type { Gesture } from '../hand.ts';

/** Minka zastępcza (gdy grafiki jeszcze nie ma): emotikonka z tekstu. */
const FALLBACK: Record<Emotion, string> = { wesoly: '😄', smutny: '😢', zly: '😠', zdziwiony: '😮', przestraszony: '😨', spiacy: '😴' };

/**
 * Emocje (Polana Zagadek): Bazyl prosi o minkę („Pokaż smutną minkę!”), dziecko wybiera twarz.
 * Po trafieniu lektor nazywa minkę.
 */
export class EmotionScene extends RoundScene {
  readonly id = 'emotions';
  private questions: EmotionQuestion[] = [];
  private cards: Card[] = [];

  constructor() {
    super('emocje', 'bazyl');
  }

  protected async prepare(): Promise<void> {
    // Tylko postaci, które mają komplet minek (grafiki mogą jeszcze nie istnieć).
    const chars = EMOTION_CHARS.filter((c) => EMOTIONS.every((e) => this.art.emotions.has(`${e}:${c}`)));
    this.questions = makeEmotionRound(this.game.rng, state.progress.levels.emocje ?? 0, chars.length ? chars : ['dziecko']);
    this.length = this.questions.length;
  }

  protected override taskFacts(): string[] {
    return [`emocja:${this.q.target}`];
  }

  protected override taskEasy(): boolean {
    return this.q.options.length <= 2;
  }

  private get q(): EmotionQuestion {
    return this.questions[this.index]!;
  }

  protected promptLine(): string {
    return `emocje-${this.q.target}`;
  }

  protected show(): void {
    this.cards = this.q.options.map((e) => {
      const tex = this.art.emotions.get(`${e}:${this.q.char}`);
      const card = new Card(tex ?? Texture.EMPTY, 240);
      if (!tex) {
        card.picture.visible = false;
        card.face.addChild(label(FALLBACK[e], 120, this.game.pixelRatio));
      }
      card.onTap = () => this.answer(card, e);
      this.layer.addChild(card);
      return card;
    });
    this.timers.after(0.3, () => this.markAsked(say(this.game, this.guide, this.promptLine())));
  }

  protected override appear(): void {
    this.cards.forEach((c, i) => {
      void popIn(this.tweens, c, 0.4, i * 0.07);
      this.timers.after(i * 0.07, () => sfx.pop(this.game.sound, 0.9 + i * 0.06));
    });
  }

  private answer(card: Card, e: Emotion): void {
    if (this.busy || !card.enabled) return;
    this.idle = 0;
    if (e === this.q.target) {
      card.markGood();
      void pulse(this.tweens, card, 0.18, 0.3);
      const at = this.layer.toLocal(card.getGlobalPosition());
      this.burst(at.x, at.y);
      for (const other of this.cards) if (other !== card) this.tweens.to(other, { alpha: 0.35 }, { duration: 0.25 });
      this.solved(say(this.game, this.guide, `minka-${e}`));
    } else {
      card.enabled = false;
      const x = card.x;
      void this.tweens.to(card, { x: x + 14 }, { duration: 0.05, yoyo: true, repeat: 5 }).done.then(() => (card.x = x));
      this.tweens.to(card, { alpha: 0.35 }, { duration: 0.3, delay: 0.3 });
      this.missed();
    }
  }

  /** Playtest. */
  solve(): void {
    const i = this.q.options.indexOf(this.q.target);
    this.answer(this.cards[i]!, this.q.target);
  }

  protected override tempoGroup(): string | null {
    return 'emocja';
  }

  protected override gesture(): Gesture | null {
    const card = this.cards[this.q.options.indexOf(this.q.target)];
    return card ? { kind: 'tap', at: [this.spot(card)] } : null;
  }

  protected hint(): void {
    const card = this.cards[this.q.options.indexOf(this.q.target)];
    if (card) void this.tweens.to(card, { rotation: 0.08 }, { duration: 0.12, yoyo: true, repeat: 5, ease: 'sineInOut' }).done.then(() => (card.rotation = 0));
  }

  protected place(): void {
    if (!this.cards.length) return;
    const { width: w, height: h, safe } = this.stage;
    const left = safe.left + 260;
    const right = w - safe.right - 40;
    const n = this.cards.length;
    const gap = 30;
    const size = Math.min(260, (right - left - gap * (n - 1)) / n);
    const cx = (left + right) / 2;
    this.cards.forEach((c, i) => {
      c.layoutCard(size);
      c.position.set(cx + (i - (n - 1) / 2) * (size + gap), h / 2 + 30);
    });
  }

  protected override step(dt: number): void {
    for (const c of this.cards) c.tick(dt);
  }
}
