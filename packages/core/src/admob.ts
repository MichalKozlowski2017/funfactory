// Biblioteka AdMob osobno (zob. ads.ts): importuj dynamicznie tylko w grach z włączonymi reklamami.
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { platformName } from './platform.ts';

export * from '@capacitor-community/admob';

/** Zgoda RODO (formularz Google UMP tam, gdzie wymagany), na iOS pytanie o śledzenie (ATT), potem start SDK. */
export async function startAdMob(testing: boolean): Promise<void> {
  const consent = await AdMob.requestConsentInfo();
  if (consent.status === AdmobConsentStatus.REQUIRED && consent.isConsentFormAvailable) await AdMob.showConsentForm();
  if (platformName() === 'ios') {
    const { status } = await AdMob.trackingAuthorizationStatus();
    if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
  }
  await AdMob.initialize({ initializeForTesting: testing });
}
