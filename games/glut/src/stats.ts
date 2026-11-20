import { isNative, platformName } from '@funfactory/core';

/**
 * Anonimowe statystyki gry (tylko za zgodą gracza, zob. polityka prywatności na mkdev.com.pl/apps/glut/privacy-policy).
 * Zdarzenia trafiają do kolejki (localStorage, przetrwa zamknięcie gry) i lecą paczkami do serwera
 * `services/glut-stats` (Vercel + Neon): po biegu, przy zejściu gry w tło i co minutę. Bez sieci czekają.
 * W przeglądarce (playtesty, dev) nic nie wysyłamy, chyba że adres ma `?stats`.
 */
export const STATS_URL = 'https://glut-stats.vercel.app/api/events';

export type StatsEvent = 'session' | 'run' | 'funnel' | 'buy' | 'ach' | 'error';

interface Queued {
  n: StatsEvent;
  t: number;
  d: Record<string, unknown>;
}

const QUEUE_KEY = 'glut-stats-queue';
const MAX_QUEUE = 500;
const BATCH = 100;

export function newInstallId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Wersja systemu z user agenta, np. "iOS 18.1" / "Android 15" (bez modelu telefonu). */
function osVersion(): string {
  const ua = navigator.userAgent;
  const ios = /OS (\d+)[._](\d+)/.exec(ua);
  if (/iPhone|iPad/.test(ua) && ios) return `iOS ${ios[1]}.${ios[2]}`;
  const android = /Android (\d+(?:\.\d+)?)/.exec(ua);
  if (android) return `Android ${android[1]}`;
  return 'other';
}

export class Stats {
  private enabled = false;
  private install = '';
  private readonly session = newInstallId();
  private queue: Queued[] = [];
  private sending = false;
  private errors = 0;
  private readonly allowed = isNative() || new URLSearchParams(location.search).has('stats');
  private readonly build: string;

  constructor(build: string) {
    this.build = build;
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) this.queue = (JSON.parse(raw) as Queued[]).slice(-MAX_QUEUE);
    } catch {
      this.queue = [];
    }
    window.setInterval(() => void this.flush(), 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flush(true);
    });
    window.addEventListener('error', (e) => this.error(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => this.error(String(e.reason)));
  }

  /** Włącza albo wyłącza wysyłanie. Wyłączenie czyści kolejkę (gracz cofnął zgodę). */
  configure(enabled: boolean, install: string): void {
    this.enabled = enabled && this.allowed && !!install;
    this.install = install;
    if (!enabled) {
      this.queue = [];
      this.persist();
    }
  }

  track(name: StatsEvent, data: Record<string, unknown> = {}): void {
    if (!this.enabled) return;
    this.queue.push({ n: name, t: Date.now(), d: data });
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    this.persist();
  }

  /** Błąd JavaScriptu (najwyżej 5 na uruchomienie). */
  error(message: string): void {
    if (this.errors >= 5) return;
    this.errors++;
    this.track('error', { msg: message.slice(0, 200) });
  }

  /** Wysyła kolejkę. `keepalive`: przy zamykaniu gry, żeby żądanie przeżyło przejście w tło. */
  async flush(keepalive = false): Promise<void> {
    if (!this.enabled || this.sending || this.queue.length === 0) return;
    this.sending = true;
    const batch = this.queue.slice(0, BATCH);
    try {
      const res = await fetch(STATS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive,
        body: JSON.stringify({
          install: this.install,
          session: this.session,
          build: this.build,
          platform: platformName(),
          os: osVersion(),
          lang: navigator.language.slice(0, 5),
          events: batch,
        }),
      });
      // 4xx: paczka i tak nie przejdzie (np. zła wersja formatu), więc ją porzucamy. 5xx / brak sieci: spróbujemy później.
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        this.queue.splice(0, batch.length);
        this.persist();
      }
    } catch {
      /* brak sieci: zostaje w kolejce */
    } finally {
      this.sending = false;
    }
    if (this.queue.length >= BATCH && !keepalive) void this.flush();
  }

  private persist(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      /* bez pamięci przeglądarki: kolejka tylko w RAM */
    }
  }
}
