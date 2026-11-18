/**
 * Jedna warstwa syntezowanego efektu (styl sfxr). Efekt to tablica warstw grających razem.
 * Częstotliwości w Hz, czasy w sekundach.
 */
export interface SynthLayer {
  wave: OscillatorType | 'noise';
  freq: number;
  /** Częstotliwość na końcu (wykładniczy poślizg). */
  freqEnd?: number;
  duration: number;
  attack?: number;
  volume?: number;
  /** Opóźnienie startu warstwy (arpeggio). */
  delay?: number;
  /** Filtr: dla szumu wymagany sens brzmienia (np. 'bandpass' + freq). */
  filter?: BiquadFilterType;
  filterFreq?: number;
  filterFreqEnd?: number;
}

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

  private primed = false;

  constructor() {
    if (typeof window === 'undefined') return;
    // iOS (WKWebView) odblokowuje dźwięk dopiero w geście typu touchend/click, a po wyjściu z aplikacji
    // albo połączeniu przechodzi w stan 'interrupted'. Dlatego słuchamy stale i wznawiamy przy każdym dotyku.
    const unlock = () => {
      const ctx = this.context();
      if (!ctx) return;
      if (ctx.state !== 'running') void ctx.resume();
      if (!this.primed) {
        // Starszy WebKit naprawdę włącza wyjście dopiero, gdy w geście coś zagra (tu: 1 próbka ciszy).
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start();
        this.primed = true;
      }
    };
    for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
    });
  }

  /** Stan kontekstu audio (do diagnostyki): 'none' przed pierwszym dotknięciem. */
  get state(): string {
    return this.ctx?.state ?? 'none';
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

  /**
   * Syntezowany efekt bez plików audio.
   * `pitch` mnoży wszystkie częstotliwości (np. rosnące tony przy serii), `volume` skaluje głośność.
   */
  synth(layers: SynthLayer[], opts: { pitch?: number; volume?: number } = {}): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const pitch = opts.pitch ?? 1;
    const now = ctx.currentTime;
    for (const l of layers) {
      const t0 = now + (l.delay ?? 0);
      const t1 = t0 + l.duration;
      const gain = ctx.createGain();
      const peak = (l.volume ?? 0.3) * (opts.volume ?? 1);
      const attack = l.attack ?? 0.005;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      let source: AudioScheduledSourceNode;
      if (l.wave === 'noise') {
        const src = ctx.createBufferSource();
        src.buffer = this.noise(ctx);
        src.loop = true;
        source = src;
      } else {
        const osc = ctx.createOscillator();
        osc.type = l.wave;
        osc.frequency.setValueAtTime(l.freq * pitch, t0);
        if (l.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, l.freqEnd * pitch), t1);
        source = osc;
      }
      let node: AudioNode = source;
      if (l.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = l.filter;
        filter.frequency.setValueAtTime((l.filterFreq ?? l.freq) * pitch, t0);
        if (l.filterFreqEnd) filter.frequency.exponentialRampToValueAtTime(l.filterFreqEnd * pitch, t1);
        node.connect(filter);
        node = filter;
      }
      node.connect(gain).connect(this.master);
      source.start(t0);
      source.stop(t1 + 0.02);
    }
  }

  private noiseBuffer: AudioBuffer | null = null;

  private noise(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
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
