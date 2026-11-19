import { registerPlugin } from '@capacitor/core';
import { isNative, platformName } from './platform.ts';

/** Gracz z Game Center (iOS) albo Google Play Games (Android): nick bierzemy stamtąd. */
export interface GamePlayer {
  authenticated: boolean;
  playerId: string;
  alias: string;
}

interface NativeGameServices {
  signIn(): Promise<GamePlayer>;
  submitScore(o: { leaderboardId: string; score: number }): Promise<{ submitted: boolean; error?: string }>;
  showLeaderboard(o: { leaderboardId?: string }): Promise<void>;
}

/** Identyfikatory tablic wyników na platformę (nazwa tablicy w grze → ID z App Store Connect / Play Console). */
export interface GameServicesConfig {
  ios: Record<string, string>;
  android: Record<string, string>;
}

const native = registerPlugin<NativeGameServices>('GameServices');

/**
 * Tablice wyników przez usługi systemowe: Game Center na iOS, Google Play Games na Androidzie.
 * Natywna część to wtyczka „GameServices” w projekcie gry (Swift: GameKit, Java: Play Games v2).
 * W przeglądarce i bez zalogowanego gracza wszystko jest bezczynne. Błędy nigdy nie przerywają gry.
 */
export class GameServices {
  player: GamePlayer | null = null;
  private ids: Record<string, string> = {};
  private started = false;

  get available(): boolean {
    return isNative() && !!this.player?.authenticated;
  }

  /** Logowanie (system może pokazać swoje okno). Wołaj raz po starcie gry. */
  async init(cfg: GameServicesConfig): Promise<void> {
    if (!isNative() || this.started) return;
    this.started = true;
    this.ids = platformName() === 'ios' ? cfg.ios : cfg.android;
    try {
      this.player = await native.signIn();
    } catch {
      this.player = null;
    }
  }

  /** Wysyła wynik na tablicę (usługa sama trzyma najlepszy wynik gracza). */
  async submit(board: string, score: number): Promise<boolean> {
    const id = this.ids[board];
    if (!this.available || !id) return false;
    try {
      return (await native.submitScore({ leaderboardId: id, score: Math.max(0, Math.floor(score)) })).submitted;
    } catch {
      return false;
    }
  }

  /** Systemowy ekran tablic (bez nazwy: lista wszystkich tablic gry). */
  async show(board?: string): Promise<boolean> {
    if (!this.available) return false;
    const id = board ? this.ids[board] : undefined;
    try {
      await native.showLeaderboard(id ? { leaderboardId: id } : {});
      return true;
    } catch {
      return false;
    }
  }
}

/** Wspólny obiekt usług gier (jeden na aplikację). */
export const gameServices = new GameServices();
