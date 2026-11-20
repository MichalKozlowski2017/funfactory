import { TEST_AD_UNITS, type AdsConfig } from '@funfactory/core';

/**
 * Reklamy na start wyłączone (decyzja właściciela 20.11.2026: najpierw sprawdzamy ruch).
 * Włączenie: budowanie z `GLUT_ADS=1` (stała `__ADS__` w vite.config.ts), z powrotem `@capacitor-community/admob` w package.json gry,
 * w Info.plist GADApplicationIdentifier + NSUserTrackingUsageDescription + SKAdNetworkItems,
 * w AndroidManifest com.google.android.gms.ads.APPLICATION_ID (wartości w historii git, commit „reklamy wyłączone”).
 */
export const ADS_ENABLED: boolean = typeof __ADS__ !== 'undefined' && __ADS__;

/**
 * Reklamy Gluta. Do czasu konta AdMob właściciela: testowe jednostki Google.
 * Po założeniu konta: wpisz tu prawdziwe ID jednostek (banner, interstitial) dla iOS i Androida,
 * ustaw `testing: false`, a w Info.plist (GADApplicationIdentifier) i AndroidManifest
 * (com.google.android.gms.ads.APPLICATION_ID) wpisz prawdziwe ID aplikacji. Instrukcja: docs/release.md.
 */
export const ADS: AdsConfig = {
  ios: TEST_AD_UNITS.ios,
  android: TEST_AD_UNITS.android,
  testing: true,
};
