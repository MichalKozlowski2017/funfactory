import { describe, expect, it } from 'vitest';
import { candies, detectLang, formatDay, missingTranslations, setLang, t } from './i18n.ts';

describe('i18n', () => {
  it('has English names for every item, achievement and world', () => {
    expect(missingTranslations()).toEqual([]);
  });

  it('detects Polish only for Polish phones', () => {
    expect(detectLang(['pl-PL', 'en-US'])).toBe('pl');
    expect(detectLang(['en-GB'])).toBe('en');
    expect(detectLang(['de-DE', 'pl-PL'])).toBe('en');
    expect(detectLang([])).toBe('en');
  });

  it('fills variables and plurals in both languages', () => {
    setLang('pl');
    expect(t('candiesRun', { n: 3, candies: candies(3), total: 10 })).toBe('+3 cukierki (razem 10)');
    expect(candies(5)).toBe('cukierków');
    expect(candies(22)).toBe('cukierki');
    expect(formatDay('2026-11-09')).toBe('9.11.2026');
    setLang('en');
    expect(t('candiesRun', { n: 1, candies: candies(1), total: 10 })).toBe('+1 candy (total 10)');
    expect(formatDay('2026-11-09')).toBe('Nov 9, 2026');
    setLang('pl');
  });
});
