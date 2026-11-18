/**
 * Kiedy pokazać reklamę pełnoekranową (decyzja właściciela: tylko między biegami, z limitami,
 * żeby nie irytowała). Czysta logika, czas w sekundach podawany z zewnątrz.
 */
export const AD_RULES = {
  /** Pierwsza reklama najwcześniej po tylu skończonych biegach w sesji. */
  firstAfterRuns: 3,
  /** Potem co tyle biegów. */
  everyRuns: 3,
  /** I nie częściej niż co tyle sekund. */
  minGap: 120,
  /** Nie po bardzo krótkim biegu (szybka śmierć + reklama = odinstalowanie). */
  minRunSeconds: 20,
} as const;

export class AdPolicy {
  private runs = 0;
  private sinceAd = 0;
  private lastAdAt = -Infinity;

  /** Bieg się skończył (śmierć). */
  runEnded(): void {
    this.runs++;
    this.sinceAd++;
  }

  /** Czy przy „Jeszcze raz” pokazać reklamę (po biegu trwającym `runSeconds`, teraz = `now`). */
  shouldShow(now: number, runSeconds: number): boolean {
    if (this.runs < AD_RULES.firstAfterRuns) return false;
    if (this.sinceAd < AD_RULES.everyRuns) return false;
    if (now - this.lastAdAt < AD_RULES.minGap) return false;
    return runSeconds >= AD_RULES.minRunSeconds;
  }

  shown(now: number): void {
    this.sinceAd = 0;
    this.lastAdAt = now;
  }
}
