interface Timer {
  left: number;
  every: number;
  fn: () => void;
}

/** Timery w czasie gry (respektują pauzę i slow-motion w przeciwieństwie do setTimeout). */
export class Timers {
  private items: Timer[] = [];

  after(seconds: number, fn: () => void): () => void {
    const timer: Timer = { left: seconds, every: 0, fn };
    this.items.push(timer);
    return () => this.cancel(timer);
  }

  every(seconds: number, fn: () => void): () => void {
    const timer: Timer = { left: seconds, every: seconds, fn };
    this.items.push(timer);
    return () => this.cancel(timer);
  }

  update(dt: number): void {
    for (const timer of [...this.items]) {
      timer.left -= dt;
      while (timer.left <= 0) {
        timer.fn();
        if (timer.every <= 0) {
          this.cancel(timer);
          break;
        }
        timer.left += timer.every;
      }
    }
  }

  clear(): void {
    this.items = [];
  }

  private cancel(timer: Timer): void {
    const i = this.items.indexOf(timer);
    if (i >= 0) this.items.splice(i, 1);
  }
}
