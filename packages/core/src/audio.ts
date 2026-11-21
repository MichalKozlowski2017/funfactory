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
  /** Panorama stereo -1 (lewo) .. 1 (prawo). */
  pan?: number;
  /**
   * Podtrzymanie (0..1 szczytu): dźwięk trzyma ten poziom do końca i wygasa w `release` sekund
   * (pady, smyczki). Bez tego: od razu wykładnicze wygasanie (perkusja, dzwonki).
   */
  sustain?: number;
  release?: number;
}

/** Odtwarzanie bufora (próbki instrumentu) w zaplanowanym czasie, jak `synth`. */
export interface SampleOptions {
  /** Czas kontekstu audio startu (domyślnie: teraz). */
  at?: number;
  /** Wyjście (np. szyna muzyki); bez niego dźwięk jest efektem (wyciszany przez `sfxMuted`). */
  output?: AudioNode;
  /** Mnożnik prędkości = wysokości (2 = oktawa wyżej). */
  rate?: number;
  volume?: number;
  /** Panorama -1..1. */
  pan?: number;
  /** Narastanie (s); domyślnie bez (atak z próbki). */
  attack?: number;
  /**
   * Długość nuty (s): potem wygaszenie w `release` s. Bez niej próbka gra do końca.
   * Razem z `loop` pozwala trzymać dźwięk dłużej niż plik.
   */
  duration?: number;
  release?: number;
  /** Pętla (s, względem początku dźwięku w pliku); działa razem z `duration`. */
  loop?: { start: number; end: number };
}

export interface PlayOptions {
  volume?: number;
  /** Mnożnik wysokości/prędkości. Losowanie ±5% likwiduje efekt „karabinu maszynowego”. */
  rate?: number;
  loop?: boolean;
  /**
   * Kanał (np. 'voice' dla lektora): nowy dźwięk na tym samym kanale ucina poprzedni,
   * więc kwestie się nie nakładają.
   */
  channel?: string;
}

/**
 * Minimalny dźwięk na Web Audio. Działa w WebView iOS i Android.
 * Kontekst odblokowuje się przy pierwszym dotknięciu (wymóg przeglądarek).
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Korekcja wysokich tonów na wyjściu (np. jaskrawe głośniki części telefonów z Androidem). */
  private shelf: BiquadFilterNode | null = null;
  private trebleDb = 0;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, string>();
  /** Pobrane bajty (pobieranie nie wymaga kontekstu audio, dekodowanie tak). */
  private fetched = new Map<string, Promise<ArrayBuffer | null>>();
  private decoding = new Map<string, Promise<void>>();
  /** Początek dźwięku w buforze: pomija ciszę kodera (AAC/mp3 doklejają ją na początku). */
  private starts = new Map<string, number>();
  private music: AudioBufferSourceNode | null = null;
  private channels = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  muted = false;
  /** Wycisza tylko efekty (dźwięki bez własnego wyjścia); muzyka grana na własnej szynie gra dalej. */
  sfxMuted = false;

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
    // W tle (zminimalizowana aplikacja, zablokowany ekran) dźwięk śpi; po powrocie wraca.
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else if (this.ctx.state !== 'running') void this.ctx.resume();
    });
  }

  /**
   * Gra także przy wyciszonym telefonie (przełącznik trybu cichego na iPhonie). Domyślnie iOS traktuje
   * Web Audio jak dźwięk otoczenia i przy trybie cichym gra jest niema; tam, gdzie dźwięk jest treścią
   * (lektor w grze dla dzieci), trzeba tego uniknąć. WebKit od iOS 17 (`navigator.audioSession`),
   * gdzie indziej nic nie robi.
   */
  playThroughSilentMode(): void {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
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

  /**
   * Pobiera zarejestrowane pliki od razu, a dekoduje, gdy istnieje kontekst audio (po pierwszym dotknięciu),
   * więc nie tworzy kontekstu przed gestem. Błędy pojedynczych plików pomija (wtedy `loaded()` = false).
   * Kończy się, gdy wszystko jest zdekodowane albo odrzucone.
   */
  load(names: string[] = [...this.pending.keys()]): Promise<void> {
    for (const name of names) void this.bytes(name);
    if (this.ctx) return Promise.all(names.map((name) => this.decode(name))).then(() => undefined);
    return new Promise((resolve) => {
      this.onContext.push(() => void Promise.all(names.map((name) => this.decode(name))).then(() => resolve()));
    });
  }

  /** Czy plik jest zdekodowany i gotowy do natychmiastowego grania. */
  loaded(name: string): boolean {
    return this.buffers.has(name);
  }

  /**
   * Gra zdekodowany plik w czasie `at` (dokładnie co do próbki), z wysokością `rate`, panoramą i obwiednią.
   * Zwraca false, gdy bufor nie jest gotowy (wołający może wtedy zagrać zastępczo syntezą) albo dźwięk jest wyłączony.
   */
  sample(name: string, opts: SampleOptions = {}): boolean {
    if (this.muted || (this.sfxMuted && !opts.output)) return false;
    const ctx = this.ctx;
    const buffer = this.buffers.get(name);
    if (!ctx || !this.master || !buffer || ctx.state !== 'running') return false;
    const t0 = Math.max(ctx.currentTime, opts.at ?? 0);
    const rate = Math.max(0.05, opts.rate ?? 1);
    const offset = this.starts.get(name) ?? 0;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    // Pętla tylko z `duration` (inaczej grałaby bez końca).
    if (opts.loop && opts.duration !== undefined && opts.loop.end > opts.loop.start) {
      src.loop = true;
      src.loopStart = offset + opts.loop.start;
      src.loopEnd = Math.min(buffer.duration, offset + opts.loop.end);
    }
    const gain = ctx.createGain();
    const peak = Math.max(0.0002, opts.volume ?? 1);
    if (opts.attack) {
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + opts.attack);
    } else gain.gain.setValueAtTime(peak, t0);
    // Bez `duration` gra do końca pliku (w czasie rzeczywistym: długość / prędkość).
    const natural = (buffer.duration - offset) / rate;
    let end = t0 + natural;
    if (opts.duration !== undefined && (src.loop || opts.duration < natural)) {
      const release = Math.max(0.01, opts.release ?? 0.1);
      const hold = t0 + Math.max(opts.attack ?? 0, opts.duration);
      gain.gain.setValueAtTime(peak, hold);
      gain.gain.setTargetAtTime(0.0001, hold, release / 4);
      end = hold + release * 1.5;
    }
    let node: AudioNode = src.connect(gain);
    if (opts.pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
      node = gain.connect(panner);
    }
    node.connect(opts.output ?? this.master);
    src.start(t0, offset);
    if (src.loop || end < t0 + natural) src.stop(end + 0.02);
    return true;
  }

  /** Gra plik. Zwraca czas trwania w sekundach (0, gdy nie zagrał: brak bufora, wyciszenie). */
  play(name: string, opts: PlayOptions = {}): number {
    if (this.muted) return 0;
    const ctx = this.context();
    if (!ctx || !this.master) return 0;
    const buffer = this.buffers.get(name);
    if (!buffer) {
      void this.decode(name);
      return 0;
    }
    if (opts.channel) this.stopChannel(opts.channel);
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
    if (opts.channel) {
      const entry = { src, gain };
      this.channels.set(opts.channel, entry);
      src.onended = () => {
        if (this.channels.get(opts.channel!) === entry) this.channels.delete(opts.channel!);
      };
    }
    return buffer.duration / (opts.rate ?? 1);
  }

  /** Ucina to, co gra na kanale (krótkie wyciszenie, bez trzasku). */
  stopChannel(channel: string): void {
    const entry = this.channels.get(channel);
    if (!entry || !this.ctx) return;
    this.channels.delete(channel);
    const t = this.ctx.currentTime;
    entry.gain.gain.setTargetAtTime(0, t, 0.015);
    entry.src.stop(t + 0.08);
  }

  /**
   * Syntezowany efekt bez plików audio.
   * `pitch` mnoży wszystkie częstotliwości (np. rosnące tony przy serii), `volume` skaluje głośność.
   */
  synth(layers: SynthLayer[], opts: { pitch?: number; volume?: number; at?: number; output?: AudioNode } = {}): void {
    if (this.muted || (this.sfxMuted && !opts.output)) return;
    const ctx = this.context();
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const pitch = opts.pitch ?? 1;
    // `at`: czas kontekstu audio (np. następne uderzenie taktu muzyki); `output`: np. szyna muzyki.
    const now = Math.max(ctx.currentTime, opts.at ?? 0);
    const out = opts.output ?? this.master;
    for (const l of layers) {
      const t0 = now + (l.delay ?? 0);
      const t1 = t0 + l.duration;
      const gain = ctx.createGain();
      const peak = (l.volume ?? 0.3) * (opts.volume ?? 1);
      const attack = l.attack ?? 0.005;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
      if (l.sustain !== undefined) {
        const release = Math.min(l.release ?? 0.3, l.duration * 0.5);
        const hold = Math.max(peak * l.sustain, 0.0002);
        const tRelease = Math.max(t0 + attack + 0.01, t1 - release);
        gain.gain.exponentialRampToValueAtTime(hold, Math.min(tRelease, t0 + attack + 0.2));
        gain.gain.setValueAtTime(hold, tRelease);
      }
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
      node.connect(gain);
      if (l.pan && ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, l.pan));
        gain.connect(panner).connect(out);
      } else gain.connect(out);
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

  /** Kontekst audio (null przed pierwszym dotknięciem albo bez Web Audio). Dla odtwarzacza muzyki. */
  get audio(): AudioContext | null {
    return this.ctx;
  }

  /** Wyjście główne (głośność całości). */
  get output(): AudioNode | null {
    this.context();
    return this.master;
  }

  /** Bufor pliku (ładuje i dekoduje przy pierwszym użyciu). Null, gdy pliku nie ma albo nie da się go zdekodować. */
  async buffer(name: string): Promise<AudioBuffer | null> {
    await this.decode(name);
    return this.buffers.get(name) ?? null;
  }

  stopMusic(): void {
    this.music?.stop();
    this.music = null;
  }

  /** Podbicie/przycięcie wysokich tonów na wyjściu w dB (ujemne = ciemniej). */
  setTreble(db: number): void {
    this.trebleDb = db;
    if (this.shelf) this.shelf.gain.value = db;
  }

  setVolume(volume: number): void {
    if (this.master) this.master.gain.value = volume;
  }

  private onContext: (() => void)[] = [];

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof AudioContext === 'undefined') return null;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    // Wyjście: korekcja wysokich tonów i ogranicznik (muzyka i efekty sumują się tutaj; bez niego głośne
    // chwile mogą przesterować i trzeszczeć).
    this.shelf = this.ctx.createBiquadFilter();
    this.shelf.type = 'highshelf';
    this.shelf.frequency.value = 3800;
    this.shelf.gain.value = this.trebleDb;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    this.master.connect(this.shelf).connect(limiter).connect(this.ctx.destination);
    for (const fn of this.onContext.splice(0)) fn();
    return this.ctx;
  }

  private bytes(name: string): Promise<ArrayBuffer | null> {
    let p = this.fetched.get(name);
    if (!p) {
      const url = this.pending.get(name);
      p = url
        ? fetch(url)
            .then((r) => (r.ok ? r.arrayBuffer() : null))
            .catch(() => null)
        : Promise.resolve(null);
      this.fetched.set(name, p);
    }
    return p;
  }

  /** Pobiera i dekoduje plik (raz, nawet przy równoległych wywołaniach). Nie rzuca: przy błędzie bufora po prostu nie ma. */
  private decode(name: string): Promise<void> {
    if (this.buffers.has(name)) return Promise.resolve();
    let p = this.decoding.get(name);
    if (p) return p;
    const ctx = this.context();
    if (!ctx || !this.pending.has(name)) return Promise.resolve();
    p = this.bytes(name)
      .then((data) => (data ? decodeAudio(ctx, data) : null))
      .then((buffer) => {
        if (!buffer) return;
        this.buffers.set(name, buffer);
        this.starts.set(name, leadingSilence(buffer, 0.0005));
      })
      .catch(() => undefined)
      .finally(() => this.decoding.delete(name));
    this.decoding.set(name, p);
    return p;
  }
}

/** decodeAudioData w wersji z obietnicą i z wywołaniami zwrotnymi (starszy WebKit zna tylko te drugie). */
function decodeAudio(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
    p?.catch(reject);
  });
}

/** Długość ciszy na początku bufora (maks. 0,2 s), np. opóźnienie kodera mp3. */
export function leadingSilence(buffer: AudioBuffer, threshold = 0.0015): number {
  const data = buffer.getChannelData(0);
  const max = Math.min(data.length, Math.floor(buffer.sampleRate * 0.2));
  for (let i = 0; i < max; i++) if (Math.abs(data[i]!) > threshold) return i / buffer.sampleRate;
  return 0;
}

/** Pozycja w taktach: ile uderzeń minęło przy danym tempie (do kwantyzacji warstw muzyki). */
export function beatsFor(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

/**
 * Muzyka z pętlą, płynnym przejściem między utworami i efektami „na żywo”:
 * tempo/wysokość jak taśma (slow-motion), filtr przytłumiający (niebezpieczeństwo) i zegar taktu,
 * żeby dogrywane warstwy (np. combo) trafiały w rytm utworu.
 */
export class Music {
  private readonly sound: Sound;
  private bus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private current: { name: string; src: AudioBufferSourceNode; gain: GainNode; bpm: number } | null = null;
  private wanted: string | null = null;
  private rate = 1;
  /** Pozycja w uderzeniach (rośnie z czasem kontekstu i tempem odtwarzania). */
  private beat = 0;
  private last = 0;
  volume = 0.55;

  constructor(sound: Sound) {
    this.sound = sound;
  }

  get bpm(): number {
    return this.current?.bpm ?? 100;
  }

  /** Szyna muzyki (za filtrem), żeby warstwy syntezy brzmiały jak część utworu. */
  get output(): AudioNode | null {
    return this.ensure() ? this.filter : null;
  }

  /**
   * Gra utwór w pętli. `loopBars`: długość pętli w taktach 4/4 od `startAt` sekund
   * (pomija ciszę na początku pliku i daje pętlę bez szwu niezależnie od formatu).
   */
  async play(name: string, opts: { bpm: number; startAt?: number; loopBars?: number; fade?: number }): Promise<void> {
    if (this.wanted === name) return;
    this.wanted = name;
    const buffer = await this.sound.buffer(name);
    const ctx = this.sound.audio;
    if (this.wanted !== name) return;
    if (!buffer || !ctx || !this.ensure() || !this.filter) {
      this.wanted = null; // spróbujemy ponownie przy kolejnym wywołaniu (np. po odblokowaniu dźwięku)
      return;
    }
    const fade = opts.fade ?? 1.5;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    // mp3 dokleja na początku kilkadziesiąt ms ciszy (opóźnienie kodera): pomijamy ją, żeby pętla nie miała przerwy.
    const start = opts.startAt ?? leadingSilence(buffer);
    const barSec = (60 / opts.bpm) * 4;
    const bars = opts.loopBars ?? Math.max(1, Math.floor((buffer.duration - start) / barSec + 0.02));
    src.loopStart = start;
    src.loopEnd = Math.min(buffer.duration, start + bars * barSec);
    src.playbackRate.value = this.rate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fade);
    src.connect(gain).connect(this.filter);
    src.start(ctx.currentTime, start);
    this.fadeOut(fade);
    this.current = { name, src, gain, bpm: opts.bpm };
    this.beat = 0;
    this.last = ctx.currentTime;
  }

  stop(fade = 0.8): void {
    this.wanted = null;
    this.fadeOut(fade);
    this.current = null;
  }

  /** Taśma: tempo i wysokość razem (1 = normalnie). */
  setRate(rate: number, seconds = 0.25): void {
    this.advance();
    this.rate = rate;
    const ctx = this.sound.audio;
    if (ctx && this.current) this.current.src.playbackRate.setTargetAtTime(rate, ctx.currentTime, seconds / 3);
  }

  /** Przytłumienie 0..1 (filtr dolnoprzepustowy od ~18 kHz do ~500 Hz). */
  setMuffle(amount: number, seconds = 0.2): void {
    const ctx = this.sound.audio;
    if (!ctx || !this.ensure() || !this.filter) return;
    const a = Math.min(1, Math.max(0, amount));
    this.filter.frequency.setTargetAtTime(18000 * Math.pow(500 / 18000, a), ctx.currentTime, seconds / 3);
  }

  /** Czas kontekstu najbliższego podziału taktu (`division` = ułamek uderzenia, np. 0.5 = ósemki). */
  nextBeat(division = 1): { time: number; index: number } {
    const ctx = this.sound.audio;
    this.advance();
    const now = ctx?.currentTime ?? 0;
    const step = division;
    const index = Math.floor(this.beat / step) + 1;
    const beatsLeft = index * step - this.beat;
    return { time: now + (beatsLeft * 60) / (this.bpm * Math.max(0.05, this.rate)), index };
  }

  private advance(): void {
    const ctx = this.sound.audio;
    if (!ctx) return;
    this.beat += beatsFor(ctx.currentTime - this.last, this.bpm) * this.rate;
    this.last = ctx.currentTime;
  }

  private fadeOut(fade: number): void {
    const ctx = this.sound.audio;
    const old = this.current;
    if (!ctx || !old) return;
    old.gain.gain.cancelScheduledValues(ctx.currentTime);
    old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), ctx.currentTime);
    old.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
    old.src.stop(ctx.currentTime + fade + 0.05);
  }

  private ensure(): boolean {
    if (this.bus) return true;
    const ctx = this.sound.audio;
    const out = this.sound.output;
    if (!ctx || !out) return false;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 18000;
    this.bus = ctx.createGain();
    this.bus.gain.value = this.volume;
    this.filter.connect(this.bus).connect(out);
    return true;
  }
}
