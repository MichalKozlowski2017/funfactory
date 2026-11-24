/**
 * Litery po śladzie (Ścieżka Lusi): wielka litera z kresek w kolejności pisania. Palec prowadzi się
 * po każdej kresce od zielonej kropki; postęp idzie naprzód, gdy palec jest blisko śladu przed nim.
 * Współrzędne w polu litery 0..1 (szerokość × wysokość).
 */
import type { Rng } from '@funfactory/core';
import { lang, type Lang } from './lang.ts';
import { ITEMS } from './catalog.ts';
import { LETTER_PIC_IDS } from './letter-pics.ts';
import { MAX_LEVEL } from './puzzles.ts';

export const LETTER_ROUND = 3;

type P = [number, number];

/** Kształt litery (cyfry): kreski w kolejności pisania i poziom, od którego się pojawia. */
export interface Glyph {
  ch: string;
  /** Kreski w kolejności pisania. */
  strokes: P[][];
  /** Poziom, od którego litera się pojawia (proste najpierw). */
  level: number;
}

/** Litera w rundzie: kształt i przykład („A jak arbuz”): obiekt (obrazek po narysowaniu) i słowo lektora. */
export interface Letter extends Glyph {
  item: string;
  word: string;
}

/** Łuk elipsy (środek, półosie, kąty w stopniach; 0° = prawo, 90° = dół). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 16): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P;
  });
}

const BASE: Glyph[] = [
  { ch: 'I', level: 0, strokes: [[[0.5, 0], [0.5, 1]]] },
  { ch: 'L', level: 0, strokes: [[[0.28, 0], [0.28, 1], [0.78, 1]]] },
  { ch: 'T', level: 0, strokes: [[[0.12, 0], [0.88, 0]], [[0.5, 0], [0.5, 1]]] },
  { ch: 'O', level: 0, strokes: [arc(0.5, 0.5, 0.38, 0.5, -90, -450, 28)] }, // od góry w lewo, jak w przedszkolu (i jak C, G)
  { ch: 'A', level: 1, strokes: [[[0.5, 0], [0.12, 1]], [[0.5, 0], [0.88, 1]], [[0.28, 0.62], [0.72, 0.62]]] },
  { ch: 'M', level: 1, strokes: [[[0.12, 1], [0.12, 0], [0.5, 0.6], [0.88, 0], [0.88, 1]]] },
  { ch: 'W', level: 1, strokes: [[[0.04, 0], [0.27, 1], [0.5, 0.35], [0.73, 1], [0.96, 0]]] },
  { ch: 'K', level: 1, strokes: [[[0.25, 0], [0.25, 1]], [[0.82, 0], [0.25, 0.56], [0.82, 1]]] },
  { ch: 'P', level: 2, strokes: [[[0.25, 1], [0.25, 0]], [[0.25, 0], ...arc(0.5, 0.25, 0.3, 0.25, -90, 90, 14).slice(0), [0.25, 0.5]]] },
  { ch: 'D', level: 2, strokes: [[[0.25, 0], [0.25, 1]], [[0.25, 0], ...arc(0.42, 0.5, 0.4, 0.5, -90, 90, 20), [0.25, 1]]] },
  { ch: 'B', level: 2, strokes: [[[0.25, 0], [0.25, 1]], [[0.25, 0], ...arc(0.47, 0.24, 0.26, 0.24, -90, 90, 12), ...arc(0.5, 0.74, 0.32, 0.26, -90, 90, 12), [0.25, 1]]] },
  { ch: 'S', level: 2, strokes: [[...arc(0.5, 0.25, 0.3, 0.25, -15, -270, 16), ...arc(0.5, 0.75, 0.3, 0.25, -90, 165, 16).slice(1)]] },
  { ch: 'E', level: 0, strokes: [[[0.78, 0], [0.25, 0], [0.25, 1], [0.78, 1]], [[0.25, 0.5], [0.7, 0.5]]] },
  { ch: 'F', level: 0, strokes: [[[0.78, 0], [0.25, 0], [0.25, 1]], [[0.25, 0.5], [0.7, 0.5]]] },
  { ch: 'H', level: 0, strokes: [[[0.22, 0], [0.22, 1]], [[0.78, 0], [0.78, 1]], [[0.22, 0.5], [0.78, 0.5]]] },
  { ch: 'N', level: 1, strokes: [[[0.2, 1], [0.2, 0], [0.8, 1], [0.8, 0]]] },
  { ch: 'Z', level: 1, strokes: [[[0.18, 0], [0.82, 0], [0.18, 1], [0.82, 1]]] },
  { ch: 'U', level: 1, strokes: [[[0.2, 0], [0.2, 0.62], ...arc(0.5, 0.62, 0.3, 0.38, 180, 0, 16), [0.8, 0]]] },
  { ch: 'C', level: 1, strokes: [arc(0.55, 0.5, 0.4, 0.5, -40, -320, 24)] },
  { ch: 'R', level: 2, strokes: [[[0.25, 1], [0.25, 0]], [[0.25, 0], ...arc(0.5, 0.25, 0.3, 0.25, -90, 90, 14), [0.25, 0.5]], [[0.45, 0.5], [0.82, 1]]] },
  { ch: 'G', level: 2, strokes: [[...arc(0.55, 0.5, 0.4, 0.5, -40, -360, 26), [0.6, 0.5]]] },
  { ch: 'J', level: 2, strokes: [[[0.7, 0], [0.7, 0.68], ...arc(0.45, 0.68, 0.25, 0.32, 0, 180, 14)]] },
  // Litery z alfabetów pozostałych języków (i polskie Ł).
  { ch: 'Ł', level: 1, strokes: [[[0.34, 0], [0.34, 1], [0.84, 1]], [[0.12, 0.62], [0.58, 0.36]]] },
  { ch: 'V', level: 0, strokes: [[[0.1, 0], [0.5, 1], [0.9, 0]]] },
  { ch: 'Y', level: 1, strokes: [[[0.12, 0], [0.5, 0.5]], [[0.88, 0], [0.5, 0.5], [0.5, 1]]] },
  { ch: 'Q', level: 2, strokes: [arc(0.5, 0.5, 0.38, 0.5, -90, -450, 28), [[0.58, 0.7], [0.92, 1]]] },
];

/** Litera ze znakiem nad sobą: podstawa ściśnięta w dół pola, u góry miejsce na kreskę albo kropki. */
const TOP = 0.26;
function accented(base: string): P[][] {
  const g = BASE.find((x) => x.ch === base)!;
  return g.strokes.map((st) => st.map(([x, y]) => [x, TOP + y * (1 - TOP)] as P));
}
/** Kreska nad literą (ś): z góry z prawej w dół w lewo, jak w zeszycie. */
const ACUTE: P[] = [[0.66, 0], [0.46, 0.16]];
/** Kropka (ż): krótka kreska, wystarczy ją dotknąć. */
const dot = (x: number): P[] => [[x - 0.02, 0.08], [x + 0.02, 0.08]];
/** Falka nad Ñ. */
const TILDE: P[] = Array.from({ length: 13 }, (_, i) => [0.2 + (0.6 * i) / 12, 0.1 - Math.sin((i / 12) * Math.PI * 2) * 0.06] as P);

const ACCENTED: Glyph[] = [
  { ch: 'Ś', level: 2, strokes: [...accented('S'), ACUTE] },
  { ch: 'Ż', level: 2, strokes: [...accented('Z'), dot(0.5)] },
  { ch: 'Ñ', level: 2, strokes: [...accented('N'), TILDE] },
];

/** Wszystkie kształty liter (alfabety czterech języków). */
export const LETTERS: readonly Glyph[] = [...BASE, ...ACCENTED];


/** Kreska jako gęsty ciąg punktów co `step` (w jednostkach pola litery). */
export function resample(stroke: P[], step: number): P[] {
  const out: P[] = [stroke[0]!];
  for (let i = 1; i < stroke.length; i++) {
    const [ax, ay] = stroke[i - 1]!;
    const [bx, by] = stroke[i]!;
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

/**
 * Postęp po kresce: z indeksu `at` przesuwa się do najdalszego punktu w oknie `look` punktów naprzód,
 * który leży bliżej palca niż `tol`. Palec daleko od śladu: postęp stoi.
 */
export function advance(points: readonly P[], at: number, finger: P, tol: number, look = 8): number {
  let best = at;
  for (let j = at; j < Math.min(points.length, at + look + 1); j++) {
    const [x, y] = points[j]!;
    if (Math.hypot(x - finger[0], y - finger[1]) <= tol) best = j;
  }
  return best;
}

/**
 * Przykłady na każdą literę w każdym języku: [obiekt, słowo lektora] („A jak arbuz”, „A is for apple”).
 * Po 3 tam, gdzie są dobre słowa (najmniej 2). Kolejność liter = alfabet.
 * Pominięte (decyzja właściciela 2026-11-24): litery bez co najmniej dwóch dobrych dziecięcych słów
 * (po polsku Ą, Ć, Ę, Ń, Ó, Y, Ź; po angielsku X; po niemiecku Ä, Ö, Ü, X, ß; po hiszpańsku Q, W, X)
 * oraz Q, V, X po polsku.
 * Obiekty: katalog (sim/catalog.ts) albo obrazki tylko do liter (sim/letter-pics.ts).
 */
export const LETTER_EXAMPLES: Record<Lang, Record<string, [item: string, word: string][]>> = {
  pl: {
    "A": [["watermelon", "Arbuz"], ["pineapple", "Ananas"], ["car", "Autko"]],
    "B": [["banana", "Banan"], ["ladybug", "Biedronka"], ["small-balloon", "Balonik"]],
    "C": [["lemon", "Cytryna"], ["onion", "Cebula"], ["truck", "Ciężarówka"]],
    "D": [["dinosaur", "Dinozaur"], ["dolphin", "Delfin"], ["pumpkin", "Dynia"]],
    "E": [["emu", "Emu"], ["elf", "Elf"], ["eclair", "Ekler"]],
    "F": [["seal", "Foka"], ["flamingo", "Flaming"], ["flag", "Flaga"]],
    "G": [["pear", "Gruszka"], ["ukulele", "Gitarka"], ["little-star", "Gwiazdka"]],
    "H": [["hippo", "Hipopotam"], ["helicopter", "Helikopter"], ["scooter", "Hulajnoga"]],
    "I": [["turkey", "Indyk"], ["igloo", "Igloo"]],
    "J": [["apple", "Jabłko"], ["hedgehog", "Jeż"], ["egg", "Jajko"]],
    "K": [["cat", "Kot"], ["cow", "Krowa"], ["duck", "Kaczka"]],
    "L": [["lion", "Lew"], ["lalka", "Lalka"], ["kite", "Latawiec"]],
    "Ł": [["swan", "Łabędź"], ["boat", "Łódka"], ["spoon", "Łyżka"]],
    "M": [["butterfly", "Motyl"], ["monkey", "Małpka"], ["carrot", "Marchewka"]],
    "N": [["rhino", "Nosorożec"], ["bear", "Niedźwiedź"], ["tent", "Namiot"]],
    "O": [["sheep", "Owca"], ["octopus", "Ośmiornica"], ["cucumber", "Ogórek"]],
    "P": [["dog", "Pies"], ["penguin", "Pingwin"], ["tomato", "Pomidor"]],
    "R": [["rocket", "Rakieta"], ["bike", "Rower"], ["fish", "Rybka"]],
    "S": [["elephant", "Słoń"], ["owl", "Sowa"], ["airplane", "Samolot"]],
    "Ś": [["snail", "Ślimak"], ["plum", "Śliwka"], ["pig", "Świnka"]],
    "T": [["tractor", "Traktor"], ["strawberry", "Truskawka"], ["rainbow", "Tęcza"]],
    "U": [["beehive", "Ul"], ["ear", "Ucho"], ["ufo", "UFO"]],
    "W": [["whale", "Wieloryb"], ["squirrel", "Wiewiórka"], ["grapes", "Winogrona"]],
    "Z": [["zebra", "Zebra"], ["hare", "Zajączek"], ["potato", "Ziemniak"]],
    "Ż": [["frog", "Żaba"], ["giraffe", "Żyrafa"], ["turtle", "Żółw"]],
  },
  en: {
    "A": [["apple", "Apple"], ["airplane", "Airplane"], ["ant", "Ant"]],
    "B": [["bear", "Bear"], ["butterfly", "Butterfly"], ["ball", "Ball"]],
    "C": [["cat", "Cat"], ["cow", "Cow"], ["carrot", "Carrot"]],
    "D": [["dog", "Dog"], ["duck", "Duck"], ["dolphin", "Dolphin"]],
    "E": [["elephant", "Elephant"], ["egg", "Egg"], ["emu", "Emu"]],
    "F": [["fish", "Fish"], ["frog", "Frog"], ["fox", "Fox"]],
    "G": [["giraffe", "Giraffe"], ["goat", "Goat"], ["grapes", "Grapes"]],
    "H": [["horse", "Horse"], ["hedgehog", "Hedgehog"], ["helicopter", "Helicopter"]],
    "I": [["igloo", "Igloo"], ["ice-cream", "Ice cream"], ["iguana", "Iguana"]],
    "J": [["jellyfish", "Jellyfish"], ["jacket", "Jacket"], ["jam", "Jam"]],
    "K": [["kitten", "Kitten"], ["kite", "Kite"], ["kettle", "Kettle"]],
    "L": [["lion", "Lion"], ["lemon", "Lemon"], ["ladybug", "Ladybug"]],
    "M": [["monkey", "Monkey"], ["mouse", "Mouse"], ["moon", "Moon"]],
    "N": [["nest", "Nest"], ["walnut", "Nut"]],
    "O": [["owl", "Owl"], ["octopus", "Octopus"], ["orange-fruit", "Orange"]],
    "P": [["pig", "Pig"], ["penguin", "Penguin"], ["pear", "Pear"]],
    "Q": [["queen", "Queen"], ["quilt", "Quilt"]],
    "R": [["rocket", "Rocket"], ["rhino", "Rhino"], ["rainbow", "Rainbow"]],
    "S": [["snail", "Snail"], ["sun", "Sun"], ["strawberry", "Strawberry"]],
    "T": [["turtle", "Turtle"], ["train", "Train"], ["tractor", "Tractor"]],
    "U": [["umbrella", "Umbrella"], ["unicorn", "Unicorn"], ["ufo", "UFO"]],
    "V": [["violin", "Violin"], ["van", "Van"], ["vase", "Vase"]],
    "W": [["whale", "Whale"], ["watermelon", "Watermelon"], ["walrus", "Walrus"]],
    "Y": [["yo-yo", "Yo-yo"], ["yacht", "Yacht"], ["yak", "Yak"]],
    "Z": [["zebra", "Zebra"], ["zucchini", "Zucchini"]],
  },
  de: {
    "A": [["monkey", "Affe"], ["apple", "Apfel"], ["car", "Auto"]],
    "B": [["banana", "Banane"], ["bee", "Biene"], ["ball", "Ball"]],
    "C": [["clown", "Clown"], ["computer", "Computer"], ["cello", "Cello"]],
    "D": [["dinosaur", "Dinosaurier"], ["dolphin", "Delfin"], ["kite", "Drachen"]],
    "E": [["elephant", "Elefant"], ["duck", "Ente"], ["owl", "Eule"]],
    "F": [["fish", "Fisch"], ["frog", "Frosch"], ["fox", "Fuchs"]],
    "G": [["goose", "Gans"], ["ukulele", "Gitarre"]],
    "H": [["dog", "Hund"], ["hare", "Hase"], ["helicopter", "Hubschrauber"]],
    "I": [["hedgehog", "Igel"], ["igloo", "Iglu"], ["island", "Insel"]],
    "J": [["jacket", "Jacke"], ["yogurt", "Joghurt"], ["yo-yo", "Jojo"]],
    "K": [["cat", "Katze"], ["cow", "Kuh"], ["octopus", "Krake"]],
    "L": [["lion", "Löwe"], ["spoon", "Löffel"], ["small-balloon", "Luftballon"]],
    "M": [["mouse", "Maus"], ["moon", "Mond"], ["ladybug", "Marienkäfer"]],
    "N": [["rhino", "Nashorn"], ["hippo", "Nilpferd"], ["nest", "Nest"]],
    "O": [["orange-fruit", "Orange"], ["ear", "Ohr"], ["oven", "Ofen"]],
    "P": [["horse", "Pferd"], ["penguin", "Pinguin"], ["mushroom", "Pilz"]],
    "Q": [["jellyfish", "Qualle"], ["rubber-duck", "Quietscheente"]],
    "R": [["rocket", "Rakete"], ["robot", "Roboter"]],
    "S": [["sun", "Sonne"], ["sock", "Socke"], ["seahorse", "Seepferdchen"]],
    "T": [["tomato", "Tomate"], ["tractor", "Traktor"], ["drum", "Trommel"]],
    "U": [["clock", "Uhr"], ["submarine", "U-Boot"], ["ufo", "Ufo"]],
    "V": [["bird", "Vogel"], ["vase", "Vase"], ["volcano", "Vulkan"]],
    "W": [["whale", "Wal"], ["cloud", "Wolke"], ["watermelon", "Wassermelone"]],
    "Y": [["yacht", "Yacht"], ["yak", "Yak"]],
    "Z": [["zebra", "Zebra"], ["lemon", "Zitrone"], ["train", "Zug"]],
  },
  es: {
    "A": [["bee", "Abeja"], ["airplane", "Avión"], ["squirrel", "Ardilla"]],
    "B": [["whale", "Ballena"], ["boat", "Barco"], ["bike", "Bicicleta"]],
    "C": [["horse", "Caballo"], ["snail", "Caracol"], ["rabbit", "Conejo"]],
    "D": [["dinosaur", "Dinosaurio"], ["dolphin", "Delfín"], ["dice", "Dado"]],
    "E": [["elephant", "Elefante"], ["hedgehog", "Erizo"], ["little-star", "Estrella"]],
    "F": [["strawberry", "Fresa"], ["seal", "Foca"], ["little-flower", "Flor"]],
    "G": [["cat", "Gato"], ["hen", "Gallina"], ["ukulele", "Guitarra"]],
    "H": [["egg", "Huevo"], ["leaf", "Hoja"], ["helicopter", "Helicóptero"]],
    "I": [["igloo", "Iglú"], ["iguana", "Iguana"], ["magnet", "Imán"]],
    "J": [["giraffe", "Jirafa"], ["boar", "Jabalí"], ["soap", "Jabón"]],
    "K": [["koala", "Koala"], ["kiwi", "Kiwi"], ["kayak", "Kayak"]],
    "L": [["lion", "León"], ["lemon", "Limón"], ["moon", "Luna"]],
    "M": [["monkey", "Mono"], ["butterfly", "Mariposa"], ["apple", "Manzana"]],
    "N": [["orange-fruit", "Naranja"], ["cloud", "Nube"], ["nest", "Nido"]],
    "Ñ": [["nandu", "Ñandú"], ["gnu", "Ñu"]],
    "O": [["sheep", "Oveja"], ["bear", "Oso"], ["pot", "Olla"]],
    "P": [["dog", "Perro"], ["duck", "Pato"], ["fish", "Pez"]],
    "R": [["frog", "Rana"], ["mouse", "Ratón"], ["robot", "Robot"]],
    "S": [["sun", "Sol"], ["watermelon", "Sandía"], ["sun-hat", "Sombrero"]],
    "T": [["turtle", "Tortuga"], ["train", "Tren"], ["tomato", "Tomate"]],
    "U": [["grapes", "Uvas"], ["unicorn", "Unicornio"]],
    "V": [["cow", "Vaca"], ["dress", "Vestido"], ["glass", "Vaso de leche"]],
    "Y": [["yo-yo", "Yoyó"], ["yacht", "Yate"], ["yogurt", "Yogur"]],
    "Z": [["fox", "Zorro"], ["carrot", "Zanahoria"], ["shoe", "Zapato"]],
  },
};

/** Nazwa pliku nagrania „X jak słowo” (bez znaków spoza ASCII). */
export function letterLine(ch: string, item: string): string {
  const slug = ch.toLowerCase().replace('ć', 'ci').replace('ł', 'lw').replace('ó', 'oo').replace('ś', 'si').replace('ź', 'zi').replace('ż', 'zh').replace('ä', 'ae').replace('ö', 'oe').replace('ñ', 'ny');
  return `letter-${slug}-${item}`;
}

/** Wszystkie nagrania liter w języku `l` (z literą i słowem, do listy lektora). */
export function letterLines(l: Lang = lang()): { line: string; ch: string; word: string }[] {
  return Object.entries(LETTER_EXAMPLES[l]).flatMap(([ch, xs]) => xs.map(([item, word]) => ({ line: letterLine(ch, item), ch, word })));
}

/** Litery alfabetu w języku `l` (z pierwszym przykładem). */
export function lettersOf(l: Lang = lang()): Letter[] {
  return Object.entries(LETTER_EXAMPLES[l]).flatMap(([ch, xs]) => {
    const g = LETTERS.find((x) => x.ch === ch);
    return g && xs.length ? [{ ...g, item: xs[0]![0], word: xs[0]![1] }] : [];
  });
}

/** Który przykład litery był ostatnio (kolejna runda z tą literą pokazuje następny). */
const shownExample = new Map<string, number>();

export function makeLetterRound(rng: Rng, level: number, have: ReadonlySet<string> = new Set([...ITEMS.map((i) => i.id), ...LETTER_PIC_IDS])): Letter[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  const lg = lang();
  const pool = lettersOf(lg).filter((x) => x.level <= l && LETTER_EXAMPLES[lg][x.ch]!.some(([item]) => have.has(item)));
  return mixRound(rng, pool, l, 'letters').map((x) => {
    const xs = LETTER_EXAMPLES[lg][x.ch]!.filter(([item]) => have.has(item));
    const key = `${lg}:${x.ch}`;
    const i = ((shownExample.get(key) ?? rng.int(0, xs.length - 1)) + 1) % xs.length;
    shownExample.set(key, i);
    return { ...x, item: xs[i]![0], word: xs[i]![1] };
  });
}

/** Ostatnia runda każdej zabawy (w tej sesji), żeby dwie kolejne nie były takie same. */
const lastRound = new Map<string, string>();

/**
 * Runda z puli: dwie z bieżącego poziomu (nowe), reszta z niższych (powtórka), a gdy niższych brak,
 * wszystkie z bieżącego. Nigdy dokładnie ten sam zestaw co poprzednio.
 */
export function mixRound<T extends { level: number }>(rng: Rng, pool: readonly T[], level: number, key: string, n = LETTER_ROUND, id: (x: T) => string = (x) => (x as unknown as Letter).ch): T[] {
  let out: T[] = [];
  // Elementy z poprzedniej rundy na koniec kolejki: kolejna runda (np. „graj dalej”) bierze najpierw inne.
  const prev = new Set((lastRound.get(key) ?? '').split(','));
  const newFirst = (xs: T[]) => [...xs.filter((x) => !prev.has(id(x))), ...xs.filter((x) => prev.has(id(x)))];
  for (let k = 0; k < 8; k++) {
    const fresh = newFirst(rng.shuffle(pool.filter((x) => x.level === level)));
    const old = newFirst(rng.shuffle(pool.filter((x) => x.level < level)));
    const nFresh = old.length ? Math.min(fresh.length, n - 1) : n;
    out = rng.shuffle([...fresh.slice(0, nFresh), ...old.slice(0, n - Math.min(nFresh, fresh.length))]).slice(0, n);
    if (out.map(id).sort().join() !== lastRound.get(key)) break;
  }
  // Pierwszy element rundy nie z poprzedniej rundy (dziecko od razu widzi coś nowego).
  const i = out.findIndex((x) => !prev.has(id(x)));
  if (i > 0) [out[0], out[i]] = [out[i]!, out[0]!];
  lastRound.set(key, out.map(id).sort().join());
  return out;
}

/** Tolerancja śladu (ułamek wysokości litery): młodsze dzieci rysują mniej dokładnie. */
export const traceTolerance = (level: number): number => [0.16, 0.13, 0.11][Math.max(0, Math.min(MAX_LEVEL, Math.round(level)))] as number;

/** Cyfry po śladzie: po narysowaniu tyle obrazków, ile mówi cyfra (Lusia liczy). */
export const DIGITS: readonly Letter[] = ([
  { ch: '1', level: 0, strokes: [[[0.28, 0.22], [0.6, 0], [0.6, 1]]] },
  { ch: '7', level: 0, strokes: [[[0.15, 0], [0.85, 0], [0.4, 1]]] },
  { ch: '4', level: 0, strokes: [[[0.6, 0], [0.12, 0.68], [0.9, 0.68]], [[0.65, 0.35], [0.65, 1]]] },
  { ch: '0', level: 0, strokes: [arc(0.5, 0.5, 0.34, 0.5, -90, -450, 28)] }, // od góry w lewo
  { ch: '2', level: 1, strokes: [[...arc(0.5, 0.28, 0.32, 0.28, -170, 25, 14), [0.15, 1], [0.85, 1]]] },
  { ch: '3', level: 1, strokes: [[...arc(0.5, 0.25, 0.3, 0.25, -160, 90, 14), ...arc(0.5, 0.75, 0.32, 0.25, -90, 160, 14).slice(1)]] },
  { ch: '5', level: 1, strokes: [[[0.8, 0], [0.27, 0], [0.22, 0.45], ...arc(0.48, 0.68, 0.32, 0.32, -125, 150, 16)]] },
  { ch: '6', level: 2, strokes: [[[0.75, 0.04], [0.45, 0.1], [0.27, 0.32], [0.18, 0.65], ...arc(0.5, 0.72, 0.32, 0.28, 180, -180, 24)]] },
  { ch: '8', level: 2, strokes: [[...arc(0.5, 0.25, 0.27, 0.25, -90, -270, 14), ...arc(0.5, 0.75, 0.32, 0.25, -90, 270, 24).slice(1), ...arc(0.5, 0.25, 0.27, 0.25, 90, -90, 14).slice(1)]] },
  { ch: '9', level: 2, strokes: [[...arc(0.5, 0.3, 0.32, 0.3, 0, -360, 24), [0.8, 1]]] },
] as Glyph[]).map((g) => ({ ...g, item: '', word: '' }));

/** Cyfry do rundy: nowe z poziomu dziecka wymieszane z powtórką niższych. */
export function makeDigitRound(rng: Rng, level: number): Letter[] {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return mixRound(rng, DIGITS.filter((x) => x.level <= l), l, 'digits');
}
