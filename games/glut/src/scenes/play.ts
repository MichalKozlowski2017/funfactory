import { Assets, type BitmapText, Container, FillGradient, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { circle, defs, ellipse, hexToNumber, palettes, path, radialGradient, svg } from '@funfactory/art';
import { ads, gameServices, haptics, Rng, SaveStore, Spring, type SynthLayer } from '@funfactory/core';
import { ADS } from '../ads-config.ts';
import { GAME_SERVICES } from '../game-services-config.ts';
import { achDesc, itemName as trItemName, biomeName, biomeTip, candies, controlName, detectLang, formatDay, lang, powerName, setLang, t } from '../i18n.ts';
import { AdPolicy } from '../sim/ad-policy.ts';
import { Score } from '../fx/score.ts';
import {
  Button,
  dotTexture,
  FollowCamera,
  gestures,
  Particles,
  pixelsToTexture,
  popIn,
  pulse,
  Scene,
  Shaker,
  svgTexture,
  type View,
} from '@funfactory/kit2d';
import { fallbackIcon, POWER_INFO, POWER_KINDS, PowerBubble, PowerHud } from '../fx/power-fx.ts';
import { FEATURE_SFX, POWER_SFX, SFX, STREAK_SFX } from '../fx/sfx.ts';
import { FEATURE_COLORS, FeatureView } from '../fx/features.ts';
import { hudText, installHudFont } from '../fx/hud-font.ts';
import { milestoneBanner, rainbow, StreakHud, streakTier } from '../fx/streak-fx.ts';
import { bodyScale, bodySprite, SlimeFace, slimeTextures, type SlimeTextures } from '../fx/slime-art.ts';
import { drawBlock, SURFACE } from '../fx/surfaces.ts';
import { BIOME_LOOKS, mixColor, type BiomeLook } from '../fx/biome-look.ts';
import { biomeBlend, biomeIndex, BIOMES, metersAt } from '../sim/biomes.ts';
import { botCanShoot, chooseShot, type BotShot } from '../sim/bot.ts';
import { CONTROL_MODES, dragToTap, tapToDrag, type ControlMode } from '../sim/controls.ts';
import { launchVelocity, PHYS, type Block } from '../sim/physics.ts';
import { AIR, airPower, Run, STREAK, type RunStep } from '../sim/run.ts';
import { SHAFT, type Candy, type PowerKind, type PowerUp } from '../sim/shaft.ts';
import { ACCESSORIES, HATS, ITEMS, NEW_SAVE, normalizeSave, SKINS, tapItem, TRAILS, type Save } from '../sim/shop.ts';
import { dailySeed, dailyStreak, dayKey, recordDaily, type DailyRecord } from '../sim/daily.ts';
import { ReplayRecorder, type Replay } from '../sim/replay.ts';
import { ACHIEVEMENTS, formatTime, newlyEarned, progressOf, type AchievementDef, type Stats } from '../sim/achievements.ts';
import { AchievementToasts } from '../ui/achievement-toast.ts';
import { AchievementsPanel } from '../ui/achievements-panel.ts';
import { DailyPanel } from '../ui/daily-panel.ts';
import { Coach, type Gesture } from '../ui/coach.ts';
import { PausePanel } from '../ui/pause-panel.ts';
import { Iris } from '../fx/iris.ts';
import { accessorySprite, cosmeticTextures, type CosmeticTextures } from '../fx/cosmetics.ts';
import { ShopPanel } from '../ui/shop-panel.ts';
import { SettingsPanel } from '../ui/settings-panel.ts';
import { TitleOverlay } from '../ui/title.ts';

const pal = palettes.candy;

const COLORS = {
  syrup: 0xff8fb1,
  syrupTop: 0xffc2d4,
  slime: hexToNumber(pal.swatches[0]),
  dot: 0xffffff,
  danger: SURFACE.caramel,
};

const FONT = 'system-ui, -apple-system, sans-serif';
/** Wejście do nowego świata: miękki akord z dzwoneczkiem. */
const BIOME_SFX: SynthLayer[] = [
  ...[392, 494, 587].map((freq) => ({ wave: 'triangle' as const, freq, duration: 0.9, volume: 0.09, attack: 0.05 })),
  { wave: 'sine', freq: 1568, duration: 0.6, volume: 0.06, delay: 0.15 },
];
/** Autopilot (?bot): tempo „ludzkiego” bota do nagrań i pokazów. */
const PILOT = { reaction: 0.35, aimTime: 0.32, hold: 0.12, start: 1.2, restart: 1.6 };
const PILOT_MODE = new URLSearchParams(location.search).has('bot');

const ART = `${import.meta.env.BASE_URL}art/`;

/** Wczytuje grafikę z public/art; brak pliku = null (gra używa wersji z kodu). */
async function optionalTexture(name: string): Promise<Texture | null> {
  try {
    return (await Assets.load<Texture>(`${ART}${name}`)) ?? null;
  } catch {
    return null;
  }
}

/** Tekstura powtarzalna w pionie bez szwu: obraz + jego odbicie lustrzane pod spodem. */
async function mirrorTile(texture: Texture): Promise<Texture> {
  const src = texture.source.resource as CanvasImageSource;
  const w = texture.source.pixelWidth;
  const h = texture.source.pixelHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return texture;
  ctx.drawImage(src, 0, 0, w, h);
  ctx.translate(0, h * 2);
  ctx.scale(1, -1);
  ctx.drawImage(src, 0, 0, w, h);
  // Przez ImageBitmap, nie przez canvas: na prawdziwym iPhonie wgranie dużego canvasa do WebGL bywa puste.
  return pixelsToTexture(ctx.getImageData(0, 0, w, h * 2));
}

/**
 * Glut: rozgrywka. Generowana studnia, syrop, cukierki, ekran końca.
 */
export class PlayScene extends Scene {
  readonly id = 'play';
  private readonly backdrop = new Container();
  private readonly shake = new Container();
  private readonly world = new Container();
  private readonly chunkLayer = new Container();
  private readonly decalLayer = new Container();
  private readonly candyLayer = new Container();
  private readonly chunkViews = new Map<number, Container>();
  private readonly candyViews = new Map<string, { sprite: Sprite; candy: Candy }>();
  private readonly powerViews = new Map<string, PowerBubble>();
  /** Półki z mechaniką (czekolada, galaretka, chmury, taśmociągi): osobne, animowane widoki. */
  private readonly featureViews = new Map<Block, FeatureView>();
  private readonly powerTex = new Map<PowerKind, Texture>();
  private powerHud!: PowerHud;
  /** Efekty power-upów wokół slime'a (nie obracają się z ciałem). */
  private readonly aura = new Graphics();
  /** Warstwa ekranu na banery serii i lecące do licznika cukierki-premie. */
  private readonly fx = new Container();
  private streakHud!: StreakHud;
  /** Ile cukierków-premii jest jeszcze w locie do licznika (licznik dolicza je po dotarciu). */
  private flying = 0;
  /** Podpowiedź skoku w locie pokazana w tym biegu. */
  /** Celowanie w locie (drugi oddech): zwolniony czas. */
  private airAim = false;
  private readonly dotsG = new Graphics();
  /** Tryb sterowania (eksperyment, zapisywany). */
  private controls: ControlMode = 'drag';
  /** Tap: gdzie jest palec (jednostki ekranu), póki trzymany. */
  private tapPoint: { x: number; y: number } | null = null;
  /** Swipe: ślad palca jak cięcie we Fruit Ninja (punkty z wiekiem w sekundach rzeczywistych). */
  private readonly trail: { x: number; y: number; age: number }[] = [];
  private readonly trailG = new Graphics();
  private trailEmpty = true;
  /** Celowanie kończy się na kolcach (do jednorazowej wibracji ostrzegawczej). */
  private aimDanger = false;
  /** Ostrzeżenie o kolcach tuż nad kadrem. */
  private readonly dangerG = new Graphics();
  /** 0..1: jak bardzo kamera wyprzedza szybki lot w górę. */
  private lookAhead = 0;
  private readonly syrupG = new Graphics();
  private readonly slime = new Container();
  private readonly body = new Container();
  private face!: SlimeFace;
  private readonly input = new Container();
  private readonly hud = new Container();
  private readonly overlay = new Container();
  private readonly glow = new Graphics();
  private bg: TilingSprite | null = null;
  /** Tło następnego świata (przenikanie na ostatnich metrach). */
  private bgNext: TilingSprite | null = null;
  private biomeBg: Texture[] = [];
  private biomeCandy: Texture[] = [];
  /** Świat pokazany teraz przez tło (indeks) i do którego już doszliśmy w tym biegu (baner). */
  private shownBiome = -1;
  private reachedBiome = 0;
  private syrupColor = COLORS.syrup;
  private syrupTopColor = COLORS.syrupTop;
  private ambientAcc = 0;
  private flick = 1;
  /** Mrok przy krawędziach ekranu (mroczne światy). */
  private readonly shadeG = new Graphics();
  /** Muzyka proceduralna: warstwy wg akcji, nuty akcji w harmonii. */
  private score!: Score;
  /** Światła w rytm muzyki: pasy na ścianach, błysk ekranu. */
  private readonly lightL = new Graphics();
  private readonly lightR = new Graphics();
  private readonly flashG = new Graphics();
  private beatGlow = 0;
  private sideGlow = 0;
  private dropGlow = 0;
  private candyTex!: Texture;
  private decor: (Texture | null)[] = [];
  /** Tekstury ścian z Fluxa (brak pliku = ściany rysowane w kodzie). */
  private wallTex: { ice: Texture | null; frosting: Texture | null; caramel: Texture | null; spike: Texture | null } = { ice: null, frosting: null, caramel: null, spike: null };
  /** Ściany i kolce własne dla świata (brak pliku = wspólne z `wallTex`). */
  private readonly biomeWalls = new Map<string, { sticky: Texture | null; spikes: { tex: Texture; glow: Texture | null }[] }>();
  /** Biała, rozmyta sylwetka wspólnego kolca (poświata ostrzegawcza). */
  private spikeGlow: Texture | null = null;
  run!: Run;
  private camera!: FollowCamera;
  private shaker!: Shaker;
  private sparks!: Particles;
  private heightText!: BitmapText;
  private bestText!: BitmapText;
  private candyText!: BitmapText;
  private candyIcon!: Sprite;
  private hint!: Text;
  private syrupWarn!: BitmapText;
  /** Czas biegu (czas gry, jak w osiągnięciach na czas). */
  private timerText!: BitmapText;
  private timerShown = -1;
  /** Czasy dojścia do 100/200/300 m w tym biegu. */
  private runFast: Record<number, number> = {};
  private againButton: Button | null = null;
  private menuButton: Button | null = null;
  private aiming: { sx: number; sy: number; power: number; dx: number; dy: number } | null = null;
  private best = 0;
  private bestAtStart = 0;
  private bank = 0;
  private runs = 0;
  private time = 0;
  private heartbeat = 0;
  private combo = 0;
  private trailIn = 0;
  /** Bot gra osobnym zapisem, żeby nie ruszać rekordu i cukierków gracza. */
  private readonly store = new SaveStore<Save>(PILOT_MODE ? 'glut-bot' : 'glut', NEW_SAVE);
  private autopilot: { wait: number; shot: BotShot | null; t: number; hold: number; sx: number; sy: number } | null = null;
  private readonly finger = new Graphics();
  private owned: string[] = [];
  private hatId: string | null = null;
  private skinId: string | null = null;
  private trailId: string | null = null;
  private accId: string | null = null;
  /** Kolor ciała (zależy od koloru z szafy): ślady, kleksy, cząsteczki. */
  private slimeColor = hexToNumber(pal.swatches[0]);
  private cosmetics!: CosmeticTextures;
  /** Ciało dla każdego koloru (id koloru albo 'base'). */
  private readonly skinTex = new Map<string, SlimeTextures>();
  private bodyArt: Container | null = null;
  /** Dodatek (okulary, wąsy…) na twarzy slime'a. */
  private readonly accLayer = new Container();
  /** Ślad w locie z szafy (własny kształt cząsteczek). */
  private trailFx: Particles | null = null;
  /** Wyzwanie dnia: wyniki z ostatnich dni i czy obecny bieg jest wyzwaniem. */
  private daily: DailyRecord[] = [];
  private dailyMode = false;
  private dailyDay = '';
  /** Nagranie biegu (do weryfikacji wyniku przez przyszły ranking). */
  private recorder: ReplayRecorder | null = null;
  lastReplay: Replay | null = null;
  private dailyResult: { improved: boolean; record: DailyRecord } | null = null;
  /** Osiągnięcia: liczniki, zdobyte, powiadomienia, panel. */
  private stats!: Stats;
  private earned: string[] = [];
  private toasts!: AchievementToasts;
  private trophies: AchievementsPanel | null = null;
  private dailyPanel: DailyPanel | null = null;
  private achIn = 0;
  /** Licznik wydajności (ukryty: 5 stuknięć w wersję w ustawieniach). */
  private perfText: Text | null = null;
  private perfIn = 0;
  private versionTaps: number[] = [];
  /** Język wybrany w ustawieniach (null = jak w telefonie). */
  private langPref: 'pl' | 'en' | null = null;
  /** Samouczek: zaliczone wskazówki (zapisywane) i widok. */
  private tips: string[] = [];
  private coach!: Coach;
  private coachUntil = 0;
  /** Pauza w trakcie biegu. */
  private paused = false;
  private pausePanel: PausePanel | null = null;
  private pauseButton!: Button;
  /** Przejście „przesłona” między ekranem startowym a biegiem. */
  private readonly iris = new Iris();
  /** Stan sprzed ostatniego kroku fizyki: rysujemy pozycję pośrednią (płynny ruch przy nierównych klatkach). */
  private readonly prev = { x: 0, y: 0, syrup: 0 };
  private readonly shown = { x: 0, y: 0, syrup: 0 };
  private readonly hatTextures = new Map<string, Texture | null>();
  private readonly hat = new Container();
  private readonly hatSwing = new Spring(0, 260, 9);
  /** 'title' = ekran startowy (gra czeka), 'play' = rozgrywka. */
  private mode: 'title' | 'play' = 'title';
  private title: TitleOverlay | null = null;
  private shop: ShopPanel | null = null;
  private settings: SettingsPanel | null = null;
  private musicOn = true;
  /** Reklamy: zasady pokazywania pełnoekranowych i stan banera (tylko poza rozgrywką). */
  private readonly adPolicy = new AdPolicy();
  private bannerWanted = false;
  /** Ile jednostek gry od dołu zajmuje baner (z marginesem bezpiecznego obszaru); 0 bez banera. */
  private bannerReserve = 0;
  private sfxOn = true;
  /** Tryb pokazowy na ekranie startowym (bot gra, nic się nie zapisuje). */
  private demo = false;
  /** Bieżący bieg jest pokazowy (start w trybie pokazowym). */
  private demoRun = false;
  private vibrationOn = true;

  override async enter(): Promise<void> {
    const saved = normalizeSave(await this.store.load());
    this.best = saved.best;
    this.bank = saved.candies;
    this.owned = saved.owned;
    this.hatId = saved.hat;
    this.skinId = saved.skin;
    this.trailId = saved.trail;
    this.accId = saved.acc;
    this.daily = saved.daily;
    this.langPref = saved.lang;
    this.tips = saved.tips;
    // `?lang=en` / `?lang=pl` wymusza język (playtesty, zrzuty do sklepów).
    const forced = new URLSearchParams(location.search).get('lang');
    setLang(forced === 'pl' || forced === 'en' ? forced : (saved.lang ?? detectLang()));
    this.stats = saved.stats;
    this.earned = saved.achievements;
    this.controls = saved.controls;
    this.musicOn = saved.music;
    this.sfxOn = saved.sfx;
    this.vibrationOn = saved.vibration;
    const pr = this.game.pixelRatio;

    const [slimeTex, bgTex, candyArt, crystal, lolly, cosmetics, ...skins] = await Promise.all([
      slimeTextures(pal.swatches[0], pal.ink, pr),
      optionalTexture('bg.jpg'),
      optionalTexture('candy.png'),
      optionalTexture('decor/crystal.png'),
      optionalTexture('decor/lolly.png'),
      cosmeticTextures(pr),
      ...SKINS.map((k) => slimeTextures(k.color, pal.ink, pr)),
    ]);
    this.cosmetics = cosmetics;
    this.skinTex.set('base', slimeTex);
    SKINS.forEach((k, i) => this.skinTex.set(k.id, skins[i]!));
    this.decor = [crystal, lolly];
    this.score = new Score(this.game.sound);
    this.applySettings();
    // Najpierw zgody reklam (RODO, ATT), potem logowanie do Game Center / Play Games (bez nakładania się okien).
    void ads.init(ADS).then(() => {
      this.syncBanner(true);
      if (!PILOT_MODE) void gameServices.init(GAME_SERVICES);
    });
    const simulated = Number(new URLSearchParams(location.search).get('banner'));
    if (simulated > 0) ads.simulateBanner(simulated);
    const unsubscribe = ads.onBanner((h) => {
      const view = this.game.view;
      const k = view.width / this.game.app.screen.width;
      this.bannerReserve = h > 0 ? h * k + view.safe.bottom + 12 : 0;
      this.layoutPanels();
    });
    this.once('destroyed', unsubscribe);
    const powerArt = await Promise.all(POWER_KINDS.map((k) => optionalTexture(`power/${k}.png`)));
    for (const [i, kind] of POWER_KINDS.entries()) this.powerTex.set(kind, powerArt[i] ?? (await fallbackIcon(kind, pr)));
    const hatTex = await Promise.all(HATS.map((h) => optionalTexture(h.file)));
    HATS.forEach((h, i) => this.hatTextures.set(h.id, hatTex[i] ?? null));
    this.candyTex = candyArt ?? (await svgTexture(candySvg(), pr));
    // Światy: tło i cukierki (brak pliku = tło/cukierek pierwszego świata).
    const biomeArt = await Promise.all(
      BIOMES.slice(1).map((b) => Promise.all([optionalTexture(`biomes/${b.id}/bg.jpg`), optionalTexture(`biomes/${b.id}/candy.png`)])),
    );
    const [wIce, wFrost, wCaramel, wSpike] = await Promise.all([
      optionalTexture('walls/ice.jpg'),
      optionalTexture('walls/frosting.jpg'),
      optionalTexture('walls/caramel.jpg'),
      optionalTexture('walls/spike.png'),
    ]);
    // Pionowo bez szwu: obraz + jego odbicie (jak tło).
    this.wallTex = {
      ice: wIce ? await mirrorTile(wIce) : null,
      frosting: wFrost ? await mirrorTile(wFrost) : null,
      caramel: wCaramel ? await mirrorTile(wCaramel) : null,
      spike: wSpike,
    };
    this.spikeGlow = await optionalTexture('walls/spike-glow.png');
    await Promise.all(
      BIOMES.map(async (b) => {
        const [sticky, spike1, glow1, spike2, glow2] = await Promise.all([
          optionalTexture(`walls/${b.id}/sticky.jpg`),
          optionalTexture(`walls/${b.id}/spike.png`),
          optionalTexture(`walls/${b.id}/spike-glow.png`),
          optionalTexture(`walls/${b.id}/spike2.png`),
          optionalTexture(`walls/${b.id}/spike2-glow.png`),
        ]);
        const spikes = [
          spike1 ? { tex: spike1, glow: glow1 } : null,
          spike2 ? { tex: spike2, glow: glow2 } : null,
        ].filter((x): x is { tex: Texture; glow: Texture | null } => !!x);
        this.biomeWalls.set(b.id, { sticky: sticky ? await mirrorTile(sticky) : null, spikes });
      }),
    );
    const baseBg = bgTex ? await mirrorTile(bgTex) : null;
    if (baseBg) this.biomeBg.push(baseBg);
    this.biomeCandy.push(this.candyTex);
    for (const [bg, candy] of biomeArt) {
      if (baseBg) this.biomeBg.push(bg ? await mirrorTile(bg) : baseBg);
      this.biomeCandy.push(candy ?? this.candyTex);
    }

    this.addChild(this.backdrop, this.shake, this.hud, this.input, this.overlay);
    if (bgTex && baseBg) {
      const make = () => {
        const t = new TilingSprite({ texture: baseBg, width: SHAFT.width, height: 2000 });
        t.tileScale.set(SHAFT.width / bgTex.width);
        t.tint = BIOME_LOOKS.crystal.bgTint;
        return t;
      };
      this.bg = make();
      this.bgNext = make();
      this.bgNext.alpha = 0;
      this.backdrop.addChild(this.bg, this.bgNext);
    }
    {
      for (const g of [this.lightL, this.lightR, this.flashG]) {
        g.blendMode = 'add';
        g.alpha = 0;
      }
      this.backdrop.addChild(this.lightL, this.lightR, this.flashG);
    }
    this.shake.addChild(this.world);
    this.world.addChild(this.chunkLayer, this.decalLayer, this.candyLayer, this.dotsG, this.slime, this.syrupG);

    const scale = bodyScale(PHYS.radius);
    this.body.addChild(this.hat);
    this.face = new SlimeFace(slimeTex, scale);
    this.face.addChild(this.accLayer);
    this.slime.addChild(this.aura, this.body, this.face);
    if (new URLSearchParams(location.search).has('diag')) this.setupDiag(slimeTex.body);

    this.sparks = new Particles(dotTexture(this.game.app.renderer, 10), this.game.rng);
    this.world.addChild(this.sparks.view);
    this.wear();
    this.shaker = new Shaker(this.shake, this.game.rng);
    this.camera = new FollowCamera(this.world, { lambda: 5 });

    installHudFont(this.game.pixelRatio);
    this.heightText = hudText(56, pal.surface);
    this.heightText.anchor.set(0.5, 0);
    this.bestText = hudText(26, pal.accent);
    this.bestText.anchor.set(0.5, 0);
    this.candyText = hudText(36, pal.surface);
    this.candyText.anchor.set(1, 0.5);
    this.candyIcon = new Sprite({ texture: this.candyTex, anchor: 0.5 });
    this.candyIcon.scale.set(54 / Math.max(this.candyTex.width, this.candyTex.height));
    this.hint = this.makeText(34, pal.surface);
    this.hint.anchor.set(0.5);
    this.hint.text = this.hintText('start');
    this.syrupWarn = hudText(28, '#ffc2d4');
    this.timerText = hudText(30, '#d9ccff');
    this.timerText.anchor.set(1, 0.5);
    this.syrupWarn.anchor.set(0.5, 1);
    this.powerHud = new PowerHud(this.powerTex);
    this.streakHud = new StreakHud(this.tweens, this.game.pixelRatio);
    this.coach = new Coach(this.tweens);
    this.toasts = new AchievementToasts({
      tweens: this.tweens,
      timers: this.timers,
      candyTex: this.candyTex,
      onShow: () => {
        this.sfx(SFX.record);
        this.buzz('success');
      },
    });
    this.hud.addChild(this.shadeG, this.trailG, this.dangerG, this.glow, this.powerHud, this.heightText, this.bestText, this.streakHud, this.candyIcon, this.candyText, this.timerText, this.hint, this.syrupWarn, this.coach, this.fx);
    // Pauza nad warstwą dotyku (inaczej stuknięcie w nią zaczynałoby celowanie).
    this.pauseButton = new Button({ label: '', color: '#6e6488', width: 88, height: 88, radius: 44, resolution: this.game.pixelRatio, onTap: () => this.openPause() });
    this.pauseButton.addChild(new Graphics().roundRect(-15, -18, 10, 36, 4).fill({ color: 0xffffff }).roundRect(5, -18, 10, 36, 4).fill({ color: 0xffffff }));
    this.pauseButton.visible = false;
    this.addChildAt(this.pauseButton, this.getChildIndex(this.overlay));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.openPause();
    });
    this.addChild(this.iris);
    // Powiadomienia nad wszystkim (także nad panelami poza grą).
    this.addChild(this.toasts);

    const input = gestures(this.input, { dragThreshold: 10 });
    // Proca i swipe: przeciągnięcie w dowolnym miejscu ekranu.
    input.on('dragStart', ({ x, y }) => {
      if (this.controls === 'tap' || this.autopilot) return;
      this.beginAim(x, y);
      if (this.controls === 'swipe') this.trail.push({ x, y, age: 0 });
    });
    input.on('drag', ({ x, y }) => {
      if (this.controls === 'tap' || this.autopilot) return;
      if (this.controls === 'swipe') this.trail.push({ x, y, age: 0 });
      this.aim(x, y);
    });
    input.on('dragEnd', ({ x, y }) => this.controls !== 'tap' && !this.autopilot && this.release(x, y));
    // Tap: stuknięcie wskazuje cel, odległość od slime'a to siła. Trzymanie pokazuje tor (w locie slow-motion).
    this.input.on('pointerdown', (e) => {
      if (this.controls !== 'tap' || this.autopilot) return;
      const p = this.input.toLocal(e.global);
      if (!this.beginAim(0, 0)) return;
      this.tapPoint = { x: p.x, y: p.y };
      this.ripple(p.x, p.y);
      this.aimTap();
    });
    this.input.on('pointermove', (e) => {
      if (!this.tapPoint) return;
      const p = this.input.toLocal(e.global);
      this.tapPoint = { x: p.x, y: p.y };
    });
    const tapUp = () => {
      if (!this.tapPoint) return;
      const d = this.tapDrag();
      this.tapPoint = null;
      this.release(d?.x ?? 0, d?.y ?? 0);
    };
    this.input.on('pointerup', tapUp);
    this.input.on('pointerupoutside', tapUp);
    if (PILOT_MODE) {
      this.autopilot = { wait: PILOT.start, shot: null, t: 0, hold: 0, sx: 0, sy: 0 };
      this.finger.circle(0, 0, 30).fill({ color: 0xffffff, alpha: 0.35 }).circle(0, 0, 30).stroke({ color: 0xffffff, width: 4, alpha: 0.8 });
      this.finger.visible = false;
      this.hud.addChild(this.finger);
    }

    this.newRun();
    this.showTitle();
    try {
      if (localStorage.getItem('glut-perf') === '1' || new URLSearchParams(location.search).has('perf')) this.setPerfHud(true);
    } catch {
      // bez pamięci przeglądarki
    }
    // Uchwyt dla playtestów (tylko w trybie deweloperskim).
    if (import.meta.env.DEV) (window as unknown as { __glut: PlayScene }).__glut = this;
    this.timers.after(0.1, () => this.game.markReady());
  }

  override resize(view: View): void {
    if (this.toasts) {
      this.toasts.top = view.safe.top + 16;
      this.toasts.width0 = view.width;
    }
    this.input.hitArea = new Rectangle(0, 0, view.width, view.height);
    this.heightText.position.set(view.width / 2, view.safe.top + 24);
    this.bestText.position.set(view.width / 2, view.safe.top + 92);
    this.streakHud.position.set(view.width / 2, view.safe.top + 150);
    this.candyIcon.position.set(view.width - 52, view.safe.top + 58);
    this.candyText.position.set(view.width - 90, view.safe.top + 58);
    this.timerText.position.set(view.width - 34, view.safe.top + 112);
    this.powerHud.position.set(52, view.safe.top + 160);
    this.pauseButton?.position.set(56, view.safe.top + 58);
    this.pausePanel?.layout(view);
    this.hint.position.set(view.width / 2, view.height * 0.3);
    this.syrupWarn.position.set(view.width / 2, view.height - view.safe.bottom - 24);
    if (this.bg) this.bg.height = view.height;
    if (this.bgNext) this.bgNext.height = view.height;
    this.drawShade(view);
    this.drawLights(view);
    const glowH = view.height * 0.35;
    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: 'rgba(255,255,255,0)' },
        { offset: 0.7, color: 'rgba(255,255,255,0.35)' },
        { offset: 1, color: 'rgba(255,240,245,0.85)' },
      ],
    });
    this.glow.clear().rect(0, view.height - glowH, view.width, glowH).fill(gradient);
    this.camera.opts.maxY = this.floorView();
    if (!this.run.started) this.camera.snap(0, this.floorView());
    this.layoutOverlay();
    this.layoutPanels();
  }

  /** Panele poza grą: układ z miejscem na baner reklamy u dołu. */
  private layoutPanels(): void {
    const view = this.game.view;
    this.title?.layout(view, this.bannerReserve);
    this.shop?.layout(view, this.bannerReserve);
    this.settings?.layout(view, this.bannerReserve);
    this.trophies?.layout(view, this.bannerReserve);
    this.dailyPanel?.layout(view, this.bannerReserve);
  }

  override fixedUpdate(dt: number): void {
    if (this.paused) return;
    const s = this.run.slime;
    this.prev.x = s.x;
    this.prev.y = s.y;
    this.prev.syrup = this.run.syrupY;
    this.recorder?.step(dt);
    this.react(this.run.step(dt));
  }

  /** Pozycje do rysowania: między poprzednim a obecnym krokiem fizyki (bez skoków przy teleporcie i nowym biegu). */
  private interpolate(): void {
    const s = this.run.slime;
    const a = this.game.loop.alpha;
    const far = Math.abs(s.x - this.prev.x) + Math.abs(s.y - this.prev.y) > 300;
    this.shown.x = far ? s.x : this.prev.x + (s.x - this.prev.x) * a;
    this.shown.y = far ? s.y : this.prev.y + (s.y - this.prev.y) * a;
    const dy = this.run.syrupY - this.prev.syrup;
    this.shown.syrup = Math.abs(dy) > 300 ? this.run.syrupY : this.prev.syrup + dy * a;
  }

  override update(dt: number): void {
    this.time += dt;
    this.interpolate();
    this.pilot(dt);
    if (this.tapPoint && this.aiming) this.aimTap(); // slime w locie się rusza, cel względem niego też
    this.drawTrail(dt / (this.game.loop.timeScale || 1));
    const s = this.run.slime;
    const view = this.game.view;
    if (s.state !== 'dead') {
      // Normalnie slime na 60% wysokości ekranu. Gdy syrop jest w zasięgu, kamera kadruje tak,
      // żeby jego powierzchnia była widoczna u dołu, ale slime zostaje co najmniej 30% od góry.
      // W szybkim locie w górę kamera wyprzedza: slime niżej na ekranie, więcej widać nad nim
      // (wtedy syrop może na chwilę wyjechać z kadru; ostrzeżenie „▼ syrop” zostaje).
      const rising = s.state === 'flying' ? Math.min(1, Math.max(0, -s.vy / 1500)) : 0;
      this.lookAhead += (rising - this.lookAhead) * (1 - Math.exp(-(rising > this.lookAhead ? 10 : 2.5) * dt));
      const la = this.lookAhead;
      const sy = this.shown.y;
      // W pokazie slime niżej na ekranie: pod przyciskami ekranu startowego, nie za nimi.
      const base = this.demoRun && this.mode === 'title' ? 0.84 : 0.6;
      const slimeTarget = sy - view.height * (base + 0.15 * la);
      // Syrop w kadrze u dołu, o ile slime zostaje co najmniej 30% od góry ekranu.
      const syrupTarget = this.run.started ? Math.min(this.shown.syrup - view.height + 170, sy - view.height * (0.3 + 0.4 * la)) : -Infinity;
      let target = Math.max(slimeTarget, syrupTarget);
      let lambda = 5 + 5 * la;
      if (target > this.camera.y) {
        // W dół kamera rusza tylko wtedy, gdy slime spadnie w dolną część ekranu (poniżej 75%);
        // wtedy trzyma go na tej wysokości. Syrop poza kadrem pokazuje napis „▼ syrop”.
        // (Ciągłe zjeżdżanie, żeby pokazać syrop, przeszkadzało w sterowaniu.)
        const keepSlime = sy - view.height * (base === 0.6 ? 0.75 : 0.88);
        target = Math.max(this.camera.y, Math.min(target, keepSlime));
        if (s.state === 'flying' && s.vy > 600) lambda = 14;
      }
      this.camera.opts.lambda = lambda;
      this.camera.follow(0, target, dt);
      // Twarda granica: przy szybkim spadaniu wygładzanie nie nadąża, a slime nie może zniknąć z dołu ekranu.
      const hard = sy - view.height * (base === 0.6 ? 0.85 : 0.92);
      if (this.camera.y < hard) this.camera.snap(0, hard);
    }
    if (this.bg) this.bg.tilePosition.y = -this.camera.y * 0.35;
    if (this.bgNext) this.bgNext.tilePosition.y = -this.camera.y * 0.35;
    this.updateBiome(dt);
    this.updateMusic();
    this.updatePerf(dt / (this.game.loop.timeScale || 1));
    this.achIn -= dt;
    if (this.achIn <= 0) {
      this.achIn = 0.3;
      this.checkAchievements();
    }
    if (this.bodyArt && SKINS.find((k) => k.id === this.skinId)?.rainbow) this.bodyArt.tint = rainbow(this.time);
    this.updateLights(dt);
    this.syncBanner();
    this.shaker.update(dt);
    this.sparks.update(dt);
    this.trailFx?.update(dt);
    this.againButton?.tick(dt);
    this.menuButton?.tick(dt);
    this.title?.tick(dt);
    this.shop?.tick(dt);
    this.settings?.tick(dt);
    this.trophies?.tick(dt);
    this.pausePanel?.tick(dt);
    this.iris.tick();
    this.pauseButton.tick(dt);
    this.pauseButton.visible = this.mode === 'play' && !this.run.over && !this.againButton && !this.autopilot;
    this.dailyPanel?.tick(dt);
    this.hat.rotation = this.hatSwing.update(dt);
    this.placeSlime(dt);
    this.animateCandies();
    for (const b of this.powerViews.values()) b.tick(this.time);
    for (const f of this.featureViews.values()) f.tick(dt, this.time);
    this.powerHud.update(this.run);
    this.drawAura(dt);
    this.drawSyrup();
    this.pressure(dt);

    const meters = this.run.meters;
    if (!this.demoRun && meters > this.best) {
      this.best = meters;
      void this.persist();
    }
    this.heightText.text = `${meters} m`;
    const sec = Math.floor(this.run.time);
    if (sec !== this.timerShown) {
      this.timerShown = sec;
      this.timerText.text = formatTime(sec);
    }
    this.trackTimes();
    this.bestText.text = t('best', { m: this.best });
    this.candyText.text = `${Math.max(0, this.run.candies - this.flying)}`;
    this.streakHud.tick(dt);
    if (this.mode !== 'play') this.streakHud.visible = false;
    this.powerHud.visible = this.mode === 'play';

    // Podpowiedź skoku w locie w pierwszych biegach: przy pierwszym opadaniu.
    this.updateCoach(dt / (this.game.loop.timeScale || 1));
    this.drawDanger();
    const below = this.run.syrupY - (this.camera.y + view.height);
    this.syrupWarn.visible = this.mode === 'play' && this.run.started && !this.run.over && below > 0;
    if (this.syrupWarn.visible) {
      this.syrupWarn.text = t('syrup', { m: Math.ceil(below / 100) });
      this.syrupWarn.alpha = below < 600 ? 0.6 + 0.4 * Math.sin(this.time * 12) : 0.7;
    }
  }

  /** Playtesty: przenosi slime'a na wysokość `meters` (syrop daleko pod nim). Tylko przez `__glut` w trybie dev. */
  teleport(meters: number): void {
    if (this.mode !== 'play') this.startPlaying();
    const run = this.run;
    const s = run.slime;
    Object.assign(s, { x: SHAFT.width / 2, y: -60 - meters * 100, vx: 0, vy: 0, stuckTo: null });
    const changes = run.shaft.update(s.y, s.y + 400);
    run.world.blocks = run.shaft.blocks;
    this.react({ added: changes.added, removed: changes.removed });
    // Nad najbliższą zwykłą półką pod celem.
    const ledge = run.shaft.blocks
      .filter((b) => b.h === 36 && !b.feature && b.y > s.y)
      .sort((a, b) => a.y - b.y)[0];
    if (ledge) Object.assign(s, { x: ledge.x + ledge.w / 2, y: ledge.y - PHYS.radius - 2 });
    run.world.settle();
    run.peakY = s.y;
    run.started = true;
    run.syrupY = s.y + 1500;
    this.hint.visible = false;
  }

  private persist(): Promise<void> {
    return this.store.save(this.snapshot());
  }

  private snapshot(): Save {
    return {
      best: this.best,
      candies: this.wallet(),
      owned: this.owned,
      hat: this.hatId,
      skin: this.skinId,
      trail: this.trailId,
      acc: this.accId,
      controls: this.controls,
      music: this.musicOn,
      sfx: this.sfxOn,
      vibration: this.vibrationOn,
      daily: this.daily,
      lang: this.langPref,
      tips: this.tips,
      stats: this.stats,
      achievements: this.earned,
    };
  }

  // --- ekran startowy i sklep ---

  private showTitle(): void {
    this.mode = 'title';
    this.hint.visible = false;
    for (const t of [this.heightText, this.bestText, this.candyIcon, this.candyText, this.timerText]) t.visible = false;
    this.title = new TitleOverlay({
      candyTex: this.candyTex,
      pixelRatio: this.game.pixelRatio,
      onStart: () => {
        if (this.iris.busy || this.shop || this.settings || this.trophies || this.dailyPanel) return;
        const from = this.title?.playPosition ?? this.center();
        this.title?.leave(this.tweens);
        this.transition(from, () => this.startPlaying());
      },
      onShop: () => this.openShop(),
      onDaily: () => this.openDaily(),
      onAchievements: () => this.openTrophies(),
      onRanking: () => this.openRanking(),
      onSettings: () => this.openSettings(),
    });
    this.title.setStats(this.best, this.wallet());
    this.title.setDaily(this.dailyInfo());
    this.startDemo();
    this.overlay.addChild(this.title);
    this.title.layout(this.game.view, this.bannerReserve);
  }

  private startPlaying(): void {
    if (this.mode === 'play' || this.shop || this.settings || this.trophies || this.dailyPanel) return;
    if (this.demoRun) {
      // Koniec pokazu: gracz dostaje świeży bieg (ekran startowy odkładamy, żeby wygasł).
      this.stopDemo();
      const title = this.title;
      if (title) this.overlay.removeChild(title);
      this.newRun();
      if (title) this.overlay.addChild(title);
    }
    this.sfx(SFX.tap);
    const title = this.title;
    this.title = null;
    if (title) {
      this.tweens.to(title, { alpha: 0 }, { duration: 0.2 });
      this.timers.after(0.21, () => title.destroy({ children: true }));
    }
    this.mode = 'play';
    for (const t of [this.heightText, this.bestText, this.candyIcon, this.candyText, this.timerText]) t.visible = true;
    this.hint.visible = false;
    this.squash(0.25);
  }

  /** Cukierki gracza: konto + bieżący bieg (bieg pokazowy bota się nie liczy). */
  private wallet(): number {
    return this.bank + (this.run && !this.demoRun ? this.run.candies : 0);
  }

  // --- dźwięk i haptyka (tryb pokazowy milczy) ---

  /** Efekt dźwiękowy rozgrywki; w trybie pokazowym tylko dźwięki interfejsu (stuknięcie). */
  private sfx(layers: SynthLayer[], opts?: Parameters<PlayScene['game']['sound']['synth']>[1]): void {
    if (this.demo && layers !== SFX.tap) return;
    this.game.sound.synth(layers, opts);
  }

  private buzz(kind: 'tap' | 'hit' | 'heavy' | 'success' | 'error'): void {
    if (this.demo) return;
    haptics[kind]();
  }

  // --- tryb pokazowy: bot gra na ekranie startowym ---

  /** Bot gra w tle ekranu startowego (bez zapisu, dźwięków efektów i wibracji; muzyka reaguje). */
  private startDemo(): void {
    if (PILOT_MODE || this.demo) return;
    this.demo = true;
    // Bieg na ekranie startowym jest świeży (po newRun): od teraz jest pokazowy.
    this.demoRun = true;
    this.autopilot = { wait: 1.0, shot: null, t: 0, hold: 0, sx: 0, sy: 0 };
  }

  private stopDemo(): void {
    if (!this.demo) return;
    this.demo = false;
    this.autopilot = null;
    this.aiming = null;
    this.trail.length = 0;
    this.dotsG.clear();
    this.endAirAim();
    this.finger.visible = false;
  }

  /** Nowy bieg pokazowy po śmierci bota (ekran startowy i otwarte panele zostają). */
  private restartDemo(): void {
    if (!this.demo) return;
    this.newRun(true);
    if (this.autopilot) this.autopilot = { wait: 0.8, shot: null, t: 0, hold: 0, sx: 0, sy: 0 };
  }

  // --- przejścia ---

  private center(): { x: number; y: number } {
    return { x: this.game.view.width / 2, y: this.game.view.height / 2 };
  }

  /** Przesłona: zamyka się do `from`, podmienia scenę (`swap`), otwiera się wokół slime'a. */
  private transition(from: { x: number; y: number }, swap: () => void): void {
    if (this.iris.busy) return;
    // Dźwięk interfejsu: gra także, gdy w tle trwa pokaz (tam efekty milczą).
    this.game.sound.synth(SFX.whoosh);
    const view = this.game.view;
    this.iris.run({
      tweens: this.tweens,
      width: view.width,
      height: view.height,
      from,
      swap,
      to: () => ({ x: this.run.slime.x, y: this.run.slime.y - this.camera.y - PHYS.radius * 0.6 }),
      onOpen: () => this.popSlime(),
    });
  }

  /** Slime „wyskakuje” po otwarciu przesłony. */
  private popSlime(): void {
    const s = this.run.slime;
    this.game.sound.synth(SFX.pop);
    if (!this.demo) haptics.success();
    this.squash(0.45);
    this.hatSwing.kick(6);
    this.sparks.burst(s.x, s.y - 20, {
      count: 24,
      speed: [200, 520],
      angle: -Math.PI / 2,
      spread: Math.PI * 1.4,
      life: [0.35, 0.7],
      scale: [0.5, 1.1],
      gravity: 1200,
      colors: [this.slimeColor, 0xffffff, 0xffd166],
    });
  }

  // --- pauza ---

  private openPause(): void {
    if (this.paused || this.mode !== 'play' || this.run.over || this.againButton || this.autopilot) return;
    this.paused = true;
    this.endAirAim();
    this.aiming = null;
    this.tapPoint = null;
    this.trail.length = 0;
    this.dotsG.clear();
    this.sfx(SFX.tap);
    this.pausePanel = new PausePanel({ pixelRatio: this.game.pixelRatio, onResume: () => this.closePause(), onMenu: () => this.transition(this.center(), () => this.quitToMenu()) });
    this.pausePanel.layout(this.game.view);
    this.overlay.addChild(this.pausePanel);
    this.pausePanel.alpha = 0;
    this.tweens.to(this.pausePanel, { alpha: 1 }, { duration: 0.15 });
  }

  private closePause(): void {
    const panel = this.pausePanel;
    this.pausePanel = null;
    this.paused = false;
    if (!panel) return;
    this.sfx(SFX.tap);
    this.tweens.killOf(panel);
    panel.destroy({ children: true });
  }

  /** Wyjście do menu w trakcie biegu: bieg się kończy i zapisuje jak po śmierci (bez ekranu końca). */
  private quitToMenu(): void {
    this.closePause();
    if (this.run.started && !this.run.over) {
      this.run.over = true;
      this.recordRunEnd();
    }
    this.dailyMode = false;
    this.newRun();
    this.showTitle();
  }

  // --- samouczek ---

  private passTip(id: string, hide = true): void {
    if (hide) this.coach.hide(id);
    if (PILOT_MODE || this.tips.includes(id)) return;
    this.tips = [...this.tips, id];
    void this.persist();
  }

  /** Wskazówka tekstowa na kilka sekund (pokazana raz na zawsze). */
  private timedTip(id: string, text: string): void {
    if (PILOT_MODE || this.tips.includes(id) || this.coach.current) return;
    const view = this.game.view;
    this.coach.show(id, text, { x: view.width / 2, y: view.height * 0.3 });
    this.coachUntil = this.time + 3.5;
    this.passTip(id, false);
  }

  /** Gest celowania dla trybu sterowania, względem slime'a na ekranie. */
  private aimGesture(): Gesture {
    const view = this.game.view;
    const sx = Math.max(140, Math.min(view.width - 140, this.shown.x));
    const sy = this.shown.y - this.camera.y;
    const clampY = (y: number) => Math.max(view.safe.top + 220, Math.min(view.height - 120, y));
    if (this.controls === 'tap') return { kind: 'tap', from: { x: sx, y: sy }, to: { x: Math.min(view.width - 100, sx + 120), y: clampY(sy - 330) } };
    if (this.controls === 'drag') return { kind: 'drag', from: { x: sx, y: clampY(sy - 10) }, to: { x: sx - 70, y: clampY(sy + 220) } };
    return { kind: 'drag', from: { x: sx - 60, y: clampY(sy + 80) }, to: { x: sx + 80, y: clampY(sy - 180) } };
  }

  /** Samouczek: celowanie, skok w locie (z palcem), syrop i bańki (tekst), aż gracz je zaliczy. */
  private updateCoach(real: number): void {
    const c = this.coach;
    c.tick(real);
    const view = this.game.view;
    const run = this.run;
    const s = run.slime;
    if (this.mode !== 'play' || run.over || this.autopilot || PILOT_MODE) {
      c.hide();
      return;
    }
    if (c.current && this.time > this.coachUntil && !['aim', 'air'].includes(c.current)) c.hide();
    const at = { x: view.width / 2, y: view.height * 0.3 };
    if (!this.tips.includes('aim')) {
      if (s.state === 'stuck' && !this.aiming) {
        c.show('aim', this.hintText('start'), at, this.aimGesture());
        c.moveGesture(this.aimGesture());
      } else c.hide('aim');
      return;
    }
    if (!this.tips.includes('air')) {
      if (s.state === 'flying' && run.canAim && s.vy > 200 && !this.aiming) {
        c.show('air', this.hintText('air'), at, this.aimGesture());
        c.moveGesture(this.aimGesture());
      } else if (s.state !== 'flying' || this.aiming) c.hide('air');
    }
    if (c.current) return;
    // Syrop pierwszy raz w kadrze.
    if (!this.tips.includes('syrup') && run.time > 4 && this.shown.syrup - this.camera.y < view.height - 40) this.timedTip('syrup', t('tipSyrup'));
    // Pierwsza bańka z mocą na ekranie.
    if (!this.tips.includes('power')) {
      for (const b of this.powerViews.values()) {
        const y = b.y - this.camera.y;
        if (y > view.safe.top + 150 && y < view.height - 150) {
          this.timedTip('power', t('tipPower'));
          break;
        }
      }
    }
  }

  // --- ranking ---

  /** Systemowy ekran tablic wyników; bez zalogowanego gracza krótka podpowiedź. */
  private openRanking(): void {
    if (this.shop || this.settings || this.trophies || this.dailyPanel) return;
    this.sfx(SFX.tap);
    void gameServices.show().then((shown) => {
      if (shown) return;
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      this.notice(ios ? t('loginIos') : t('loginAndroid'));
    });
  }

  /** Krótki napis na środku ekranu (podpowiedź). */
  private notice(message: string): void {
    const view = this.game.view;
    const t = hudText(30, '#ffffff');
    t.text = message;
    t.anchor.set(0.5);
    if (t.width > view.width - 60) t.scale.set((view.width - 60) / t.width);
    t.position.set(view.width / 2, view.height - this.bannerReserve - 80);
    this.toasts.addChild(t);
    void popIn(this.tweens, t, 0.25);
    this.timers.after(2.6, () => this.tweens.to(t, { alpha: 0 }, { duration: 0.4 }));
    this.timers.after(3.1, () => {
      this.tweens.killOf(t);
      this.tweens.killOf(t.scale);
      t.destroy();
    });
  }

  // --- osiągnięcia ---

  /** Liczniki na czas: dojście do 100/200/300 m, cukierki w pierwszej minucie, najdłuższy bieg. */
  private trackTimes(): void {
    const run = this.run;
    if (!run.started || run.over || !this.stats || this.demoRun) return;
    const st = this.stats;
    for (const m of [100, 200, 300] as const) {
      if (this.runFast[m] || run.meters < m) continue;
      this.runFast[m] = run.time;
      const key = `fast${m}` as const;
      st[key] = st[key] > 0 ? Math.min(st[key], run.time) : run.time;
    }
    if (run.time <= 60) st.candies60 = Math.max(st.candies60, run.candies);
    st.longest = Math.max(st.longest, run.time);
  }

  private openTrophies(): void {
    if (this.trophies || this.shop || this.settings || this.dailyPanel) return;
    this.sfx(SFX.tap);
    this.trophies = new AchievementsPanel({
      pixelRatio: this.game.pixelRatio,
      progress: this.progress(),
      earned: this.earned,
      onClose: () => this.closeTrophies(),
    });
    this.trophies.layout(this.game.view, this.bannerReserve);
    this.overlay.addChild(this.trophies);
    this.trophies.alpha = 0;
    this.tweens.to(this.trophies, { alpha: 1 }, { duration: 0.18 });
  }

  private closeTrophies(): void {
    const panel = this.trophies;
    this.trophies = null;
    if (!panel) return;
    this.sfx(SFX.tap);
    this.tweens.to(panel, { alpha: 0 }, { duration: 0.15 });
    this.timers.after(0.16, () => panel.destroy({ children: true }));
  }

  private progress() {
    const worn = [this.hatId, this.skinId, this.trailId, this.accId].filter(Boolean).length;
    // Cukierki bieżącego biegu liczą się na żywo; po śmierci są już w statystykach.
    const live = this.run && !this.run.over && !this.demoRun ? this.run.candies : 0;
    return progressOf({ ...this.stats, candies: this.stats.candies + live }, { best: this.best, dailyStreak: dailyStreak(this.daily, dayKey(new Date())), worn });
  }

  /** Sprawdza osiągnięcia; nowe: nagroda do konta, rzecz do szafy, powiadomienie. */
  private checkAchievements(): void {
    // Bot (?bot) nie zdobywa osiągnięć (nagrania, zrzuty do sklepów).
    if (!this.stats || PILOT_MODE) return;
    const fresh = newlyEarned(this.progress(), this.earned);
    if (!fresh.length) return;
    for (const d of fresh) this.earn(d);
    void this.persist();
    this.title?.setStats(this.best, this.wallet());
  }

  private earn(d: AchievementDef): void {
    this.earned = [...this.earned, d.id];
    this.bank += d.reward;
    let itemName: string | null = null;
    if (d.item && !this.owned.includes(d.item)) {
      this.owned = [...this.owned, d.item];
      itemName = trItemName(d.item);
    }
    this.toasts.push(d, itemName);
  }

  /** Podpis wyzwania dnia na ekranie startowym. */
  private dailyInfo(): string {
    const today = dayKey(new Date());
    const rec = this.daily.find((r) => r.day === today);
    const streak = dailyStreak(this.daily, today);
    const days = streak >= 2 ? t('dailyStreak', { n: streak }) : '';
    return rec ? t('dailyToday', { m: rec.best, n: rec.tries }) + days : t('dailySame') + days;
  }

  /** Panel wyzwania dnia: dzisiejszy wynik, seria, ostatnie dni, start i ranking dnia. */
  private openDaily(): void {
    if (this.mode === 'play' || this.dailyPanel || this.shop || this.settings || this.trophies) return;
    this.sfx(SFX.tap);
    this.dailyPanel = new DailyPanel({
      pixelRatio: this.game.pixelRatio,
      daily: this.daily,
      medal: this.earned.includes('daily7'),
      onPlay: () => {
        if (this.iris.busy) return;
        this.closeDaily(true);
        this.title?.leave(this.tweens);
        this.transition(this.center(), () => this.startDaily());
      },
      onRanking: () => {
        this.sfx(SFX.tap);
        void gameServices.show('daily').then((shown) => {
          if (!shown) this.notice(/iPhone|iPad/.test(navigator.userAgent) ? t('loginIos') : t('loginAndroid'));
        });
      },
      onClose: () => this.closeDaily(),
    });
    this.dailyPanel.layout(this.game.view, this.bannerReserve);
    this.overlay.addChild(this.dailyPanel);
    this.dailyPanel.alpha = 0;
    this.tweens.to(this.dailyPanel, { alpha: 1 }, { duration: 0.18 });
  }

  private closeDaily(instant = false): void {
    const panel = this.dailyPanel;
    this.dailyPanel = null;
    if (!panel) return;
    if (instant) {
      panel.destroy({ children: true });
      return;
    }
    this.sfx(SFX.tap);
    this.tweens.to(panel, { alpha: 0 }, { duration: 0.15 });
    this.timers.after(0.16, () => panel.destroy({ children: true }));
  }

  /** Wyzwanie dnia: nowa studnia z seedem z daty i od razu gra. */
  private startDaily(): void {
    if (this.mode === 'play' || this.shop || this.settings || this.trophies || this.dailyPanel) return;
    this.stopDemo();
    this.dailyMode = true;
    // newRun czyści nakładki: ekran startowy odkładamy na bok, żeby startPlaying go wygasił.
    const title = this.title;
    if (title) this.overlay.removeChild(title);
    this.newRun();
    if (title) this.overlay.addChild(title);
    this.startPlaying();
    this.dailyBanner();
  }

  private dailyBanner(): void {
    const view = this.game.view;
    const banner = this.makeText(44, '#ffb84d');
    banner.anchor.set(0.5);
    banner.text = `${t('daily')} · ${formatDay(this.dailyDay)}`;
    banner.position.set(view.width / 2, view.safe.top + 230);
    this.fx.addChild(banner);
    void popIn(this.tweens, banner, 0.35);
    this.timers.after(2.2, () => this.tweens.to(banner, { alpha: 0 }, { duration: 0.5 }));
    this.timers.after(2.8, () => {
      this.tweens.killOf(banner);
      banner.destroy();
    });
  }

  private openShop(): void {
    if (this.shop || this.settings || this.trophies || this.dailyPanel) return;
    this.sfx(SFX.tap);
    const previews = new Map<string, Texture | null>(this.hatTextures);
    for (const k of SKINS) previews.set(k.id, this.skinTex.get(k.id)?.body ?? null);
    for (const t of TRAILS) previews.set(t.id, this.cosmetics.trailPreviews.get(t.id) ?? null);
    for (const a of ACCESSORIES) previews.set(a.id, this.cosmetics.acc.get(a.id) ?? null);
    this.shop = new ShopPanel({
      previews,
      rainbow: new Set(SKINS.filter((k) => k.rainbow).map((k) => k.id)),
      unlockName: (id) => {
        const unlock = ITEMS.find((i) => i.id === id)?.unlock;
        const def = unlock ? ACHIEVEMENTS.find((d) => d.id === unlock) : undefined;
        return def ? achDesc(def) : null;
      },
      candyTex: this.candyTex,
      pixelRatio: this.game.pixelRatio,
      tweens: this.tweens,
      onTap: (id) => this.tapItem(id),
      onClose: () => this.closeShop(),
    });
    this.shop.refresh(this.snapshot());
    this.shop.layout(this.game.view, this.bannerReserve);
    this.overlay.addChild(this.shop);
    this.shop.alpha = 0;
    this.tweens.to(this.shop, { alpha: 1 }, { duration: 0.18 });
  }

  private closeShop(): void {
    const shop = this.shop;
    this.shop = null;
    if (!shop) return;
    this.sfx(SFX.tap);
    this.tweens.to(shop, { alpha: 0 }, { duration: 0.15 });
    this.timers.after(0.16, () => shop.destroy({ children: true }));
    this.title?.setStats(this.best, this.wallet());
  }

  private tapItem(id: string): void {
    const r = tapItem(this.snapshot(), id);
    if (!r.ok) {
      if (r.reason === 'poor' || r.reason === 'locked') this.shop?.deny(id, r.missing ?? 0);
      haptics.error();
      return;
    }
    // Sklep działa tylko na ekranie startowym, gdzie bieg ma 0 cukierków: całe konto jest w `bank`.
    this.bank = r.save.candies - (this.wallet() - this.bank);
    this.owned = r.save.owned;
    this.hatId = r.save.hat;
    this.skinId = r.save.skin;
    this.trailId = r.save.trail;
    this.accId = r.save.acc;
    void this.persist();
    this.wear();
    const kind = ITEMS.find((i) => i.id === id)?.kind;
    if (kind === 'trail' && this.trailId) this.trailDemo();
    this.shop?.refresh(r.save);
    this.title?.setStats(this.best, r.save.candies);
    if (r.action === 'bought') {
      this.shop?.celebrate(id);
      this.game.sound.synth(SFX.record);
      haptics.success();
    } else {
      this.sfx(SFX.tap);
      haptics.tap();
    }
    this.squash(0.3);
    this.hatSwing.kick(4);
  }

  /** Zakłada wszystko z szafy: kolor ciała, czapkę, dodatek i ślad. */
  private wear(): void {
    // Kolor: nowe ciało pod czapką.
    const tex = this.skinTex.get(this.skinId ?? 'base') ?? this.skinTex.get('base');
    if (tex) {
      this.bodyArt?.destroy();
      this.bodyArt = bodySprite(tex, bodyScale(PHYS.radius));
      this.body.addChildAt(this.bodyArt, 0);
      this.slimeColor = hexToNumber(tex.color);
    }
    // Czapka siedzi na czubku ciała: obraca się i spłaszcza razem z nim.
    this.hat.removeChildren().forEach((c) => c.destroy());
    const def = HATS.find((h) => h.id === this.hatId);
    const hatTex = def ? this.hatTextures.get(def.id) : null;
    if (def && hatTex) {
      const s = new Sprite({ texture: hatTex, anchor: { x: 0.5, y: 0.9 } });
      s.scale.set(def.width / hatTex.width);
      s.position.set(0, def.y);
      s.rotation = def.tilt;
      this.hat.addChild(s);
    }
    // Dodatek na twarzy (zostaje pionowo, jak oczy).
    this.accLayer.removeChildren().forEach((c) => c.destroy());
    const accTex = this.accId ? this.cosmetics.acc.get(this.accId) : null;
    const acc = this.accId && accTex ? accessorySprite(this.accId, accTex) : null;
    if (acc) this.accLayer.addChild(acc);
    // Ślad: cząsteczki w kształcie z szafy.
    const trail = TRAILS.find((t) => t.id === this.trailId);
    this.trailFx?.view.destroy();
    this.trailFx = null;
    if (trail) {
      const shape = this.cosmetics.shapes.get(trail.shape);
      if (shape) {
        this.trailFx = new Particles(shape, this.game.rng);
        this.world.addChildAt(this.trailFx.view, this.world.getChildIndex(this.slime));
      }
    }
  }

  /** Pokaz śladu po założeniu w szafie: krótki wybuch kształtów wokół slime'a. */
  private trailDemo(): void {
    const trail = TRAILS.find((t) => t.id === this.trailId);
    const s = this.run.slime;
    if (!trail || !this.trailFx) return;
    this.trailFx.burst(s.x, s.y - 30, { count: 24, speed: [150, 420], angle: -Math.PI / 2, spread: Math.PI * 1.4, life: [0.5, 0.9], scale: [0.6, 1.2], endScale: 0.2, gravity: 600, colors: trail.colors });
  }

  // --- bieg ---

  private newRun(keepOverlay = false): void {
    // Cukierki z biegu pokazowego nie trafiają na konto.
    if (this.run && !this.demoRun) this.bank += this.run.candies;
    this.demoRun = this.demo;
    this.runs++;
    this.dailyDay = dayKey(new Date());
    const seed = this.dailyMode ? dailySeed(this.dailyDay) : this.game.rng.int(1, 2 ** 31 - 1);
    this.run = new Run(seed);
    this.recorder = new ReplayRecorder(seed);
    this.bestAtStart = this.best;
    this.runFast = {};
    this.streakHud.set(0);
    this.reachedBiome = 0;
    this.score?.revive();
    this.hint.text = this.hintText('start');
    for (const view of this.chunkViews.values()) view.destroy({ children: true });
    this.chunkViews.clear();
    this.featureViews.clear();
    for (const v of this.candyViews.values()) v.sprite.destroy();
    this.candyViews.clear();
    for (const b of this.powerViews.values()) b.destroy({ children: true });
    this.powerViews.clear();
    this.decalLayer.removeChildren().forEach((c) => c.destroy());
    for (const k of this.run.shaft.chunks.keys()) this.addChunkView(k);
    if (!keepOverlay) this.overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.againButton = null;
    this.slime.visible = true;
    this.slime.scale.set(1);
    // Kształt z lotu (rozciągnięcie, obrót) nie przechodzi na nowy bieg.
    this.tweens.killOf(this.body.scale);
    this.body.scale.set(1);
    this.hint.visible = false;
    this.menuButton = null;
    this.glow.alpha = 0;
    this.heartbeat = 0;
    this.combo = 0;
    this.camera.snap(0, this.floorView());
  }

  private floorView(): number {
    return 160 - this.game.view.height;
  }

  // --- sterowanie ---

  /** Początek celowania (wspólny dla trybów). W locie zwalnia czas. */
  private beginAim(x: number, y: number): boolean {
    if (this.mode !== 'play' || !this.run.canAim) return false;
    this.aiming = { sx: x, sy: y, power: 0, dx: 0, dy: -1 };
    this.aimDanger = false;
    if (this.run.slime.state === 'flying') {
      this.airAim = true;
      this.game.loop.timeScale = 0.25;
    }
    return true;
  }

  /** Tap: przeciągnięcie procy z położenia palca względem slime'a (na ekranie). */
  private tapDrag(): { x: number; y: number } | null {
    if (!this.tapPoint) return null;
    const s = this.run.slime;
    return tapToDrag(s.x, s.y - this.camera.y, this.tapPoint.x, this.tapPoint.y);
  }

  private aimTap(): void {
    const d = this.tapDrag();
    if (d) this.aim(d.x, d.y);
    else this.dotsG.clear();
  }

  /** Świecąca smuga za palcem w trybie swipe: zwęża się ku końcowi i gaśnie w 0,18 s. */
  private drawTrail(real: number): void {
    const life = 0.18;
    for (const p of this.trail) p.age += real;
    while (this.trail.length && this.trail[0]!.age > life) this.trail.shift();
    if (this.trail.length > 24) this.trail.splice(0, this.trail.length - 24);
    // Bez śladu nie czyścimy co klatkę pustej grafiki.
    if (this.trail.length === 0 && this.trailEmpty) return;
    this.trailEmpty = this.trail.length === 0;
    const g = this.trailG.clear();
    const n = this.trail.length;
    for (let i = 1; i < n; i++) {
      const a = this.trail[i - 1]!;
      const b = this.trail[i]!;
      const k = (1 - b.age / life) * (i / n);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xff9ebb, width: 6 + 40 * k, alpha: 0.45 * k, cap: 'round' });
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffffff, width: 3 + 14 * k, alpha: 0.95 * k, cap: 'round' });
    }
  }

  private ripple(x: number, y: number): void {
    const r = new Graphics().circle(0, 0, 26).stroke({ color: 0xffffff, width: 5, alpha: 0.8 });
    r.position.set(x, y);
    this.fx.addChild(r);
    this.tweens.to(r.scale, { x: 2.2, y: 2.2 }, { duration: 0.3, ease: 'quadOut' });
    this.tweens.to(r, { alpha: 0 }, { duration: 0.3 });
    this.timers.after(0.32, () => {
      this.tweens.killOf(r);
      this.tweens.killOf(r.scale);
      r.destroy();
    });
  }

  private hintText(kind: 'start' | 'air'): string {
    const keys = {
      drag: ['hintDragStart', 'hintDragAir'],
      swipe: ['hintSwipeStart', 'hintSwipeAir'],
      tap: ['hintTapStart', 'hintTapAir'],
    } as const;
    return t(keys[this.controls][kind === 'start' ? 0 : 1]);
  }

  // --- ustawienia ---

  private openSettings(): void {
    if (this.settings || this.shop || this.trophies || this.dailyPanel) return;
    this.sfx(SFX.tap);
    this.settings = new SettingsPanel({
      pixelRatio: this.game.pixelRatio,
      onToggle: (key) => this.toggleSetting(key),
      onClose: () => this.closeSettings(),
      onVersionTap: () => this.tapVersion(),
    });
    this.refreshSettings();
    this.settings.setVersionNote(this.perfText ? t('perfOn') : '');
    this.settings.layout(this.game.view, this.bannerReserve);
    this.overlay.addChild(this.settings);
    this.settings.alpha = 0;
    this.tweens.to(this.settings, { alpha: 1 }, { duration: 0.18 });
  }

  /** 5 stuknięć w wersję w ciągu 3 s włącza/wyłącza licznik wydajności (zapamiętany na urządzeniu). */
  private tapVersion(): void {
    const now = this.time;
    this.versionTaps = [...this.versionTaps.filter((t) => now - t < 3), now];
    if (this.versionTaps.length < 5) return;
    this.versionTaps = [];
    this.setPerfHud(!this.perfText);
    try {
      localStorage.setItem('glut-perf', this.perfText ? '1' : '0');
    } catch {
      // brak pamięci przeglądarki: licznik działa do zamknięcia gry
    }
    haptics.success();
  }

  private setPerfHud(on: boolean): void {
    if (on && !this.perfText) {
      this.perfText = new Text({
        text: '',
        style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 20, fontWeight: '700', fill: '#7dffb0', stroke: { color: '#000000', width: 4 } },
        resolution: this.game.pixelRatio,
      });
      this.perfText.anchor.set(0, 1);
      this.perfText.position.set(16, this.game.view.height - this.game.view.safe.bottom - 70);
      this.hud.addChild(this.perfText);
    } else if (!on && this.perfText) {
      this.perfText.destroy();
      this.perfText = null;
    }
    this.settings?.setVersionNote(this.perfText ? t('perfOn') : '');
  }

  private updatePerf(dt: number): void {
    if (!this.perfText) return;
    this.perfIn -= dt;
    if (this.perfIn > 0) return;
    this.perfIn = 0.5;
    const p = this.game.perf;
    this.perfText.text = [
      `${p.fps.toFixed(0)} fps  max ${p.worstMs.toFixed(0)} ms`,
      `CPU ${p.cpuMs.toFixed(1)} / max ${p.cpuWorst.toFixed(1)} ms`,
      `zacięcia ${p.hitches}  kroki 0:${p.zeroSteps} 2+:${p.multiSteps}`,
    ].join('\n');
  }

  private closeSettings(): void {
    const panel = this.settings;
    this.settings = null;
    if (!panel) return;
    this.sfx(SFX.tap);
    this.tweens.to(panel, { alpha: 0 }, { duration: 0.15 });
    this.timers.after(0.16, () => {
      this.tweens.killOf(panel);
      panel.destroy({ children: true });
    });
  }

  private toggleSetting(key: 'music' | 'sfx' | 'vibration' | 'controls' | 'lang' | 'privacy'): void {
    if (key === 'lang') {
      this.langPref = lang() === 'pl' ? 'en' : 'pl';
      setLang(this.langPref);
      void this.persist();
      this.sfx(SFX.tap);
      haptics.tap();
      this.relocalize();
      return;
    }
    if (key === 'privacy') {
      this.sfx(SFX.tap);
      void ads.privacyOptions();
      return;
    }
    if (key === 'controls') {
      this.controls = CONTROL_MODES[(CONTROL_MODES.indexOf(this.controls) + 1) % CONTROL_MODES.length]!;
      this.hint.text = this.hintText('start');
    } else if (key === 'music') this.musicOn = !this.musicOn;
    else if (key === 'sfx') this.sfxOn = !this.sfxOn;
    else this.vibrationOn = !this.vibrationOn;
    this.applySettings();
    this.sfx(SFX.tap);
    haptics.tap();
    this.refreshSettings();
    void this.persist();
  }

  /** Po zmianie języka: ekran startowy i ustawienia budujemy od nowa (teksty powstają przy tworzeniu). */
  private relocalize(): void {
    this.hint.text = this.hintText('start');
    const settings = this.settings;
    this.settings = null;
    settings?.destroy({ children: true });
    if (this.title) {
      this.title.destroy({ children: true });
      this.title = null;
      this.showTitle();
    }
    if (settings) {
      this.openSettings();
      this.tweens.killOf(this.settings!);
      this.settings!.alpha = 1;
    }
  }

  private applySettings(): void {
    this.game.sound.sfxMuted = !this.sfxOn;
    haptics.enabled = this.vibrationOn;
    this.score?.setEnabled(this.musicOn);
  }

  private refreshSettings(): void {
    this.settings?.refresh({ music: this.musicOn, sfx: this.sfxOn, vibration: this.vibrationOn, controls: controlName(this.controls) });
  }

  private aim(x: number, y: number): void {
    if (!this.aiming || !this.run.canAim) {
      this.endAirAim();
      this.dotsG.clear();
      return;
    }
    const k = this.controls === 'swipe' ? -1 : 1; // swipe: w stronę skoku, proca: przeciwnie
    const v = launchVelocity(k * (x - this.aiming.sx), k * (y - this.aiming.sy));
    this.dotsG.clear();
    this.aiming.power = v?.power ?? 0;
    if (!v) return;
    const speed = Math.hypot(v.vx, v.vy);
    this.aiming.dx = v.vx / speed;
    this.aiming.dy = v.vy / speed;
    const sv = this.run.shotVelocity(v.vx, v.vy); // skok w locie jest słabszy
    // Kropki pokazują ok. 1,3 s lotu (jak dotąd), ale śmierć wykrywamy dalej (2,5 s), żeby kolce poza kadrem nie zaskakiwały.
    const p = this.run.world.predict(sv.vx, sv.vy, 150, 3);
    const visible = 27;
    const death = p.end === 'death';
    const shown = p.points.slice(0, visible);
    const g = this.dotsG;
    shown.forEach((pt, i) => {
      const last = i === p.points.length - 1;
      const t = i / Math.max(1, shown.length - 1);
      const color = death ? COLORS.danger : COLORS.dot;
      g.circle(pt.x, pt.y, last && p.end ? 10 : 9 - t * 5).fill({ color, alpha: last ? 0.95 : 0.85 - t * 0.5 });
    });
    const end = p.points[p.points.length - 1];
    if (death && end) {
      const top = this.camera.y + this.game.view.safe.top + 190;
      if (end.y < top) {
        // Śmierć poza kadrem: czerwona strzałka z „!” u góry nad miejscem kolców.
        const x = Math.max(70, Math.min(SHAFT.width - 70, end.x));
        g.moveTo(x, top - 46).lineTo(x - 30, top - 6).lineTo(x + 30, top - 6).closePath().fill({ color: COLORS.danger }).stroke({ color: 0x1e1530, width: 4 });
        g.roundRect(x - 5, top - 34, 10, 17, 4).fill({ color: 0xffffff });
        g.circle(x, top - 11, 4).fill({ color: 0xffffff });
      } else {
        // Krzyżyk w miejscu śmierci.
        for (const k of [1, -1]) g.moveTo(end.x - 14, end.y - 14 * k).lineTo(end.x + 14, end.y + 14 * k).stroke({ color: COLORS.danger, width: 7, cap: 'round' });
      }
    }
    if (death && !this.aimDanger) this.buzz('tap');
    this.aimDanger = death;
  }

  private release(x: number, y: number): void {
    const aiming = this.aiming;
    this.aiming = null;
    this.dotsG.clear();
    const inAir = this.airAim;
    this.endAirAim();
    if (!aiming) return;
    const k = this.controls === 'swipe' ? -1 : 1;
    const v = launchVelocity(k * (x - aiming.sx), k * (y - aiming.sy));
    if (!v || !this.run.launch(v.vx, v.vy)) return;
    this.passTip(inAir ? 'air' : 'aim');
    this.recorder?.shot(v.vx, v.vy);
    if (inAir) {
      const n = this.run.airJumps;
      if (!this.demoRun) this.stats.maxAirJumps = Math.max(this.stats.maxAirJumps, n);
      this.sfx(POWER_SFX.air, { pitch: 1 + Math.min(n - 1, 8) * 0.1 });
      this.score.airJump(n);
      if (n >= 2) this.comboPop(this.run.slime.x, this.run.slime.y + 30, n);
      this.sparks.burst(this.run.slime.x, this.run.slime.y, { count: 14, speed: [150, 400], life: [0.3, 0.5], scale: [0.5, 1], colors: [0xffffff, 0xc8f5ff] });
    }
    this.hint.visible = false;
    this.combo = 0;
    this.hatSwing.kick(-v.vx / 600);
    this.sfx(SFX.launch, { pitch: 0.8 + v.power * 0.5, volume: 0.6 });
    this.score.launch(v.power);
    this.buzz('tap');
  }

  private pickPower(p: PowerUp): void {
    const info = POWER_INFO[p.kind];
    const bubble = this.powerViews.get(p.id);
    this.powerViews.delete(p.id);
    if (bubble) {
      this.tweens.to(bubble, { alpha: 0 }, { duration: 0.3 });
      void this.tweens.to(bubble.scale, { x: 2.2, y: 2.2 }, { duration: 0.3, ease: 'quadOut' }).done.then(() => bubble.destroy({ children: true }));
    }
    this.sfx(POWER_SFX.pickup);
    if (p.kind === 'rocket') this.sfx(POWER_SFX.rocket);
    if (p.kind === 'frost') this.sfx(POWER_SFX.frost);
    this.buzz('success');
    this.sparks.burst(p.x, p.y, { count: 26, speed: [200, 600], life: [0.4, 0.8], scale: [0.6, 1.3], endScale: 0.2, colors: [info.color, 0xffffff, 0xffd166] });
    this.shaker.add(p.kind === 'rocket' ? 0.5 : 0.2);
    this.floatText(p.x, p.y - 70, `${powerName(p.kind)}!`, info.css);
    this.hatSwing.kick(5);
  }

  /** Napis unoszący się w świecie (nazwa power-upu, „Odbite!”). */
  private floatText(x: number, y: number, message: string, color: string): void {
    if (this.demoRun) return;
    const t = hudText(38, color);
    t.text = message;
    t.anchor.set(0.5);
    // Nie pod górnym paskiem (wysokość, rekord, cukierki).
    y = Math.max(y, this.camera.y + this.game.view.safe.top + 230);
    t.position.set(Math.max(150, Math.min(SHAFT.width - 150, x)), y);
    this.world.addChild(t);
    void popIn(this.tweens, t, 0.25);
    this.tweens.to(t, { y: y - 90, alpha: 0 }, { duration: 1.1, delay: 0.5, ease: 'quadIn' });
    this.timers.after(1.7, () => {
      this.tweens.killOf(t);
      this.tweens.killOf(t.scale);
      t.destroy();
    });
  }

  /** Kolce tuż nad kadrem: czerwone ząbki przy górnej krawędzi, mocniejsze, im bliżej. */
  private drawDanger(): void {
    const g = this.dangerG.clear();
    if (this.mode !== 'play' || this.run.over) return;
    const top = this.camera.y;
    const range = 900;
    const y0 = this.game.view.safe.top;
    for (const b of this.run.world.blocks) {
      if (b.surface !== 'spikes') continue;
      const d = top - (b.y + b.h);
      if (d < 0 || d > range) continue;
      const a = (0.4 + 0.6 * (1 - d / range)) * (0.7 + 0.3 * Math.abs(Math.sin(this.time * 8)));
      const x0 = Math.max(SHAFT.wall, b.x);
      const x1 = Math.min(SHAFT.width - SHAFT.wall, b.x + b.w);
      g.rect(x0, y0, x1 - x0, 8).fill({ color: COLORS.danger, alpha: a });
      for (let x = x0 + 16; x < x1 - 8; x += 32) {
        g.moveTo(x - 13, y0 + 8).lineTo(x + 13, y0 + 8).lineTo(x, y0 + 32).closePath().fill({ color: COLORS.danger, alpha: a }).stroke({ color: 0x1e1530, width: 2, alpha: a });
      }
    }
  }

  /** Efekty aktywnych power-upów wokół slime'a. */
  private drawAura(dt: number): void {
    const run = this.run;
    const s = run.slime;
    const g = this.aura.clear();
    const pulse = 1 + Math.sin(this.time * 6) * 0.05;
    // Rytm: kurczący się pierścień pokazuje, ile czasu zostało na kolejny skok.
    if (run.streak >= 2 && s.state === 'stuck' && !run.over) {
      const left = Math.max(0, 1 - run.sinceLand / STREAK.window);
      const urgent = left < 0.35;
      const color = urgent ? 0xff6f8f : streakTier(run.streak).color;
      const alpha = urgent ? 0.6 + 0.4 * Math.abs(Math.sin(this.time * 18)) : 0.9;
      g.circle(0, 0, 66).stroke({ color: 0x1e1530, width: 10, alpha: 0.35 });
      if (left > 0) g.arc(0, 0, 66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left).stroke({ color, width: 7, alpha, cap: 'round' });
    }
    if (run.timers.shell > 0) {
      const fade = run.timers.shell < 2 ? 0.4 + 0.4 * Math.abs(Math.sin(this.time * 10)) : 0.8;
      g.circle(0, 0, 54 * pulse).fill({ color: POWER_INFO.shell.color, alpha: 0.18 * fade }).stroke({ color: 0xffffff, width: 4, alpha: fade });
      g.ellipse(-18, -26, 10, 6).fill({ color: 0xffffff, alpha: 0.6 * fade });
    }
    if (run.timers.magnet > 0) {
      const r = 300 * (0.92 + 0.08 * Math.sin(this.time * 4));
      g.circle(0, 0, r).stroke({ color: POWER_INFO.magnet.color, width: 3, alpha: 0.25 });
    }
    if (s.state === 'flying' && run.timers.rocket <= 0 && !run.over) {
      // Skrzydełka: wielkość = siła następnego skoku w locie (kurczą się z każdym skokiem), złote z drugim oddechem.
      const breath = run.timers.breath > 0;
      const k = airPower(run.airJumps, breath) / AIR.power;
      const flap = Math.sin(this.time * (12 + run.airJumps * 3)) * 0.25;
      const color = breath ? 0xffd166 : 0xffffff;
      for (const side of [-1, 1]) {
        g.ellipse(side * (34 + 12 * k), -10 + flap * 10, 8 + 12 * k, 5 + 6 * k)
          .fill({ color, alpha: 0.5 + 0.4 * k })
          .stroke({ color: 0x1e1530, width: 3 });
      }
    }
    this.body.tint = run.timers.glue > 0 ? 0xc8ffd0 : 0xffffff;
    if (run.timers.rocket > 0 && s.state !== 'dead') {
      this.shaker.add(dt * 0.6);
      this.sparks.burst(s.x + (this.game.rng.next() - 0.5) * 20, s.y + 40, {
        count: 3,
        speed: [200, 500],
        angle: Math.PI / 2,
        spread: 0.7,
        life: [0.2, 0.45],
        scale: [0.7, 1.4],
        endScale: 0.1,
        colors: [0xff6a3d, 0xffd166, 0xffffff],
      });
    }
  }

  /** Autopilot: bot z symulacji „przeciąga palcem” jak gracz (kropki, slow-mo w locie, restart). */
  private pilot(dt: number): void {
    const p = this.autopilot;
    if (!p) return;
    const real = dt / (this.game.loop.timeScale || 1);
    if (!this.demo && (this.mode === 'title' || this.againButton)) {
      this.finger.visible = false;
      p.wait -= real;
      if (p.wait > 0) return;
      if (this.mode === 'title') this.startPlaying();
      else {
        this.sfx(SFX.tap);
        this.newRun();
      }
      p.wait = PILOT.reaction;
      return;
    }
    if (this.run.over) {
      p.shot = null;
      p.wait = PILOT.restart;
      this.finger.visible = false;
      return;
    }
    if (p.shot) {
      if (!this.run.canAim) {
        p.shot = null;
        this.aiming = null;
        this.dotsG.clear();
        this.endAirAim();
        this.finger.visible = false;
        return;
      }
      p.t = Math.min(1, p.t + real / PILOT.aimTime);
      const e = 1 - (1 - p.t) ** 3;
      let x: number;
      let y: number;
      if (this.controls === 'tap') {
        x = p.shot.dragX;
        y = p.shot.dragY;
        const sl = this.run.slime;
        const t = dragToTap(sl.x, sl.y - this.camera.y, x, y);
        this.finger.position.set(t.x, t.y);
      } else {
        const k = this.controls === 'swipe' ? -1 : 1;
        x = p.sx + k * p.shot.dragX * e;
        y = p.sy + k * p.shot.dragY * e;
        this.finger.position.set(x, y);
        if (this.controls === 'swipe') this.trail.push({ x, y, age: 0 });
      }
      this.aim(x, y);
      this.finger.visible = true;
      if (p.t < 1) return;
      p.hold -= real;
      if (p.hold > 0) return;
      this.release(x, y);
      p.shot = null;
      p.wait = this.game.rng.range(0.25, 0.65) // jak człowiek: raz szybko, raz z wahaniem (czasem zrywa rytm);
      this.finger.visible = false;
      return;
    }
    if (!botCanShoot(this.run)) return;
    p.wait -= dt;
    if (p.wait > 0) return;
    const shot = chooseShot(this.run, this.game.rng);
    if (!shot) {
      p.wait = 0.1;
      return;
    }
    // Palec startuje przy slimie, przesunięty tak, żeby całe przeciągnięcie zmieściło się na ekranie.
    const view = this.game.view;
    const s = this.run.slime;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const k = this.controls === 'swipe' ? -1 : 1;
    const mx = k * shot.dragX;
    const my = k * shot.dragY;
    p.sx = this.controls === 'tap' ? 0 : clamp(s.x, 50 - Math.min(0, mx), view.width - 50 - Math.max(0, mx));
    p.sy = this.controls === 'tap' ? 0 : clamp(s.y - this.camera.y, view.safe.top + 160 - Math.min(0, my), view.height - 50 - Math.max(0, my));
    p.shot = shot;
    p.t = 0;
    p.hold = PILOT.hold;
    this.aiming = { sx: p.sx, sy: p.sy, power: 0, dx: 0, dy: -1 };
    if (s.state === 'flying') {
      this.airAim = true;
      // W pokazie bez slow-motion (ekran startowy ma swoje animacje).
      if (!this.demo) this.game.loop.timeScale = 0.25;
    }
  }

  private endAirAim(): void {
    if (!this.airAim) return;
    this.airAim = false;
    this.game.loop.timeScale = 1;
  }

  // --- reakcje na zdarzenia ---

  private react(r: RunStep): void {
    for (const k of r.added ?? []) this.addChunkView(k);
    for (const k of r.removed ?? []) this.removeChunkView(k);
    for (const c of r.collected ?? []) this.collectCandy(c);
    if (r.powered) this.pickPower(r.powered);
    if (r.shielded) {
      const s = this.run.slime;
      this.sfx(POWER_SFX.shield);
      this.buzz('heavy');
      this.shaker.add(0.4);
      this.sparks.burst(s.x, s.y, { count: 30, speed: [200, 600], life: [0.3, 0.6], scale: [0.6, 1.2], colors: [POWER_INFO.shell.color, 0xffffff] });
      this.floatText(s.x, s.y - 60, t('bounced'), POWER_INFO.shell.css);
    }
    if (!this.demoRun) {
      if (r.bounced) this.stats.bounces++;
      if (r.crumbled) this.stats.crumbles++;
      if (r.trick?.kind === 'rescue') this.stats.rescues++;
      if (r.streak) this.stats.bestStreak = Math.max(this.stats.bestStreak, r.streak);
      if (r.airCombo) this.stats.maxAirCombo = Math.max(this.stats.maxAirCombo, r.airCombo.count);
      if (r.powered && !this.stats.powers.includes(r.powered.kind)) this.stats.powers = [...this.stats.powers, r.powered.kind];
    }
    if (r.bounced) this.onBounce(r.bounced.block, r.bounced.x, r.bounced.y, r.bounced.nx, r.bounced.ny, r.bounced.speed);
    if (r.crumbled) this.onCrumble(r.crumbled);
    if (r.landed && this.run.slime.stuckTo?.feature === 'crumble') this.sfx(FEATURE_SFX.creak, { pitch: 0.9 + this.game.rng.next() * 0.2 });
    if (r.landed && this.airAim) this.endAirAim();
    if (r.landed) {
      const l = r.landed;
      const strength = Math.min(1, l.speed / PHYS.maxSpeed);
      this.squash(0.15 + strength * 0.3);
      this.hatSwing.kick((this.game.rng.next() - 0.5) * 10 * (0.3 + strength));
      if (strength > 0.15) {
        const cx = l.x - l.nx * PHYS.radius;
        const cy = l.y - l.ny * PHYS.radius;
        this.sparks.burst(cx, cy, {
          count: Math.round(6 + strength * 14),
          speed: [120, 260 + strength * 400],
          angle: Math.atan2(l.ny, l.nx),
          spread: Math.PI * 0.9,
          life: [0.25, 0.5],
          scale: [0.5, 1.1],
          gravity: 1800,
          colors: [this.slimeColor, 0xffffff],
        });
        this.splat(cx, cy, l.nx, l.ny, strength);
        this.sfx(SFX.land, { volume: 0.4 + strength * 0.6, pitch: 0.9 + this.game.rng.next() * 0.2 });
        this.score.land(strength);
        this.buzz('hit');
      }
      if (strength > 0.6) this.shaker.add(0.25);
    }
    if (r.trick) this.onTrick(r.trick.kind, r.trick.jumps, r.trick.reward);
    if (r.streak) this.onStreak(r.streak);
    if (r.milestone) this.onMilestone(r.milestone.streak, r.milestone.reward);
    if (r.airCombo) this.onAirCombo(r.airCombo.count, r.airCombo.reward);
    if (r.streakBroken) this.onStreakLost(r.streakBroken);
    if (r.died) this.die('spikes');
    if (r.drowned) this.die('syrup');
  }

  // --- półki z mechaniką ---

  private onBounce(block: Block, x: number, y: number, nx: number, ny: number, speed: number): void {
    if (this.airAim) this.endAirAim();
    const strength = Math.min(1, speed / PHYS.maxSpeed);
    this.featureViews.get(block)?.boing(strength);
    this.squash(0.35);
    this.hatSwing.kick((this.game.rng.next() - 0.5) * 14);
    this.sfx(FEATURE_SFX.boing, { pitch: 0.85 + strength * 0.4 + this.game.rng.next() * 0.1 });
    this.score.land(0.5);
    this.buzz('tap');
    this.sparks.burst(x - nx * PHYS.radius, y - ny * PHYS.radius, {
      count: 12,
      speed: [150, 420],
      angle: Math.atan2(ny, nx),
      spread: Math.PI * 0.8,
      life: [0.25, 0.5],
      scale: [0.5, 1],
      gravity: 1600,
      colors: [FEATURE_COLORS.jelly, 0xffffff],
    });
  }

  private onCrumble(block: Block): void {
    this.featureViews.get(block)?.shatter();
    this.sfx(FEATURE_SFX.crumble, { pitch: 0.9 + this.game.rng.next() * 0.2 });
    this.buzz('hit');
    this.shaker.add(0.2);
    // Kawałki czekolady wzdłuż całej półki.
    for (let i = 0; i < 4; i++) {
      this.sparks.burst(block.x + ((i + 0.5) * block.w) / 4, block.y + block.h / 2, {
        count: 7,
        speed: [80, 260],
        angle: -Math.PI / 2,
        spread: Math.PI * 1.6,
        life: [0.4, 0.8],
        scale: [0.7, 1.4],
        gravity: 2200,
        colors: [FEATURE_COLORS.choco, FEATURE_COLORS.chocoLight, FEATURE_COLORS.chocoShine],
      });
    }
  }

  // --- serie ---

  private onStreak(streak: number): void {
    if (streak === 1 && this.tips.includes('aim')) this.timedTip('streak', t('tipStreak'));
    this.streakHud.set(streak);
    if (streak < 2) return;
    this.score.streak(streak);
    // Jeden skok przed premią: muzyka zaczyna narastać.
    if ((streak + 1) % STREAK.every === 0) this.score.anticipate();
    const tier = streakTier(streak);
    const s = this.run.slime;
    this.sparks.burst(s.x, s.y, { count: 6 + tier.level * 4, speed: [80, 260], life: [0.3, 0.5], scale: [0.4, 0.8], colors: tier.colors });
  }

  private onMilestone(streak: number, reward: number): void {
    const tier = streakTier(streak);
    const s = this.run.slime;
    this.sfx(STREAK_SFX.milestone, { pitch: 2 ** ((tier.level * 2) / 12) });
    this.buzz('success');
    this.shaker.add(0.3 + tier.level * 0.1);
    this.game.hitstop(0.05);
    // Fala uderzeniowa i konfetti wokół slime'a.
    for (let i = 0; i < 1 + Math.min(tier.level, 2); i++) {
      const ring = new Graphics().circle(0, 0, 40).stroke({ color: tier.colors[i % tier.colors.length] ?? 0xffffff, width: 8 });
      ring.position.set(s.x, s.y);
      this.world.addChild(ring);
      this.tweens.to(ring.scale, { x: 6, y: 6 }, { duration: 0.6, delay: i * 0.12, ease: 'expoOut' });
      this.tweens.to(ring, { alpha: 0 }, { duration: 0.6, delay: i * 0.12, ease: 'quadIn' });
      this.timers.after(0.8 + i * 0.12, () => {
        this.tweens.killOf(ring);
        this.tweens.killOf(ring.scale);
        ring.destroy();
      });
    }
    this.sparks.burst(s.x, s.y, {
      count: 40 + tier.level * 20,
      speed: [300, 900 + tier.level * 150],
      life: [0.6, 1.1],
      scale: [0.6, 1.5],
      endScale: 0.4,
      gravity: 1400,
      drag: 1.2,
      spin: [-8, 8],
      colors: tier.colors,
    });
    this.score.milestone();
    if (this.demoRun) return;
    milestoneBanner(this.fx, {
      tweens: this.tweens,
      timers: this.timers,
      view: this.game.view,
      pixelRatio: this.game.pixelRatio,
      streak,
      reward,
      time: () => this.time,
    });
    this.flyCandies(reward, 0.35);
  }

  /** Udany skok w locie: ratunek przed syropem albo akrobacja wyżej niż start. */
  private onTrick(kind: 'rescue' | 'acrobat', jumps: number, reward: number): void {
    const s = this.run.slime;
    this.score.trick(jumps + (kind === 'rescue' ? 1 : 0));
    if (kind === 'rescue') {
      this.sfx(STREAK_SFX.rescue);
      this.buzz('success');
      this.shaker.add(0.25);
      this.floatText(s.x, s.y - 80, `${t('rescue')}${jumps > 1 ? ` ×${jumps}` : ''}! +${reward}`, '#8ee3a1');
      const ring = new Graphics().circle(0, 0, 40).stroke({ color: 0x8ee3a1, width: 8 });
      ring.position.set(s.x, s.y);
      this.world.addChild(ring);
      this.tweens.to(ring.scale, { x: 4, y: 4 }, { duration: 0.5, ease: 'expoOut' });
      this.tweens.to(ring, { alpha: 0 }, { duration: 0.5, ease: 'quadIn' });
      this.timers.after(0.6, () => {
        this.tweens.killOf(ring);
        this.tweens.killOf(ring.scale);
        ring.destroy();
      });
      this.sparks.burst(s.x, s.y, { count: 26, speed: [200, 600], life: [0.4, 0.8], scale: [0.5, 1.2], gravity: 900, colors: [0x8ee3a1, 0xffffff, 0xc8f5ff] });
    } else {
      this.sfx(STREAK_SFX.acrobat);
      this.buzz('tap');
      this.floatText(s.x, s.y - 80, `${t('acrobat')}${jumps > 1 ? ` ×${jumps}` : ''}! +${reward}`, '#c8f5ff');
      this.sparks.burst(s.x, s.y, { count: 14, speed: [150, 420], life: [0.3, 0.6], scale: [0.4, 1], colors: [0xffffff, 0xc8f5ff] });
    }
    this.flyCandies(reward, 0.15);
  }

  private onAirCombo(count: number, reward: number): void {
    if (reward <= 0) return;
    const s = this.run.slime;
    this.sfx(STREAK_SFX.combo);
    this.score.trick(count);
    this.floatText(s.x, s.y - 70, `${t('combo')} ×${count}! +${reward}`, '#ffd166');
    this.flyCandies(reward, 0.1);
  }

  private onStreakLost(streak: number): void {
    this.streakHud.lose(streak);
    if (streak < 3) return;
    this.score.lost();
    this.buzz('tap');
  }

  /** Cukierki-premie wyskakują ze slime'a i lecą łukiem do licznika w rogu. */
  private flyCandies(n: number, delay: number): void {
    if (this.demoRun) return;
    const from = this.fx.toLocal(this.slime.getGlobalPosition());
    const to = this.candyIcon.position;
    const size = 46 / Math.max(this.candyTex.width, this.candyTex.height);
    for (let i = 0; i < n; i++) {
      this.flying++;
      const c = new Sprite({ texture: this.candyTex, anchor: 0.5 });
      c.scale.set(0);
      c.position.copyFrom(from);
      this.fx.addChild(c);
      const a = this.game.rng.range(0, Math.PI * 2);
      const r = this.game.rng.range(70, 150);
      const wait = delay + i * 0.06;
      this.tweens.to(c.scale, { x: size, y: size }, { duration: 0.2, delay: wait, ease: 'backOut' });
      this.tweens.to(c, { x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r }, { duration: 0.25, delay: wait, ease: 'quadOut' });
      // Łuk: x i y z różnymi krzywymi.
      const fly = 0.5;
      const start = wait + 0.3;
      this.tweens.to(c, { x: to.x }, { duration: fly, delay: start, ease: 'quadIn' });
      this.tweens.to(c, { y: to.y }, { duration: fly, delay: start, ease: 'cubicIn' });
      this.tweens.to(c, { rotation: 6 }, { duration: fly + 0.3, delay: wait, ease: 'linear' });
      this.timers.after(start + fly, () => {
        this.tweens.killOf(c);
        this.tweens.killOf(c.scale);
        c.destroy();
        this.flying = Math.max(0, this.flying - 1);
        this.sfx(STREAK_SFX.coin, { pitch: 1 + (i % 8) * 0.06 });
        void pulse(this.tweens, this.candyIcon, 0.3);
      });
    }
  }

  private collectCandy(c: Candy): void {
    this.combo++;
    const sprite = this.candyViews.get(c.id)?.sprite;
    this.candyViews.delete(c.id);
    this.score.candy(this.combo);
    if (this.combo >= 2 && this.run.slime.state === 'flying') this.comboPop(c.x, c.y, this.combo);
    this.sparks.burst(c.x, c.y, {
      count: 10,
      speed: [120, 380],
      life: [0.25, 0.5],
      scale: [0.4, 0.9],
      colors: [0xffffff, 0xffd166, this.slimeColor],
    });
    void pulse(this.tweens, this.candyIcon, 0.35);
    if (sprite) {
      this.tweens.to(sprite, { alpha: 0 }, { duration: 0.25 });
      void this.tweens
        .to(sprite.scale, { x: sprite.scale.x * 1.8, y: sprite.scale.y * 1.8 }, { duration: 0.25, ease: 'backOut' })
        .done.then(() => sprite.destroy());
    }
  }

  /** Małe „×3” przy kolejnych cukierkach w jednym locie. */
  private comboPop(x: number, y: number, n: number): void {
    if (this.demoRun) return;
    const t = hudText(30 + Math.min(n, 6) * 4, n >= 3 ? '#ffd166' : '#ffffff');
    t.text = `×${n}`;
    t.anchor.set(0.5);
    t.position.set(x, y - 40);
    this.world.addChild(t);
    void popIn(this.tweens, t, 0.2);
    this.tweens.to(t, { y: y - 100, alpha: 0 }, { duration: 0.5, delay: 0.25, ease: 'quadIn' });
    this.timers.after(0.8, () => {
      this.tweens.killOf(t);
      this.tweens.killOf(t.scale);
      t.destroy();
    });
  }

  private die(cause: 'spikes' | 'syrup'): void {
    const s = this.run.slime;
    this.score.die();
    this.endAirAim();
    this.aiming = null;
    this.dotsG.clear();
    this.game.hitstop(0.08);
    this.shaker.add(0.7);
    this.sfx(SFX.death);
    this.buzz('error');
    this.sparks.burst(s.x, s.y, {
      count: 40,
      speed: [200, 900],
      angle: cause === 'syrup' ? -Math.PI / 2 : 0,
      spread: cause === 'syrup' ? Math.PI : Math.PI * 2,
      life: [0.4, 0.9],
      scale: [0.6, 1.6],
      endScale: 0.3,
      gravity: 2000,
      drag: 1,
      colors: cause === 'syrup' ? [this.slimeColor, COLORS.syrup, 0xffffff] : [this.slimeColor, 0xffffff, COLORS.danger],
    });
    this.slime.visible = false;
    if (this.demoRun) {
      // Bot w pokazie zginął: po chwili nowy bieg pokazowy, bez zapisu i ekranu końca.
      this.timers.after(1.4, () => this.restartDemo());
      return;
    }
    this.recordRunEnd();
    this.timers.after(0.55, () => this.showGameOver(cause));
  }

  /** Koniec biegu (śmierć albo wyjście do menu): rekord, ranking, statystyki, wyzwanie dnia, zapis. */
  private recordRunEnd(): void {
    this.adPolicy.runEnded();
    this.lastRunSeconds = this.run.time;
    this.lastReplay = this.recorder?.finish(this.run.meters) ?? null;
    if (!PILOT_MODE) {
      void gameServices.submit('best', this.run.meters);
      if (this.dailyMode) void gameServices.submit('daily', this.run.meters);
    }
    this.stats.runs++;
    this.stats.candies += this.run.candies;
    if (this.dailyMode) this.stats.dailyRuns++;
    this.recorder = null;
    if (this.dailyMode && !PILOT_MODE) {
      const r = recordDaily(this.daily, this.dailyDay, this.run.meters);
      this.daily = r.list;
      this.dailyResult = r;
    } else this.dailyResult = null;
    void this.persist();
  }

  private showGameOver(cause: 'spikes' | 'syrup'): void {
    const meters = this.run.meters;
    const record = meters > this.bestAtStart && meters > 0;
    const panel = new Container();
    const dim = new Graphics();
    dim.label = 'dim';
    const title = this.makeText(52, pal.surface);
    title.text = cause === 'syrup' ? t('overSyrup') : t('overSpikes');
    const score = this.makeText(110, '#ffffff');
    score.text = `${meters} m`;
    const clock = this.makeText(30, '#d9ccff');
    clock.text = t('time', { t: formatTime(this.run.time) });
    const sub = this.makeText(34, record ? pal.accent : pal.surface);
    sub.text = record ? t('newRecord') : t('best', { m: this.best });
    const daily = this.dailyResult;
    if (daily) {
      // Wyzwanie dnia: liczy się najlepszy wynik dnia.
      sub.style.fill = daily.improved ? '#ffb84d' : pal.surface;
      sub.text = daily.improved && daily.record.tries > 1 ? t('bestToday', { n: daily.record.tries }) : t('dailyBest', { m: daily.record.best });
      if (record) sub.text = t('recordToday', { m: daily.record.best });
    }
    const sweets = this.makeText(30, pal.surface);
    sweets.text = t('candiesRun', { n: this.run.candies, candies: candies(this.run.candies), total: this.bank + this.run.candies });
    const rhythm = this.makeText(28, '#ffd166');
    rhythm.text = this.run.bestStreak >= 2 ? t('rhythmBest', { n: this.run.bestStreak }) + (this.run.bonus ? t('bonus', { n: this.run.bonus }) : '') : '';
    rhythm.position.set(0, 76);
    for (const t of [title, score, clock, sub, sweets, rhythm]) t.anchor.set(0.5);
    title.position.set(0, -260);
    score.position.set(0, -150);
    clock.position.set(0, -72);
    sub.position.set(0, -22);
    sweets.position.set(0, 30);
    const again = new Button({
      label: t('again'),
      color: pal.accent,
      width: 380,
      resolution: this.game.pixelRatio,
      onTap: () => {
        this.sfx(SFX.tap);
        this.maybeInterstitial();
        this.transition(this.center(), () => this.newRun());
      },
    });
    again.position.set(0, 170);
    this.againButton = again;
    const menu = new Button({
      label: t('menu'),
      color: '#9b8cff',
      width: 380,
      height: 90,
      fontSize: 34,
      resolution: this.game.pixelRatio,
      onTap: () => {
        this.sfx(SFX.tap);
        this.maybeInterstitial();
        this.transition(this.center(), () => {
          this.dailyMode = false;
          this.newRun();
          this.showTitle();
        });
      },
    });
    menu.position.set(0, 300);
    this.menuButton = menu;
    panel.addChild(title, score, clock, sub, sweets, rhythm, again, menu);
    panel.label = 'panel';
    this.overlay.addChild(dim, panel);
    this.layoutOverlay();
    dim.alpha = 0;
    this.tweens.to(dim, { alpha: 1 }, { duration: 0.25 });
    void popIn(this.tweens, panel, 0.4);
    if (record) {
      this.buzz('success');
      this.sfx(SFX.record);
      this.timers.after(0.35, () => void pulse(this.tweens, sub, 0.25));
      const view = this.game.view;
      this.sparks.burst(view.width / 2, this.camera.y + view.height * 0.25, {
        count: 90,
        speed: [400, 1100],
        angle: -Math.PI / 2,
        spread: Math.PI * 0.9,
        life: [1.2, 2],
        scale: [0.5, 1.2],
        gravity: 1400,
        drag: 1.2,
        spin: [-8, 8],
        colors: pal.swatches.map(hexToNumber),
      });
    }
  }

  private layoutOverlay(): void {
    const view = this.game.view;
    const dim = this.overlay.getChildByLabel('dim') as Graphics | null;
    dim?.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.72 });
    this.overlay.getChildByLabel('panel')?.position.set(view.width / 2, view.height * 0.45);
  }

  /** Presja syropu: poświata, bąbelki z dołu ekranu, bicie serca i przestraszone oczy. */
  private pressure(dt: number): void {
    const run = this.run;
    const view = this.game.view;
    if (!run.started || run.over) {
      this.glow.alpha = Math.max(0, this.glow.alpha - dt * 3);
      this.face.fright = 0;
      return;
    }
    const screenBottom = this.camera.y + view.height;
    const below = run.syrupY - screenBottom;
    const near = Math.min(1, Math.max(0, 1 - below / 1300));
    const gap = run.syrupY - run.slime.y;
    const danger = Math.min(1, Math.max(0, 1 - (gap - 150) / 650));
    const beat = 0.5 + 0.5 * Math.sin(this.time * (3 + danger * 9));
    this.glow.alpha = near * (0.45 + 0.55 * beat) * (0.6 + 0.4 * danger);
    this.face.fright = danger;

    if (this.game.rng.chance(near * dt * 30)) {
      const x = this.game.rng.range(60, SHAFT.width - 60);
      this.sparks.burst(x, Math.min(run.syrupY, screenBottom + 30), {
        count: 1 + Math.round(danger * 2),
        speed: [250, 520 + danger * 400],
        angle: -Math.PI / 2,
        spread: 0.5,
        life: [0.5, 1.0],
        scale: [0.5, 1.3],
        endScale: 0.2,
        gravity: 600,
        colors: [COLORS.syrup, COLORS.syrupTop],
      });
    }

    if (danger > 0.55) {
      this.heartbeat -= dt;
      if (this.heartbeat <= 0) {
        this.buzz('tap');
        this.sfx(SFX.heartbeat, { volume: 0.5 + danger * 0.5 });
        this.shaker.add(0.08 + danger * 0.08);
        this.heartbeat = 0.85 - danger * 0.45;
      }
    } else {
      this.heartbeat = 0;
    }
  }

  // --- wygląd ---

  private makeText(size: number, color: string): Text {
    return new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: size,
        fontWeight: '800',
        fill: color,
        stroke: { color: '#1e1530', width: Math.max(3, size * 0.12), join: 'round' },
      },
      resolution: this.game.pixelRatio,
    });
  }

  private addChunkView(k: number): void {
    const blocks = this.run.shaft.chunks.get(k);
    if (!blocks || this.chunkViews.has(k)) return;
    const view = new Container();
    const g = new Graphics();
    // Tekstury ścian pod grafiką z kodu (ta dorysowuje zacieki, połysk i szwy na wierzchu).
    const under = new Container();
    view.addChild(under, g);
    for (const b of blocks) {
      if (!b.feature) {
        const look = this.lookAt(b.y + b.h / 2).surface;
        drawBlock(g, b, look, this.wallSprites(under, b, look));
        continue;
      }
      const fv = new FeatureView(b);
      if (b.gone) fv.visible = false;
      this.featureViews.set(b, fv);
      view.addChild(fv);
    }
    if (k === 0) {
      // Dekoracje na dnie studni (tylko wygląd, bez kolizji).
      const [crystal, lolly] = this.decor;
      const place = (tex: Texture | null | undefined, x: number, h: number, flip = false) => {
        if (!tex) return;
        const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: 0.92 } });
        s.scale.set((h / tex.height) * (flip ? -1 : 1), h / tex.height);
        s.position.set(x, 4);
        view.addChildAt(s, 0);
      };
      place(crystal, 110, 110);
      place(lolly, SHAFT.width - 120, 120, true);
      place(crystal, SHAFT.width - 200, 70, true);
    }
    this.chunkViews.set(k, view);
    this.chunkLayer.addChild(view);
    for (const c of this.run.shaft.candies.get(k) ?? []) {
      if (c.taken) continue;
      const tex = this.biomeCandy[biomeIndex(metersAt(c.y))] ?? this.candyTex;
      const sprite = new Sprite({ texture: tex, anchor: 0.5 });
      sprite.scale.set(52 / Math.max(tex.width, tex.height));
      sprite.position.set(c.x, c.y);
      this.candyViews.set(c.id, { sprite, candy: c });
      this.candyLayer.addChild(sprite);
    }
    for (const p of this.run.shaft.powers.get(k) ?? []) {
      if (p.taken) continue;
      const tex = this.powerTex.get(p.kind);
      if (!tex) continue;
      const bubble = new PowerBubble(p.kind, tex, p.x * 0.01);
      bubble.position.set(p.x, p.y);
      this.powerViews.set(p.id, bubble);
      this.candyLayer.addChild(bubble);
    }
  }

  /** Pas ściany z tekstury (lód, lukier w kolorze świata, karmel z kolcami). Zwraca, czy się udało. */
  private wallSprites(layer: Container, b: Block, P: typeof SURFACE): boolean {
    const isWall = (b.x < 0 || b.x >= SHAFT.width - SHAFT.wall) && b.w <= SHAFT.width;
    if (!isWall) return false;
    const T = this.wallTex;
    const own = this.biomeWalls.get(BIOMES[biomeIndex(metersAt(b.y + b.h / 2))]!.id);
    const sticky = own?.sticky ?? T.frosting;
    const spikes = own?.spikes.length ? own.spikes : T.spike ? [{ tex: T.spike, glow: this.spikeGlow }] : [];
    const tex = b.surface === 'ice' ? T.ice : b.surface === 'sticky' ? sticky : T.caramel;
    if (!tex || (b.surface === 'spikes' && !spikes.length)) return false;
    const W = SHAFT.wall;
    const left = b.x < 0;
    const band = left ? b.x + b.w - W : b.x;
    const edge = left ? b.x + b.w : b.x;
    const inward = left ? 1 : -1;
    const strip = new TilingSprite({ texture: tex, width: W, height: b.h });
    // Szerokość tekstury = 140 jednostek świata (w pasie widać jej wycinek); wzór przyklejony do świata.
    const k = 140 / tex.width;
    strip.tileScale.set(k, k);
    strip.tilePosition.set(left ? -20 : -60, -b.y);
    strip.position.set(band, b.y);
    // Wspólny lukier jest biały i barwiony na kolor świata; własna ściana świata ma swoje kolory.
    if (b.surface === 'sticky' && !own?.sticky) strip.tint = P.frosting;
    layer.addChild(strip);
    if (b.surface === 'spikes') {
      // Gąszcz zamiast grzebienia: każdy kolec ma inny kąt, wielkość i odstęp (powtarzalnie z położenia),
      // z tyłu przyciemniona warstwa mniejszych dla głębi. Groźny jest cały odcinek ściany, jak wcześniej.
      const rng = new Rng((Math.round(b.y * 13 + b.x * 7) >>> 0) || 1);
      const place = (count: number, back: boolean) => {
        for (let i = 0; i < count; i++) {
          const { tex, glow: glowTex } = spikes[rng.int(0, spikes.length - 1)]!;
          const sp = new Sprite({ texture: tex, anchor: { x: 0.1, y: 0.5 } });
          const size = back ? rng.range(0.55, 0.85) : rng.range(0.75, 1.3);
          const sc = (40 / tex.width) * size;
          sp.scale.set(sc * inward, sc * (rng.chance(0.5) ? 1 : -1));
          sp.rotation = rng.range(-0.45, 0.45) * inward;
          const y = b.y + ((i + 0.5) * b.h) / count + rng.range(-0.3, 0.3) * (b.h / count);
          sp.position.set(edge - inward * rng.range(back ? 10 : 4, back ? 16 : 10), Math.max(b.y + 8, Math.min(b.y + b.h - 8, y)));
          if (back) sp.tint = 0x9a8a9a;
          else if (glowTex) {
            // Poświata ostrzegawcza (biała rozmyta sylwetka barwiona na czerwono): ten sam sygnał
            // „niebezpieczne” we wszystkich światach, także dla ciemnych kolców na ciemnym tle.
            // Sylwetka ma ramkę 24 px: przeliczamy kotwicę, żeby leżała dokładnie pod kolcem.
            const ax = (0.1 * tex.width + 24) / glowTex.width;
            const glow = new Sprite({ texture: glowTex, anchor: { x: ax, y: 0.5 } });
            const gs = Math.abs(sp.scale.x);
            glow.scale.set(Math.sign(sp.scale.x) * gs, Math.sign(sp.scale.y) * gs);
            glow.rotation = sp.rotation;
            glow.position.set(sp.x, sp.y);
            glow.tint = 0xff3b3b;
            glow.alpha = 0.8;
            layer.addChild(glow);
          }
          layer.addChild(sp);
        }
      };
      place(Math.max(1, Math.round(b.h / 40)), true);
      place(Math.max(1, Math.round(b.h / 30)), false);
    }
    return true;
  }

  private removeChunkView(k: number): void {
    for (const b of this.featureViews.keys()) if (b.chunk === k) this.featureViews.delete(b);
    this.chunkViews.get(k)?.destroy({ children: true });
    this.chunkViews.delete(k);
    for (const [id, v] of this.candyViews) {
      if (id.startsWith(`${k}:`)) {
        v.sprite.destroy();
        this.candyViews.delete(id);
      }
    }
    const bubble = this.powerViews.get(`${k}:p`);
    bubble?.destroy({ children: true });
    this.powerViews.delete(`${k}:p`);
  }

  private animateCandies(): void {
    for (const [id, { sprite, candy }] of this.candyViews) {
      sprite.position.set(candy.x, candy.y); // magnes przesuwa cukierki
      const phase = id.length * 1.7 + id.charCodeAt(0) * 0.3;
      sprite.rotation = Math.sin(this.time * 2.2 + phase) * 0.18;
      sprite.pivot.y = (Math.sin(this.time * 3 + phase) * 4) / sprite.scale.y;
    }
  }

  /** Kleks lukru w miejscu lądowania, znika po kilku sekundach. */
  private splat(x: number, y: number, nx: number, ny: number, strength: number): void {
    const g = new Graphics();
    const rng = this.game.rng;
    const w = 30 + strength * 30;
    g.ellipse(0, 0, w, 7 + strength * 4).fill({ color: this.slimeColor, alpha: 0.85 });
    for (let i = 0; i < 3 + Math.round(strength * 4); i++) {
      g.circle(rng.range(-w * 1.2, w * 1.2), rng.range(-10, 2), rng.range(2.5, 6)).fill({ color: this.slimeColor, alpha: 0.85 });
    }
    g.position.set(x, y);
    g.rotation = Math.atan2(ny, nx) + Math.PI / 2;
    this.decalLayer.addChild(g);
    if (this.decalLayer.children.length > 18) this.decalLayer.children[0]?.destroy();
    this.tweens.to(g, { alpha: 0 }, { duration: 1.2, delay: 3 });
    this.timers.after(4.3, () => {
      if (!g.destroyed) g.destroy();
    });
  }

  private drawSyrup(): void {
    const y = this.shown.syrup;
    const bottom = this.camera.y + this.game.view.height + 200;
    const g = this.syrupG.clear();
    if (y > bottom) return;
    const wave: number[] = [];
    for (let x = -40; x <= SHAFT.width + 40; x += 30) {
      wave.push(x, y + Math.sin(x * 0.02 + this.time * 3) * 8 + Math.sin(x * 0.045 - this.time * 2) * 5);
    }
    const frozen = this.run.timers.frost > 0;
    g.poly([...wave, SHAFT.width + 40, bottom, -40, bottom]).fill({ color: frozen ? 0xa8dcf0 : this.syrupColor, alpha: 0.92 });
    const band: number[] = [...wave];
    for (let i = wave.length - 2; i >= 0; i -= 2) band.push(wave[i] as number, (wave[i + 1] as number) + 14);
    g.poly(band).fill({ color: frozen ? 0xe8f8ff : this.syrupTopColor, alpha: 0.9 });
    if (frozen) {
      // Lodowe kryształki na zamarzniętej powierzchni.
      for (let x = 30; x < SHAFT.width; x += 70) g.poly([x - 10, y + 4, x, y - 18, x + 10, y + 4]).fill({ color: 0xffffff, alpha: 0.8 });
    }
  }

  // --- światy ---

  private lookAt(y: number): BiomeLook {
    return BIOME_LOOKS[BIOMES[biomeIndex(metersAt(y))]!.id];
  }

  /** Tło, kolory, cząsteczki i mrok według wysokości kamery; baner przy wejściu do nowego świata. */
  private updateBiome(dt: number): void {
    const view = this.game.view;
    const { index, next, t } = biomeBlend(metersAt(this.camera.y + view.height * 0.5));
    const a = BIOME_LOOKS[BIOMES[index]!.id];
    const b = BIOME_LOOKS[BIOMES[next]!.id];
    if (this.bg && this.bgNext) {
      if (this.shownBiome !== index) {
        this.shownBiome = index;
        this.bg.texture = this.biomeBg[index] ?? this.bg.texture;
        this.bgNext.texture = this.biomeBg[next] ?? this.bgNext.texture;
      }
      // Fabryka: lampy czasem przygasają.
      const flicker = (t < 0.5 ? a : b).flicker;
      if (flicker && this.game.rng.chance(dt * 1.2)) this.flick = 0.45 + this.game.rng.next() * 0.25;
      this.flick += (1 - this.flick) * Math.min(1, dt * 6);
      const dim = flicker ? this.flick : 1;
      // W rytm: tło lekko rozjaśnia się na stopie i mocno przy dropie.
      const boost = Math.min(0.4, this.beatGlow * 0.16 + this.dropGlow * 0.28);
      this.bg.tint = mixColor(mixColor(0x000000, a.bgTint, dim), 0xffffff, boost);
      this.bgNext.tint = mixColor(mixColor(0x000000, b.bgTint, dim), 0xffffff, boost);
      this.bgNext.alpha = t;
    }
    this.syrupColor = mixColor(a.syrup, b.syrup, t);
    this.syrupTopColor = mixColor(a.syrupTop, b.syrupTop, t);
    this.glow.tint = this.syrupColor;
    this.shadeG.alpha = a.dark + (b.dark - a.dark) * t;

    // Cząsteczki w powietrzu (iskry, kurz, świetliki, żar).
    const amb = (t < 0.5 ? a : b).ambient;
    this.ambientAcc += amb.rate * dt;
    while (this.ambientAcc >= 1) {
      this.ambientAcc -= 1;
      const rng = this.game.rng;
      const vy = rng.range(amb.vy[0], amb.vy[1]);
      this.sparks.burst(rng.range(SHAFT.wall + 20, SHAFT.width - SHAFT.wall - 20), this.camera.y + rng.range(0, view.height), {
        count: 1,
        speed: [Math.abs(vy), Math.abs(vy) + 10],
        angle: vy < 0 ? -Math.PI / 2 : Math.PI / 2,
        spread: 1.2,
        life: [2.5, 4.5],
        scale: amb.scale,
        colors: amb.colors,
      });
    }

    // Baner: pierwszy raz w tym biegu w nowym świecie.
    if (this.mode === 'play' && !this.run.over) {
      const reached = biomeIndex(this.run.meters);
      if (reached > this.reachedBiome) {
        this.reachedBiome = reached;
        this.biomeBanner(reached);
      }
    }
  }

  /** Pasy światła przy ścianach (biały gradient, kolor nadaje tint) i błysk całego ekranu. */
  private drawLights(view: View): void {
    const strip = (x0: number, x1: number) =>
      new FillGradient({
        type: 'linear',
        start: { x: x0, y: 0 },
        end: { x: x1, y: 0 },
        textureSpace: 'local',
        colorStops: [
          { offset: 0, color: 'rgba(255,255,255,0.9)' },
          { offset: 1, color: 'rgba(255,255,255,0)' },
        ],
      });
    const w = 170;
    this.lightL.clear().rect(SHAFT.wall - 10, 0, w, view.height).fill(strip(0, 1));
    this.lightR.clear().rect(SHAFT.width - SHAFT.wall - w + 10, 0, w, view.height).fill(strip(1, 0));
    this.flashG.clear().rect(0, 0, view.width, view.height).fill({ color: 0xffffff });
  }

  /** Uderzenia muzyki -> światła, podskok slime'a, iskry. */
  private updateLights(dt: number): void {
    const real = Math.min(0.1, dt / (this.game.loop.timeScale || 1));
    const level = this.score.intensity;
    for (const p of this.score.takePulses()) {
      if (p.kind === 'kick') {
        this.beatGlow = Math.max(this.beatGlow, p.power);
        if (this.mode === 'play' && this.run.slime.state === 'stuck' && !this.aiming) this.squash(0.04 + p.power * 0.05);
      } else if (p.kind === 'snare') this.sideGlow = Math.max(this.sideGlow, p.power);
      else if (p.kind === 'hit') {
        this.beatGlow = Math.max(this.beatGlow, p.power);
        this.sideGlow = Math.max(this.sideGlow, p.power);
      } else if (p.kind === 'drop') this.dropGlow = 1;
      else if (p.kind === 'bar' && level >= 3 && this.mode === 'play') {
        const view = this.game.view;
        const look = this.lookAt(this.camera.y + view.height * 0.5);
        for (const x of [SHAFT.wall + 20, SHAFT.width - SHAFT.wall - 20]) {
          this.sparks.burst(x, this.camera.y + view.height * (0.3 + this.game.rng.next() * 0.5), {
            count: 6 + level * 2, speed: [150, 420], angle: x < 360 ? 0 : Math.PI, spread: 1.4, life: [0.4, 0.8], scale: [0.4, 0.9], colors: look.ambient.colors,
          });
        }
      }
    }
    this.beatGlow *= Math.exp(-real * 7);
    this.sideGlow *= Math.exp(-real * 9);
    this.dropGlow *= Math.exp(-real * 3);
    const view = this.game.view;
    const color = this.lookAt(this.camera.y + view.height * 0.5).ambient.colors[0] ?? 0xffffff;
    // Bazowa jasność rośnie z poziomem muzyki: w menu prawie nic, przy dużej serii wyraźne światła.
    const base = [0, 0.06, 0.1, 0.16, 0.22][level] ?? 0.22;
    const strength = level === 0 ? 0.3 : 1;
    this.lightL.tint = color;
    this.lightR.tint = color;
    this.lightL.alpha = Math.min(0.85, base + (this.beatGlow * 0.35 + this.sideGlow * 0.3) * strength + this.dropGlow * 0.5);
    this.lightR.alpha = this.lightL.alpha;
    this.flashG.tint = color;
    this.flashG.alpha = this.dropGlow * 0.28;
  }

  /** Baner tylko poza rozgrywką: ekran startowy, sklep, ustawienia, koniec biegu. */
  private syncBanner(force = false): void {
    const want = this.mode === 'title' || !!this.againButton || !!this.shop || !!this.settings || !!this.trophies || !!this.dailyPanel;
    if (want === this.bannerWanted && !force) return;
    this.bannerWanted = want;
    void (want ? ads.showBanner() : ads.hideBanner());
  }

  /** Między biegami: reklama pełnoekranowa wg zasad (od 3. biegu, co 3 biegi, min. 2 min, nie po krótkim biegu). */
  private maybeInterstitial(): void {
    const now = performance.now() / 1000;
    if (!this.adPolicy.shouldShow(now, this.lastRunSeconds)) return;
    void ads.showInterstitial().then((shown) => {
      if (shown) this.adPolicy.shown(now);
    });
  }

  private lastRunSeconds = 0;

  private updateMusic(): void {
    const view = this.game.view;
    const below = this.run.syrupY - (this.run.slime.y + view.height * 0.1);
    const danger = this.run.started && !this.run.over ? Math.min(1, Math.max(0, 1 - below / 900)) : 0;
    const k = this.run.streak;
    const menu = this.mode === 'title' || !!this.shop || !!this.settings;
    this.score.setBiome(Math.max(0, this.shownBiome));
    this.score.update({
      intensity: menu ? 0 : 1 + (k >= 2 ? 1 : 0) + (k >= 5 ? 1 : 0) + (k >= 10 ? 1 : 0),
      danger,
      timeScale: this.game.loop.timeScale || 1,
      dead: this.run.over,
    });
  }

  private biomeBanner(index: number): void {
    const view = this.game.view;
    const root = new Container();
    const name = this.makeText(60, '#ffffff');
    name.anchor.set(0.5);
    name.text = biomeName(index);
    name.style.dropShadow = { color: '#120a1e', distance: 6, angle: Math.PI / 2, blur: 0, alpha: 1 };
    const fit = Math.min(1, (view.width - 60) / name.width);
    name.scale.set(fit);
    const sub = this.makeText(34, '#ffd166');
    sub.anchor.set(0.5);
    sub.text = `${index * 100} m`;
    sub.y = -62;
    root.addChild(sub, name);
    const tipText = biomeTip(index);
    if (tipText) {
      const tip = this.makeText(30, '#ffffff');
      tip.anchor.set(0.5);
      tip.text = tipText;
      tip.y = 64;
      tip.scale.set(Math.min(1, (view.width - 60) / tip.width));
      root.addChild(tip);
    }
    const y = view.safe.top + 300;
    root.position.set(view.width / 2, y - 60);
    root.alpha = 0;
    this.fx.addChild(root);
    this.tweens.to(root, { y, alpha: 1 }, { duration: 0.5, ease: 'backOut' });
    this.timers.after(3.2, () => this.tweens.to(root, { y: y - 50, alpha: 0 }, { duration: 0.6, ease: 'quadIn' }));
    this.timers.after(3.9, () => {
      this.tweens.killOf(root);
      root.destroy({ children: true });
    });
    // Im mroczniejszy świat, tym niżej brzmi.
    this.sfx(BIOME_SFX, { pitch: 2 ** (-index / 12) });
    this.buzz('success');
  }

  /** Mrok: ciemne krawędzie ekranu (przezroczystość ustawia świat). */
  private drawShade(view: View): void {
    const side = (x0: number, x1: number) =>
      new FillGradient({
        type: 'linear',
        start: { x: x0, y: 0 },
        end: { x: x1, y: 0 },
        textureSpace: 'local',
        colorStops: [
          { offset: 0, color: 'rgba(8,4,14,0.95)' },
          { offset: 1, color: 'rgba(8,4,14,0)' },
        ],
      });
    const top = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: 'rgba(8,4,14,0.9)' },
        { offset: 1, color: 'rgba(8,4,14,0)' },
      ],
    });
    // Boki mroku zaczynają się od wewnętrznej krawędzi ścian: lód, lukier i kolce zostają czytelne.
    const w = 170;
    const wall = SHAFT.wall;
    this.shadeG
      .clear()
      .rect(wall, 0, w, view.height)
      .fill(side(0, 1))
      .rect(view.width - wall - w, 0, w, view.height)
      .fill(side(1, 0))
      .rect(0, 0, view.width, view.height * 0.22)
      .fill(top);
    this.shadeG.alpha = 0;
  }

  private squash(amount: number): void {
    const body = this.body;
    this.tweens.killOf(body.scale);
    body.scale.set(1 + amount, 1 - amount);
    this.tweens.to(body.scale, { x: 1, y: 1 }, { duration: 0.45, ease: 'elasticOut' });
  }

  // --- diagnostyka (?diag): dane z prawdziwego urządzenia ---

  private diagText: Text | null = null;

  private setupDiag(bodyTex: Texture): void {
    const probe = new Sprite({ texture: bodyTex });
    probe.position.set(20, 200);
    probe.scale.set(1.2);
    const frame = new Graphics().rect(18, 198, bodyTex.width * 1.2 + 4, bodyTex.height * 1.2 + 4).stroke({ color: 0x00ff88, width: 2 });
    this.diagText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 18, fill: '#00ff88', stroke: { color: '#000000', width: 4 } },
      resolution: this.game.pixelRatio,
    });
    this.diagText.position.set(20, 330);
    this.overlay.parent?.addChild(frame, probe, this.diagText);
  }

  private updateDiag(): void {
    if (!this.diagText) return;
    const body = this.body.children[0];
    const src = body instanceof Sprite ? body.texture.source : null;
    const b = this.body.getBounds();
    const r = this.game.app.renderer;
    this.diagText.text = [
      `renderer ${r.name} type ${r.type} res ${r.resolution}`,
      `dpr ${window.devicePixelRatio} pixelRatio ${this.game.pixelRatio.toFixed(2)}`,
      `body ${body?.constructor.name} vis ${body?.visible} alpha ${body?.alpha}`,
      `tex ${src ? `${src.pixelWidth}x${src.pixelHeight} res ${src.resolution.toFixed(2)}` : '-'}`,
      `body.scale ${this.body.scale.x.toFixed(2)},${this.body.scale.y.toFixed(2)} rot ${this.body.rotation.toFixed(2)}`,
      `body.pos ${this.body.x.toFixed(1)},${this.body.y.toFixed(1)}`,
      `bounds ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.width.toFixed(0)}x${b.height.toFixed(0)}`,
      `slime ${this.run.slime.state} n ${this.run.slime.nx.toFixed(2)},${this.run.slime.ny.toFixed(2)}`,
      `audio ${this.game.sound.state} muted ${this.game.sound.muted}`,
      `ua ${navigator.userAgent.slice(-60)}`,
    ].join('\n');
  }

  private placeSlime(dt: number): void {
    const s = this.run.slime;
    this.slime.position.set(this.shown.x, this.shown.y);
    let look = { x: 0, y: 0 };
    if (s.state === 'flying') {
      const speed = Math.hypot(s.vx, s.vy);
      const dirX = speed > 1 ? s.vx / speed : 0;
      const dirY = speed > 1 ? s.vy / speed : -1;
      // Kopuła „czubkiem” do przodu, podstawa z tyłu.
      this.body.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
      this.body.position.set(-dirX * PHYS.radius, -dirY * PHYS.radius);
      const stretch = Math.min(0.35, speed / 6000);
      this.tweens.killOf(this.body.scale);
      this.body.scale.set(1 - stretch * 0.6, 1 + stretch);
      look = { x: dirX, y: dirY };
      this.trailIn -= dt;
      if (this.trailIn <= 0 && speed > 400) {
        this.trailIn = 0.03;
        const trail = TRAILS.find((t) => t.id === this.trailId);
        if (trail && this.trailFx) {
          this.trailFx.burst(s.x - dirX * 24, s.y - dirY * 24, {
            count: 1,
            speed: [10, 70],
            life: [0.35, 0.6],
            scale: trail.shape === 'dot' ? [0.45, 0.8] : [0.55, 0.9],
            endScale: 0.15,
            spin: trail.shape === 'dot' ? undefined : [-4, 4],
            colors: trail.colors,
          });
        } else {
          this.sparks.burst(s.x - dirX * 20, s.y - dirY * 20, {
            count: 1,
            speed: [10, 60],
            life: [0.25, 0.45],
            scale: [0.5, 0.9],
            endScale: 0.1,
            colors: [this.slimeColor],
          });
        }
      }
    } else if (s.state === 'stuck') {
      this.body.rotation = Math.atan2(s.ny, s.nx) + Math.PI / 2;
      this.body.position.set(-s.nx * PHYS.radius, -s.ny * PHYS.radius);
      if (this.aiming && this.aiming.power > 0) {
        const p = this.aiming.power;
        const tremble = p > 0.98 ? (this.game.rng.next() - 0.5) * 0.04 : 0;
        this.body.scale.set(1 + p * 0.15 + tremble, 1 - p * 0.22 + tremble);
      }
      if (this.aiming) look = { x: this.aiming.dx, y: this.aiming.dy };
    }
    this.face.tick(dt, look.x, look.y, () => this.game.rng.next());
    this.updateDiag();
  }
}

/** Cukierek z kodu (zapas, gdy nie ma grafiki z Flux). */
function candySvg(): string {
  return svg(84, 52, [
    defs([radialGradient('c', [[0, '#ffffff'], [0.5, '#ff9ebb'], [1, '#e2507f']])]),
    path('M18,26 L2,12 L6,26 L2,40 Z', { fill: '#ffd166', stroke: '#1e1530', strokeWidth: 3, strokeLinejoin: 'round' }),
    path('M66,26 L82,12 L78,26 L82,40 Z', { fill: '#ffd166', stroke: '#1e1530', strokeWidth: 3, strokeLinejoin: 'round' }),
    circle(42, 26, 22, { fill: 'url(#c)', stroke: '#1e1530', strokeWidth: 3.5 }),
    ellipse(35, 18, 7, 4, { fill: '#ffffff', opacity: 0.7 }),
  ]);
}
