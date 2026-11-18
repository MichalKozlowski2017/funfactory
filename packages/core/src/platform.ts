import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const platformName = (): 'ios' | 'android' | 'web' => Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/** Wibracje. Na webie fallback do navigator.vibrate (iOS Safari go nie ma, wtedy cisza). */
export const haptics = {
  enabled: true,

  tap(): void {
    if (!this.enabled) return;
    if (isNative()) void Haptics.impact({ style: ImpactStyle.Light });
    else navigator.vibrate?.(8);
  },

  hit(): void {
    if (!this.enabled) return;
    if (isNative()) void Haptics.impact({ style: ImpactStyle.Medium });
    else navigator.vibrate?.(16);
  },

  heavy(): void {
    if (!this.enabled) return;
    if (isNative()) void Haptics.impact({ style: ImpactStyle.Heavy });
    else navigator.vibrate?.(30);
  },

  success(): void {
    if (!this.enabled) return;
    if (isNative()) void Haptics.notification({ type: NotificationType.Success });
    else navigator.vibrate?.([10, 40, 10]);
  },

  error(): void {
    if (!this.enabled) return;
    if (isNative()) void Haptics.notification({ type: NotificationType.Error });
    else navigator.vibrate?.([30, 40, 30]);
  },
};

/**
 * Zapis gry jako JSON. Na telefonie Capacitor Preferences (przetrwa czyszczenie WebView),
 * w przeglądarce localStorage.
 */
export class SaveStore<T extends object> {
  private readonly key: string;
  private readonly defaults: T;

  constructor(key: string, defaults: T) {
    this.key = key;
    this.defaults = defaults;
  }

  async load(): Promise<T> {
    try {
      const raw = isNative() ? (await Preferences.get({ key: this.key })).value : localStorage.getItem(this.key);
      if (!raw) return structuredClone(this.defaults);
      return { ...structuredClone(this.defaults), ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return structuredClone(this.defaults);
    }
  }

  async save(data: T): Promise<void> {
    const raw = JSON.stringify(data);
    try {
      if (isNative()) await Preferences.set({ key: this.key, value: raw });
      else localStorage.setItem(this.key, raw);
    } catch {
      // Brak miejsca albo zablokowany storage: gra działa dalej bez zapisu.
    }
  }

  async clear(): Promise<void> {
    if (isNative()) await Preferences.remove({ key: this.key });
    else localStorage.removeItem(this.key);
  }
}
