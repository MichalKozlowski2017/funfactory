import { AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
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
  /** Bez reklam (np. po zakupie): nic się nie wyświetla. */
  disabled = false;

  get available(): boolean {
    return isNative() && this.ready && !this.disabled;
  }

  async init(cfg: AdsConfig): Promise<void> {
    if (!isNative() || this.ready) return;
    this.units = platformName() === 'ios' ? cfg.ios : cfg.android;
    this.testing = cfg.testing;
    try {
      // Najpierw zgoda RODO (formularz pokazuje się tylko w UE/tam, gdzie wymagany), potem ATT na iOS.
      const consent = await AdMob.requestConsentInfo();
      if (consent.status === AdmobConsentStatus.REQUIRED && consent.isConsentFormAvailable) await AdMob.showConsentForm();
      if (platformName() === 'ios') {
        const { status } = await AdMob.trackingAuthorizationStatus();
        if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      }
      await AdMob.initialize({ initializeForTesting: cfg.testing });
      this.ready = true;
      void this.loadInterstitial();
    } catch {
      this.ready = false;
    }
  }

  /** Ustawienia prywatności (wymóg UMP: gracz musi móc zmienić zgodę). */
  async privacyOptions(): Promise<void> {
    if (!isNative()) return;
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch {
      /* brak formularza poza UE */
    }
  }

  async showBanner(): Promise<void> {
    if (!this.available || !this.units || this.bannerShown) return;
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
    if (!isNative() || !this.bannerShown) return;
    this.bannerShown = false;
    try {
      await AdMob.removeBanner();
    } catch {
      /* nic */
    }
  }

  /** Pokazuje reklamę pełnoekranową, jeśli jest gotowa. Zwraca, czy się pokazała (gra czeka do zamknięcia). */
  async showInterstitial(): Promise<boolean> {
    if (!this.available || !this.interstitialLoaded) return false;
    this.interstitialLoaded = false;
    try {
      await AdMob.showInterstitial();
      return true;
    } catch {
      return false;
    } finally {
      void this.loadInterstitial();
    }
  }

  private async loadInterstitial(): Promise<void> {
    if (!this.available || !this.units || this.interstitialLoaded) return;
    try {
      await AdMob.prepareInterstitial({ adId: this.units.interstitial, isTesting: this.testing });
      this.interstitialLoaded = true;
    } catch {
      this.interstitialLoaded = false;
    }
  }
}

/** Wspólny obiekt reklam (jeden na aplikację). */
export const ads = new Ads();
