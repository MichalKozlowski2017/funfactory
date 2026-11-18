/**
 * Sprężyna 1D (półjawny Euler, stabilna dla dt <= 1/30).
 * Dobra do sprężystych reakcji: skala po dotknięciu, wychylenie, podążanie kamery.
 *
 * `stiffness` ~ 100–400, `damping` ~ 10–30. Mniejsze tłumienie = więcej drgań.
 */
export class Spring {
  value: number;
  target: number;
  velocity = 0;

  constructor(
    initial = 0,
    public stiffness = 220,
    public damping = 16,
  ) {
    this.value = initial;
    this.target = initial;
  }

  /** Dodaje impuls prędkości, np. `spring.kick(-4)` przy uderzeniu. */
  kick(impulse: number): void {
    this.velocity += impulse;
  }

  snap(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  update(dt: number): number {
    // Długie klatki dzielimy, żeby sprężyna nie eksplodowała.
    let left = Math.min(dt, 0.25);
    while (left > 0) {
      const h = Math.min(left, 1 / 120);
      const force = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
      this.velocity += force * h;
      this.value += this.velocity * h;
      left -= h;
    }
    return this.value;
  }

  get settled(): boolean {
    return Math.abs(this.target - this.value) < 1e-3 && Math.abs(this.velocity) < 1e-3;
  }
}
