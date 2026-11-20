// Bez statycznego importu AdMob: biblioteka przychodzi z `init(cfg, load)`. Gra wywołuje init tylko z włączonymi
// reklamami, więc z wyłączonymi kod AdMob (z wywołaniami pytania o śledzenie) w ogóle nie trafia do paczki.
type AdMobModule = typeof import('./admob.ts');
import { isNative, platformName } from './platform.ts';

/** Identyfikatory jednostek reklamowych na platformę. */
export interface AdUnits {
  banner: string;
  interstitial: string;
}

export interface AdsConfig {
  ios: AdUnits;
  android: AdUnits;
  /** Reklamy testowe Google (do czasu prawdziwego konta AdMob i w buildach deweloperskich). */
  testing: boolean;
}

/** Testowe jednostki Google: zawsze bezpieczne do klikania w czasie rozwoju. */
export const TEST_AD_UNITS: { ios: AdUnits; android: AdUnits } = {
  ios: { banner: 'ca-app-pub-3940256099942544/2435281174', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
  android: { banner: 'ca-app-pub-3940256099942544/9214589741', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
};

/**
 * Reklamy (AdMob) dla gier: zgoda RODO (Google UMP), pytanie o śledzenie na iOS (ATT),
 * baner na dole i reklama pełnoekranowa. W przeglądarce wszystko jest bezczynne.
 * Błędy reklam nigdy nie przerywają gry: każda metoda je połyka.
 */
export class Ads {
  private units: AdUnits | null = null;
  private testing = true;
  private ready = false;
  private bannerShown = false;
  private interstitialLoaded = false;
  /** Biblioteka AdMob (wczytana w init). */
  private m: AdMobModule | null = null;
  /** Bez reklam (np. po zakupie): nic się nie wyświetla. */
  disabled = false;
  /**
   * Wysokość widocznego banera w punktach CSS (0, gdy go nie ma). Gra rezerwuje nad nim miejsce,
   * żeby baner nie zasłaniał przycisków. Zmiany zgłasza `onBanner`.
   */
  bannerHeight = 0;
  private readonly bannerListeners = new Set<(height: number) => void>();
  /** Baner udawany w przeglądarce (playtesty): wysokość w punktach CSS. */
  private simulated = 0;

  /** Powiadomienie o zmianie wysokości banera. Zwraca funkcję wypisującą. */
  onBanner(fn: (height: number) => void): () => void {
    this.bannerListeners.add(fn);
    return () => this.bannerListeners.delete(fn);
  }

  /** Playtesty w przeglądarce: udaje baner o danej wysokości, gdy gra go pokazuje. */
  simulateBanner(height: number): void {
    this.simulated = height;
  }

  private setBannerHeight(height: number): void {
    if (height === this.bannerHeight) return;
    this.bannerHeight = height;
    for (const fn of this.bannerListeners) fn(height);
  }

  get available(): boolean {
    return isNative() && this.ready && !this.disabled;
  }

  /** `load`: np. `() => import('@funfactory/core/admob')`; wołaj tylko, gdy gra ma reklamy. */
  async init(cfg: AdsConfig, load: () => Promise<AdMobModule>): Promise<void> {
    if (!isNative() || this.ready) return;
    this.units = platformName() === 'ios' ? cfg.ios : cfg.android;
    this.testing = cfg.testing;
    try {
      this.m = await load();
      const { AdMob, BannerAdPluginEvents } = this.m;
      await this.m.startAdMob(cfg.testing);
      void AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
        // iOS podaje punkty; gdyby platforma podała piksele (adaptacyjny baner ma ok. 50–90 pt), przeliczamy.
        const h = size.height > 150 ? size.height / (window.devicePixelRatio || 1) : size.height;
        this.setBannerHeight(this.bannerShown ? h : 0);
      });
      this.ready = true;
      void this.loadInterstitial();
    } catch {
      this.ready = false;
    }
  }

  /** Ustawienia prywatności (wymóg UMP: gracz musi móc zmienić zgodę). */
  async privacyOptions(): Promise<void> {
    if (!isNative() || !this.m) return;
    try {
      await this.m.AdMob.showPrivacyOptionsForm();
    } catch {
      /* brak formularza poza UE */
    }
  }

  async showBanner(): Promise<void> {
    if (!isNative() && this.simulated) {
      this.bannerShown = true;
      this.setBannerHeight(this.simulated);
      return;
    }
    if (!this.available || !this.units || this.bannerShown || !this.m) return;
    const { AdMob, BannerAdPosition, BannerAdSize } = this.m;
    this.bannerShown = true;
    try {
      await AdMob.showBanner({
        adId: this.units.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: this.testing,
      });
    } catch {
      this.bannerShown = false;
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.bannerShown) return;
    this.bannerShown = false;
    this.setBannerHeight(0);
    if (!isNative() || !this.m) return;
    try {
      await this.m.AdMob.removeBanner();
    } catch {
      /* nic */
    }
  }

  /** Pokazuje reklamę pełnoekranową, jeśli jest gotowa. Zwraca, czy się pokazała (gra czeka do zamknięcia). */
  async showInterstitial(): Promise<boolean> {
    if (!this.available || !this.interstitialLoaded || !this.m) return false;
    this.interstitialLoaded = false;
    try {
      await this.m.AdMob.showInterstitial();
      return true;
    } catch {
      return false;
    } finally {
      void this.loadInterstitial();
    }
  }

  private async loadInterstitial(): Promise<void> {
    if (!this.available || !this.units || this.interstitialLoaded || !this.m) return;
    try {
      await this.m.AdMob.prepareInterstitial({ adId: this.units.interstitial, isTesting: this.testing });
      this.interstitialLoaded = true;
    } catch {
      this.interstitialLoaded = false;
    }
  }
}

/** Wspólny obiekt reklam (jeden na aplikację). */
export const ads = new Ads();
