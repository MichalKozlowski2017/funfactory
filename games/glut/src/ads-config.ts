import { TEST_AD_UNITS, type AdsConfig } from '@funfactory/core';

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
