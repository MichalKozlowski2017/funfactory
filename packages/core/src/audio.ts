export interface PlayOptions {
  volume?: number;
  /** Mnożnik wysokości/prędkości. Losowanie ±5% likwiduje efekt „karabinu maszynowego”. */
  rate?: number;
  loop?: boolean;
}

/**
 * Minimalny dźwięk na Web Audio. Działa w WebView iOS i Android.
 * Kontekst odblokowuje się przy pierwszym dotknięciu (wymóg przeglądarek).
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, string>();
  private music: AudioBufferSourceNode | null = null;
  muted = false;

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.context();
      void this.ctx?.resume();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
  }

  /** Rejestruje plik. Dekodowanie następuje przy `preload()` albo pierwszym `play()`. */
  add(name: string, url: string): void {
    this.pending.set(name, url);
  }

  async preload(): Promise<void> {
    await Promise.all([...this.pending.keys()].map((name) => this.decode(name)));
  }

  play(name: string, opts: PlayOptions = {}): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const buffer = this.buffers.get(name);
    if (!buffer) {
      void this.decode(name);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = opts.rate ?? 1;
    src.loop = opts.loop ?? false;
    const gain = ctx.createGain();
    gain.gain.value = opts.volume ?? 1;
    src.connect(gain).connect(this.master);
    src.start();
    if (src.loop) {
      this.music?.stop();
      this.music = src;
    }
  }

  stopMusic(): void {
    this.music?.stop();
    this.music = null;
  }

  setVolume(volume: number): void {
    if (this.master) this.master.gain.value = volume;
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof AudioContext === 'undefined') return null;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  private async decode(name: string): Promise<void> {
    const url = this.pending.get(name);
    const ctx = this.context();
    if (!url || !ctx || this.buffers.has(name)) return;
    const data = await (await fetch(url)).arrayBuffer();
    this.buffers.set(name, await ctx.decodeAudioData(data));
  }
}
