import type { Container } from 'pixi.js';
import { type Rng, type Tweens } from '@funfactory/core';

/**
 * „Juice”: drobne animacje reakcji, które sprawiają, że gra jest przyjemna w dotyku.
 * Wszystkie działają na `scale` / `position` / `alpha` obiektu i używają tweenów sceny.
 */

/** Spłaszczenie i powrót (lądowanie, uderzenie, dotknięcie). `amount` 0.1–0.4. */
export async function squash(tweens: Tweens, target: Container, amount = 0.25, seconds = 0.22): Promise<void> {
  const base = { x: target.scale.x, y: target.scale.y };
  tweens.killOf(target.scale);
  await tweens.to(target.scale, { x: base.x * (1 + amount), y: base.y * (1 - amount) }, { duration: seconds * 0.3, ease: 'quadOut' })
    .done;
  await tweens.to(target.scale, { x: base.x, y: base.y }, { duration: seconds * 0.7, ease: 'elasticOut' }).done;
}

/** Rozciągnięcie w pionie (skok, wystrzał w górę). */
export async function stretch(tweens: Tweens, target: Container, amount = 0.2, seconds = 0.25): Promise<void> {
  return squash(tweens, target, -amount, seconds);
}

/** Pojawienie się z „pyknięciem” od zera. */
export async function popIn(tweens: Tweens, target: Container, seconds = 0.4, delay = 0): Promise<void> {
  const end = { x: target.scale.x || 1, y: target.scale.y || 1 };
  target.scale.set(0);
  await tweens.to(target.scale, end, { duration: seconds, ease: 'backOut', delay }).done;
}

/** Zniknięcie: skurczenie + przezroczystość. */
export async function popOut(tweens: Tweens, target: Container, seconds = 0.2): Promise<void> {
  tweens.to(target, { alpha: 0 }, { duration: seconds, ease: 'quadIn' });
  await tweens.to(target.scale, { x: 0, y: 0 }, { duration: seconds, ease: 'backIn' }).done;
}

/** Krótkie pulsowanie (np. licznik punktów po zmianie). */
export async function pulse(tweens: Tweens, target: Container, amount = 0.15, seconds = 0.18): Promise<void> {
  const base = target.scale.x;
  tweens.killOf(target.scale);
  await tweens.to(target.scale, { x: base * (1 + amount), y: base * (1 + amount) }, {
    duration: seconds / 2,
    ease: 'quadOut',
    yoyo: true,
    repeat: 1,
  }).done;
}

/** Miganie (nietykalność, trafienie). */
export async function blink(tweens: Tweens, target: Container, times = 3, seconds = 0.4): Promise<void> {
  await tweens.to(target, { alpha: 0.25 }, { duration: seconds / (times * 2), repeat: times * 2 - 1, yoyo: true, ease: 'linear' })
    .done;
  target.alpha = 1;
}

/** Ciągłe „oddychanie” bezczynnej postaci. Zwraca funkcję zatrzymującą. */
export function idleBreath(tweens: Tweens, target: Container, amount = 0.04, period = 1.6): () => void {
  const base = { x: target.scale.x, y: target.scale.y };
  const tween = tweens.to(target.scale, { x: base.x * (1 + amount * 0.5), y: base.y * (1 - amount) }, {
    duration: period / 2,
    ease: 'sineInOut',
    repeat: -1,
    yoyo: true,
  });
  return () => {
    tween.kill();
    target.scale.set(base.x, base.y);
  };
}

/**
 * Trzęsienie ekranu oparte na „traumie” (0–1). Kumuluje się przy kolejnych trafieniach i wygasa.
 * Przypnij do kontenera świata (nie UI): `shaker.update(dt)` co klatkę.
 */
export class Shaker {
  trauma = 0;
  /** Maksymalne przesunięcie w jednostkach gry. */
  maxOffset = 18;
  maxAngle = 0.04;
  decay = 1.6;
  private readonly base = { x: 0, y: 0, rotation: 0 };
  private time = 0;

  constructor(
    private readonly target: Container,
    private readonly rng?: Rng,
  ) {
    this.base = { x: target.x, y: target.y, rotation: target.rotation };
  }

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Aktualizuj, jeśli kontener zmienił pozycję bazową (np. kamera). */
  setBase(x: number, y: number): void {
    this.base.x = x;
    this.base.y = y;
  }

  update(dt: number): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - this.decay * dt);
    const shake = this.trauma * this.trauma;
    const r = () => (this.rng ? this.rng.next() : Math.random()) * 2 - 1;
    this.target.x = this.base.x + this.maxOffset * shake * r();
    this.target.y = this.base.y + this.maxOffset * shake * r();
    this.target.rotation = this.base.rotation + this.maxAngle * shake * r();
  }
}
