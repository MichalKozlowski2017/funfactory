/**
 * Dane Ostatniej Bramy: klasy, wrogowie, fale, imiona. Balans = zmiana liczb tutaj.
 */

export type ClassId = 'archer' | 'knight' | 'mage' | 'priestess';

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Litera na szarym prototypie. */
  glyph: string;
  hp: number;
  damage: number;
  /** Odstęp między atakami (s). */
  cooldown: number;
  /** Zasięg ataku albo leczenia (jednostki gry). */
  range: number;
  /** Promień obrażeń obszarowych (0 = pojedynczy cel). */
  splash: number;
  /** Ile wrogów zatrzymuje (tylko rycerz). */
  blocks: number;
  /** Leczenie sąsiadów na cykl (tylko kapłanka). */
  heal: number;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  archer: { id: 'archer', name: 'Łucznik', glyph: 'Ł', hp: 80, damage: 13, cooldown: 0.75, range: 220, splash: 0, blocks: 0, heal: 0 },
  knight: { id: 'knight', name: 'Rycerz', glyph: 'R', hp: 170, damage: 18, cooldown: 1.0, range: 95, splash: 0, blocks: 2, heal: 0 },
  mage: { id: 'mage', name: 'Mag', glyph: 'M', hp: 70, damage: 20, cooldown: 1.7, range: 180, splash: 75, blocks: 0, heal: 0 },
  priestess: { id: 'priestess', name: 'Kapłanka', glyph: 'K', hp: 70, damage: 4, cooldown: 1.4, range: 230, splash: 0, blocks: 0, heal: 14 },
};

export type EnemyId = 'ghoul' | 'runner' | 'brute' | 'wraith' | 'boss';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  /** Jednostki/s wzdłuż drogi. */
  speed: number;
  /** Obrażenia zadawane rycerzowi, który go zatrzymał (na sekundę). */
  melee: number;
  /** Atak z dystansu na najbliższego obrońcę (0 = brak). */
  ranged: number;
  rangedRange: number;
  rangedCooldown: number;
  /** Ile życia bramy zabiera po dojściu. */
  gateDamage: number;
  xp: number;
  radius: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  ghoul: { id: 'ghoul', name: 'Ghul', hp: 64, speed: 88, melee: 8, ranged: 0, rangedRange: 0, rangedCooldown: 0, gateDamage: 1, xp: 2, radius: 18 },
  runner: { id: 'runner', name: 'Wilkołak', hp: 40, speed: 184, melee: 6, ranged: 0, rangedRange: 0, rangedCooldown: 0, gateDamage: 1, xp: 2, radius: 16 },
  brute: { id: 'brute', name: 'Ogr', hp: 305, speed: 51, melee: 22, ranged: 0, rangedRange: 0, rangedCooldown: 0, gateDamage: 3, xp: 6, radius: 26 },
  wraith: { id: 'wraith', name: 'Upiór', hp: 82, speed: 77, melee: 6, ranged: 7, rangedRange: 170, rangedCooldown: 2.0, gateDamage: 1, xp: 4, radius: 18 },
  boss: { id: 'boss', name: 'Pan Mgieł', hp: 1990, speed: 35, melee: 30, ranged: 12, rangedRange: 200, rangedCooldown: 2.4, gateDamage: 10, xp: 30, radius: 36 },
};

/** Fala: grupy [wróg, liczba, odstęp spawnu w s]. Grupy idą po kolei. */
export type Wave = [EnemyId, number, number][];

export const WAVES: Wave[] = [
  [['ghoul', 10, 1.3]],
  [['ghoul', 10, 1.0], ['runner', 6, 0.6]],
  [['ghoul', 13, 0.9], ['brute', 1, 1], ['runner', 8, 0.5]],
  [['wraith', 5, 1.6], ['ghoul', 13, 0.8], ['brute', 3, 3]],
  [['runner', 13, 0.45], ['wraith', 6, 1.2], ['brute', 4, 2.4]],
  [['ghoul', 10, 0.7], ['boss', 1, 1], ['wraith', 8, 1.4], ['runner', 10, 0.5]],
];

export const GATE_HP = 15;

export type Trait = 'faithful' | 'wrathful';

export const TRAITS: Record<Trait, { name: string; hint: string }> = {
  faithful: { name: 'Wierny', hint: 'po śmierci towarzysza pogrąża się w żałobie' },
  wrathful: { name: 'Gniewny', hint: 'po śmierci towarzysza wpada w szał' },
};

export const NAMES = [
  'Mszczuj', 'Bogna', 'Jarogniew', 'Zbysława', 'Wencel', 'Ludmiła', 'Bratumił', 'Gniewko',
  'Mira', 'Sobiesław', 'Witosława', 'Dobrava', 'Radost', 'Czcibor', 'Wielisława', 'Domarat',
];

/** Więzi: punkty za wspólnie przetrwaną falę na sąsiednich stanowiskach. */
export const BOND = {
  perWave: 1,
  /** Progi poziomów więzi i premia do obrażeń dla obojga, gdy stoją obok siebie. */
  levels: [
    { at: 2, name: 'Towarzysze', damage: 0.12 },
    { at: 4, name: 'Bracia broni', damage: 0.25 },
  ],
  /** Po śmierci partnera z więzią ≥ 1. */
  grief: { damage: -0.3 },
  rage: { damage: 0.45, cooldown: -0.2 },
} as const;

/** Poziomy obrońców. */
export const LEVEL = {
  xpFor: (level: number) => 6 + level * 6,
  damage: 0.14,
  hp: 0.14,
  max: 10,
} as const;

/**
 * Rany: obrońca na zerze punktów życia pada ranny (do końca fali), wraca z połową życia,
 * ale każda rana na stałe obniża maks. życie. Powalenie przy `max` ranach = śmierć.
 */
export const WOUNDS = { max: 2, hpPenalty: 0.15, returnHp: 0.5 } as const;

/** Leczenie wszystkich między falami (część maks. HP). */
export const REST_HEAL = 0.3;
