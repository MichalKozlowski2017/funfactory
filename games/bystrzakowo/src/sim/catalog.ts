/**
 * Katalog obiektów: jeden obrazek zasila wszystkie zagadki, do których pasuje (zob. docs/bystrzakowo.md).
 * Grafika: public/art/items/<id>.webp (Flux, styl plastelina; `prompt` = opis obiektu do przegenerowania),
 * nazwa w lektorze: public/audio/<głos>/item-<id>.m4a.
 */
import { lang, type Lang } from './lang.ts';
import { ITEM_NAMES } from './names.ts';

export type Category = 'zwierzeta' | 'owoce' | 'warzywa' | 'pojazdy' | 'zabawki' | 'kuchnia' | 'ubrania' | 'natura';

export type Color = 'czerwony' | 'zolty' | 'zielony' | 'niebieski' | 'pomaranczowy' | 'rozowy' | 'fioletowy' | 'brazowy' | 'bialy';

export interface Item {
  id: string;
  /** Nazwa w mianowniku (lektor czyta ją po trafieniu). */
  name: string;
  category: Category;
  /** Główny kolor (zagadka z kolorami). Brak = obiekt wielobarwny albo kolor niejednoznaczny. */
  color?: Color;
  /** Sylwetka jest charakterystyczna: obiekt może być w zagadce z cieniami. */
  shadow: boolean;
  /** Mały, „policzalny” obiekt do zagadek z liczeniem. */
  countable: boolean;
  /** Opis obiektu dla Fluxa (po angielsku). */
  prompt: string;
  /** Młode zwierzę: id mamy (zagadka „mamy i dzieci”). */
  mother?: string;
  /** Dopełniacz nazwy młodego: „Gdzie jest mama kurczaczka?”. */
  genitive?: string;
}


type Row = [id: string, name: string, color: Color | '', flags: string, prompt: string];

/** Flagi: s = sylwetka do cieni, c = do liczenia. */
function rows(category: Category, list: Row[]): Item[] {
  return list.map(([id, name, color, flags, prompt]) => ({
    id,
    name,
    category,
    ...(color ? { color } : {}),
    shadow: flags.includes('s'),
    countable: flags.includes('c'),
    prompt,
  }));
}

const BABIES: Record<string, [mother: string, genitive: string]> = {
  kurczak: ['kura', 'kurczaczka'],
  cielaczek: ['krowa', 'cielaczka'],
  kotek: ['kot', 'kotka'],
  jagniatko: ['owca', 'jagniątka'],
  prosiaczek: ['swinka', 'prosiaczka'],
  zrebak: ['kon', 'źrebaczka'],
  kaczatko: ['kaczka', 'kaczątka'],
  kijanka: ['zaba', 'kijanki'],
  lisek: ['lis', 'liska'],
  niedzwiadek: ['niedzwiedz', 'niedźwiadka'],
  pingwinek: ['pingwin', 'pingwinka'],
  lwiatko: ['lew', 'lwiątka'],
  kozlatko: ['koza', 'koźlątka'],
  zyrafka: ['zyrafa', 'żyrafki'],
  foczka: ['foka', 'foczki'],
  sowka: ['sowa', 'sówki'],
};

/**
 * Obiekty o podobnej sylwetce albo łatwe do pomylenia przez dziecko. Nie trafiają razem do jednego pytania
 * (cień kotka obok kota byłby nie do rozróżnienia, konik na biegunach obok koni w „co nie pasuje” myli).
 */
const LOOKALIKES: string[][] = [
  ['kot', 'kotek'],
  ['krowa', 'cielaczek'],
  ['owca', 'jagniatko'],
  ['swinka', 'prosiaczek'],
  ['kon', 'zrebak', 'zebra', 'konik', 'osiolek', 'sarna'],
  ['kaczka', 'kaczatko', 'kurczak', 'ges', 'labedz'],
  ['mis', 'niedzwiedz', 'mispolarny'],
  ['owca', 'koza', 'kozlatko', 'jagniatko'],
  ['lis', 'lisek'],
  ['niedzwiedz', 'niedzwiadek', 'mis'],
  ['pingwin', 'pingwinek'],
  ['lew', 'lwiatko'],
  ['zyrafa', 'zyrafka'],
  ['foka', 'foczka', 'mors'],
  ['sowa', 'sowka'],
  ['swinka', 'dzik'],
  ['krolik', 'zajac'],
  ['wieloryb', 'delfin'],
  ['foka', 'mors'],
  ['hulajnoga', 'skuter', 'rower'],
  ['hipopotam', 'nosorozec'],
  ['ogorek', 'groszek'],
  ['auto', 'ciezarowka', 'straz', 'autobus'],
];
export const lookalike = (a: Item, b: Item): boolean => a === b || LOOKALIKES.some((g) => g.includes(a.id) && g.includes(b.id));

export const ITEMS: Item[] = [
  ...rows('zwierzeta', [
    ['kot', 'Kot', 'pomaranczowy', 's', 'a cute cat sitting'],
    ['pies', 'Pies', '', 's', 'a cute puppy dog standing, side view'],
    ['krowa', 'Krowa', '', 's', 'a cute cow standing, side view'],
    ['slon', 'Słoń', '', 's', 'a cute baby elephant standing, side view'],
    ['kurczak', 'Kurczaczek', 'zolty', 'c', 'a tiny cute fluffy yellow baby chick with big friendly black eyes, a small orange beak and little orange feet, standing, front three-quarter view'],
    ['ryba', 'Rybka', 'pomaranczowy', 'sc', 'a cute orange fish, side view'],
    ['zaba', 'Żaba', 'zielony', 's', 'a cute green frog sitting'],
    ['kaczka', 'Kaczka', 'bialy', 'sc', 'a cute adult white farm duck with an orange beak and orange feet, standing tall, side view'],
    ['kura', 'Kura', 'bialy', 's', 'a cute white hen with a red comb standing, side view'],
    ['cielaczek', 'Cielaczek', '', 's', 'a tiny cute newborn baby calf with brown spots, oversized head, short stubby legs, lying down curled up, side view'],
    ['kotek', 'Kotek', '', 's', 'a tiny cute newborn grey baby kitten with an oversized head and big eyes, curled up lying down, side view'],
    ['owca', 'Owca', 'bialy', '', 'a cute fluffy white sheep standing, side view'],
    ['jagniatko', 'Jagniątko', 'bialy', '', 'a tiny cute newborn white baby lamb with an oversized head, big eyes and short wool, lying down with legs folded, side view'],
    ['swinka', 'Świnka', 'rozowy', 's', 'a cute pink pig standing, side view'],
    ['prosiaczek', 'Prosiaczek', 'rozowy', 'sc', 'a tiny cute newborn pink piglet with an oversized head and big eyes, sitting on its bottom, side view'],
    ['kon', 'Koń', 'brazowy', 's', 'a cute brown horse standing, side view'],
    ['zrebak', 'Źrebaczek', 'brazowy', 's', 'a tiny cute newborn brown baby foal with an oversized head and big eyes, lying down with legs folded, side view'],
    ['kaczatko', 'Kaczątko', 'zolty', 'sc', 'a tiny fluffy yellow duckling, side view'],
    ['kijanka', 'Kijanka', '', 'sc', 'a cute dark green tadpole with a long tail, side view'],
    ['lisek', 'Lisek', '', 's', 'a tiny cute newborn orange baby fox cub with an oversized head, big eyes and a small fluffy white-tipped tail, sitting, side view'],
    ['niedzwiadek', 'Niedźwiadek', '', 's', 'a tiny cute newborn brown baby bear cub with an oversized round head, big eyes and small round ears, sitting, side view'],
    ['pingwinek', 'Pingwinek', '', 's', 'a tiny cute fluffy grey baby penguin chick with an oversized head and big eyes, standing, front three-quarter view'],
    ['lwiatko', 'Lwiątko', '', 's', 'a tiny cute newborn baby lion cub without a mane, with an oversized head and big eyes, sitting, side view'],
    ['kozlatko', 'Koźlątko', '', 's', 'a tiny cute newborn white and brown baby goat kid with an oversized head, big eyes and tiny horn buds, standing, side view'],
    ['zyrafka', 'Żyrafka', '', 's', 'a tiny cute newborn baby giraffe with an oversized head, big eyes and a short neck, standing, side view'],
    ['foczka', 'Foczka', '', 's', 'a tiny cute fluffy white baby seal pup with big black eyes, lying on its belly, side view'],
    ['sowka', 'Sówka', '', 's', 'a tiny cute fluffy grey baby owlet with huge round eyes, sitting, front view'],
    ['lew', 'Lew', '', 's', 'a cute lion with a big fluffy mane sitting'],
    ['zyrafa', 'Żyrafa', 'zolty', 's', 'a cute giraffe with a very long neck standing, side view'],
    ['malpa', 'Małpka', 'brazowy', 's', 'a cute brown monkey sitting'],
    ['zebra', 'Zebra', '', 's', 'a cute zebra with black and white stripes standing, side view'],
    ['niedzwiedz', 'Niedźwiedź', 'brazowy', 's', 'a cute big brown bear walking on four legs, side view'],
    ['jez', 'Jeż', '', 'sc', 'a cute hedgehog with spikes, side view'],
    ['wiewiorka', 'Wiewiórka', 'pomaranczowy', 's', 'a cute orange squirrel with a big fluffy tail, side view'],
    ['sowa', 'Sowa', 'brazowy', 's', 'a cute brown owl with big round eyes'],
    ['motyl', 'Motyl', 'niebieski', 'sc', 'a cute blue butterfly with open wings, top view'],
    ['biedronka', 'Biedronka', 'czerwony', 'c', 'a cute red ladybug with black dots, top view'],
    ['pszczola', 'Pszczółka', 'zolty', 'sc', 'a cute yellow and black striped bee with small wings'],
    ['slimak', 'Ślimak', '', 'sc', 'a cute snail with a spiral shell, side view'],
    ['krolik', 'Królik', '', 's', 'a cute grey bunny rabbit with long ears sitting'],
    ['mysz', 'Myszka', '', 'c', 'a cute little grey mouse with round ears, side view'],
    ['pingwin', 'Pingwin', '', 's', 'a cute penguin standing'],
    ['zolw', 'Żółw', 'zielony', 'sc', 'a cute green turtle, side view'],
    ['krab', 'Krab', 'czerwony', 'sc', 'a cute red crab'],
    ['osmiornica', 'Ośmiornica', 'fioletowy', 's', 'a cute purple octopus'],
    ['ptak', 'Ptaszek', 'niebieski', 'c', 'a cute little blue bird, side view'],
    ['dinozaur', 'Dinozaur', 'zielony', 's', 'a cute green dinosaur with a long tail, side view'],
    // Las
    ['lis', 'Lis', 'pomaranczowy', 's', 'a cute orange fox with a white-tipped fluffy tail, standing, side view'],
    ['zajac', 'Zajączek', '', 's', 'a cute brown wild hare with very long ears, sitting, side view'],
    ['dzik', 'Dzik', 'brazowy', 's', 'a cute dark brown wild boar with small tusks, standing, side view'],
    ['sarna', 'Sarenka', 'brazowy', 's', 'a cute young roe deer with white spots, standing, side view'],
    ['dzieciol', 'Dzięcioł', '', 's', 'a cute woodpecker bird with a red cap, black and white wings, clinging to a short piece of brown tree trunk, side view'],
    // Woda
    ['wieloryb', 'Wieloryb', 'niebieski', 's', 'a cute big blue whale with a small water spout, side view'],
    ['delfin', 'Delfin', '', 's', 'a cute grey-blue dolphin jumping, side view'],
    ['meduza', 'Meduza', 'rozowy', 'sc', 'a cute pink jellyfish with wavy tentacles'],
    ['konikmorski', 'Konik morski', 'pomaranczowy', 'sc', 'a cute orange seahorse, side view'],
    // Wieś
    ['koza', 'Koza', 'bialy', 's', 'a cute white goat with small horns and a little beard, standing, side view'],
    ['osiolek', 'Osiołek', '', 's', 'a cute grey donkey with long ears, standing, side view'],
    ['indyk', 'Indyk', '', 's', 'a cute brown turkey with a big round fanned tail, side view'],
    ['ges', 'Gęś', 'bialy', 's', 'a cute white farm goose with an orange beak, standing, side view'],
    // Lód i śnieg
    ['foka', 'Foka', '', 's', 'a cute grey seal lying on its belly, side view'],
    ['mors', 'Mors', 'brazowy', 's', 'a cute brown walrus with two white tusks, side view'],
    ['mispolarny', 'Miś polarny', 'bialy', 's', 'a cute white polar bear standing on four legs, side view'],
    // Afryka
    ['hipopotam', 'Hipopotam', '', 's', 'a cute purple-grey hippopotamus standing, side view'],
    ['nosorozec', 'Nosorożec', '', 's', 'a cute grey rhinoceros with a horn, standing, side view'],
    // Pierwsza litera: więcej obrazków na rzadkie litery.
    ['labedz', 'Łabędź', 'bialy', 's', 'a cute white swan swimming, side view'],
    ['czapla', 'Czapla', '', 's', 'a cute grey heron standing on one leg, side view'],
  ]),
  ...rows('owoce', [
    ['jablko', 'Jabłko', 'czerwony', 'sc', 'a shiny red apple with a leaf'],
    ['banan', 'Banan', 'zolty', 'sc', 'a yellow banana'],
    ['gruszka', 'Gruszka', 'zielony', 'sc', 'a green pear with a leaf'],
    ['truskawka', 'Truskawka', 'czerwony', 'sc', 'a red strawberry with green leaves'],
    ['sliwka', 'Śliwka', 'fioletowy', 'c', 'a purple plum with a small leaf'],
    ['wisnia', 'Wisienki', 'czerwony', 'sc', 'two red cherries on a stem'],
    ['pomarancza', 'Pomarańcza', 'pomaranczowy', 'c', 'a round orange fruit with a leaf'],
    ['cytryna', 'Cytryna', 'zolty', 'c', 'a yellow lemon'],
    ['winogrona', 'Winogrona', 'fioletowy', 's', 'a bunch of purple grapes'],
    ['arbuz', 'Arbuz', '', 's', 'a slice of watermelon with red flesh and green rind'],
    ['ananas', 'Ananas', 'zolty', 's', 'a pineapple with green leaves'],
    ['malina', 'Malina', 'czerwony', 'c', 'a pink raspberry'],
  ]),
  ...rows('warzywa', [
    ['marchewka', 'Marchewka', 'pomaranczowy', 'sc', 'an orange carrot with green leaves'],
    ['pomidor', 'Pomidor', 'czerwony', 'c', 'a red tomato'],
    ['ogorek', 'Ogórek', 'zielony', 'sc', 'a green cucumber'],
    ['ziemniak', 'Ziemniak', 'brazowy', 'c', 'a brown potato'],
    ['kukurydza', 'Kukurydza', 'zolty', 's', 'a yellow corn cob with green husk'],
    ['papryka', 'Papryka', 'czerwony', 'sc', 'a red bell pepper'],
    ['brokul', 'Brokuł', 'zielony', 's', 'a green broccoli'],
    ['dynia', 'Dynia', 'pomaranczowy', 's', 'an orange pumpkin'],
    ['groszek', 'Groszek', 'zielony', 's', 'an open green pea pod with peas'],
    ['rzodkiewka', 'Rzodkiewka', 'rozowy', 'sc', 'a pink radish with green leaves'],
    ['grzyb', 'Grzybek', 'brazowy', 'sc', 'a cute forest mushroom with a brown cap'],
    ['cebula', 'Cebula', '', 'c', 'a golden onion'],
  ]),
  ...rows('pojazdy', [
    ['auto', 'Autko', 'rozowy', 's', 'a small pink toy car'],
    ['rower', 'Rower', '', 's', 'a small bicycle, side view'],
    ['samolot', 'Samolot', '', 's', 'a small toy airplane, side view'],
    ['lodka', 'Łódka', '', 's', 'a small toy sailboat, side view'],
    ['autobus', 'Autobus', 'zolty', 's', 'a yellow toy bus, side view'],
    ['pociag', 'Pociąg', 'czerwony', 's', 'a red toy steam train locomotive, side view'],
    ['traktor', 'Traktor', 'zielony', 's', 'a green toy tractor, side view'],
    ['helikopter', 'Helikopter', 'niebieski', 's', 'a blue toy helicopter, side view'],
    ['rakieta', 'Rakieta', '', 's', 'a toy space rocket'],
    ['hulajnoga', 'Hulajnoga', 'niebieski', 's', 'a blue children kick scooter with two small wheels, a tall handlebar and a flat narrow standing deck, no seat, no motor, no engine, side view'],
    ['skuter', 'Skuter', 'rozowy', 's', 'a pink motor scooter with a seat, side view'],
    ['straz', 'Wóz strażacki', 'czerwony', 's', 'a red toy fire truck with a ladder, side view'],
    ['ciezarowka', 'Ciężarówka', 'niebieski', 's', 'a blue toy truck, side view'],
  ]),
  ...rows('zabawki', [
    ['pilka', 'Piłka', '', 'c', 'a colorful beach ball'],
    ['mis', 'Miś', 'brazowy', 's', 'a teddy bear sitting'],
    ['klocek', 'Klocek', '', 'c', 'a single toy building block cube'],
    ['lalka', 'Lalka', '', 's', 'a cute toy doll in a pink dress'],
    ['latawiec', 'Latawiec', 'niebieski', 's', 'a blue diamond shaped kite with a tail'],
    ['bebenek', 'Bębenek', 'czerwony', 's', 'a small red toy drum with drumsticks'],
    ['konik', 'Konik na biegunach', '', 's', 'a wooden rocking horse toy, side view'],
    ['baczek', 'Bączek', '', 'sc', 'a colorful spinning top toy'],
    ['robot', 'Robot', '', 's', 'a cute toy robot standing'],
    ['balonik', 'Balonik', 'czerwony', 'sc', 'a red balloon on a string'],
    ['trabka', 'Trąbka', 'zolty', 's', 'a yellow toy trumpet'],
    ['wiaderko', 'Wiaderko', 'niebieski', 's', 'a blue sand bucket with a handle'],
    ['sanki', 'Sanki', '', 's', 'an empty small wooden children sled with red runners and nothing on it, side view'],
    ['narty', 'Narty', 'czerwony', 's', 'a pair of red children skis lying side by side, no poles, no person'],
    ['namiot', 'Namiot', 'zielony', 's', 'a small green camping tent, front three-quarter view'],
    ['ukulele', 'Ukulele', '', 's', 'a small wooden ukulele'],
    ['zamek', 'Zamek z piasku', 'zolty', 's', 'a sandcastle with little towers and a small flag'],
    ['lopatka', 'Łopatka', 'czerwony', 's', 'a red plastic toy sand shovel'],
  ]),
  ...rows('kuchnia', [
    ['kubek', 'Kubek', 'niebieski', 's', 'a blue mug'],
    ['talerz', 'Talerz', 'bialy', 'c', 'an empty round white dinner plate, three-quarter top view'],
    ['lyzka', 'Łyżka', '', 'sc', 'a spoon'],
    ['widelec', 'Widelec', '', 'sc', 'a fork'],
    ['garnek', 'Garnek', 'czerwony', 's', 'a red cooking pot with a lid'],
    ['czajnik', 'Czajnik', 'niebieski', 's', 'a blue tea kettle'],
    ['miska', 'Miska', 'zolty', 'c', 'a yellow bowl'],
    ['patelnia', 'Patelnia', '', 's', 'a frying pan with a handle'],
    ['butelka', 'Butelka', '', 'sc', 'a baby milk bottle'],
    ['szklanka', 'Szklanka', 'bialy', 's', 'a plain clear drinking glass filled with white milk, inanimate object, no eyes, no mouth, no arms'],
    ['jajko', 'Jajko', 'bialy', 'c', 'a plain smooth white chicken egg, simple oval eggshell, inanimate object, no eyes, no beak, no feet'],
  ]),
  ...rows('ubrania', [
    ['czapka', 'Czapka', 'czerwony', 's', 'an empty red knitted winter beanie hat with a white pompom, lying on its own'],
    ['szalik', 'Szalik', 'zielony', 's', 'a green striped knitted scarf, neatly folded and lying on its own'],
    ['but', 'Bucik', 'niebieski', 'sc', 'a blue children sneaker shoe, side view'],
    ['skarpetka', 'Skarpetka', 'rozowy', 'sc', 'a pink sock, side view'],
    ['koszulka', 'Koszulka', 'zolty', '', 'a yellow t-shirt'],
    ['spodnie', 'Spodnie', 'niebieski', 's', 'blue trousers'],
    ['sukienka', 'Sukienka', 'fioletowy', '', 'a purple dress'],
    ['rekawiczki', 'Rękawiczki', 'zielony', 's', 'a pair of green mittens'],
    ['kalosze', 'Kalosze', 'zolty', 's', 'a pair of yellow rain boots'],
    ['parasol', 'Parasol', 'czerwony', 's', 'an open red umbrella'],
    ['okulary', 'Okulary', '', 's', 'a pair of colorful children sunglasses, front view'],
    ['kapelusz', 'Kapelusz', 'zolty', 's', 'a yellow straw sun hat with a ribbon'],
    ['sandaly', 'Sandały', '', 's', 'a pair of colorful children summer sandals'],
    ['stroj', 'Strój kąpielowy', '', '', 'a colorful children one-piece swimsuit with polka dots lying flat on its own, empty, no body, no mannequin'],
    ['kurtka', 'Kurtka', 'czerwony', 's', 'a puffy red children winter jacket with a hood'],
  ]),
  ...rows('natura', [
    ['slonce', 'Słońce', 'zolty', 's', 'a smiling yellow sun'],
    ['chmurka', 'Chmurka', 'bialy', 's', 'a fluffy white cloud'],
    ['gwiazdka', 'Gwiazdka', 'zolty', 'sc', 'a yellow five pointed star'],
    ['ksiezyc', 'Księżyc', 'zolty', 's', 'a yellow crescent moon'],
    ['kwiatek', 'Kwiatek', 'rozowy', 'sc', 'a pink flower with green leaves'],
    ['drzewo', 'Drzewo', 'zielony', 's', 'a round green tree'],
    ['lisc', 'Listek', 'zielony', 'c', 'a green leaf'],
    ['tecza', 'Tęcza', '', 's', 'a rainbow with clouds at the ends'],
    ['muszelka', 'Muszelka', 'rozowy', 'sc', 'a pink seashell'],
    ['szyszka', 'Szyszka', 'brazowy', 'sc', 'a brown pine cone'],
    ['ul', 'Ul', 'zolty', 's', 'a yellow wooden beehive box with a few cute bees around it'],
    ['sniezynka', 'Śnieżynka', 'niebieski', 'sc', 'a light blue snowflake'],
  ]),
]
  .map((item) => (BABIES[item.id] ? { ...item, mother: BABIES[item.id]![0], genitive: BABIES[item.id]![1] } : item));

/**
 * Zostawia w katalogu tylko obiekty o podanych id (np. te, których grafika się wczytała).
 * Zmienia tablicę w miejscu, więc wszystkie moduły widzą ten sam, okrojony katalog.
 */
export function keepOnly(ids: ReadonlySet<string>): void {
  for (let i = ITEMS.length - 1; i >= 0; i--) if (!ids.has(ITEMS[i]!.id)) ITEMS.splice(i, 1);
}

export const itemById = (id: string): Item => {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Brak obiektu ${id}`);
  return item;
};

/** Nazwa obiektu w bieżącym języku gry. */
export const nameOf = (item: Item): string => {
  const l = lang();
  return l === 'pl' ? item.name : (ITEM_NAMES[item.id]?.[l] ?? item.name);
};

/**
 * Pierwsza litera nazwy (angielski, niemiecki: zabawa „Co zaczyna się na…?” jest tam o literach).
 * Nazwy zaczynające się dwuznakiem (sh, ch, sch, st…) albo z dwóch słów pomijamy: litera nie brzmi
 * tam jak na początku słowa, więc myliłaby dziecko. Zwraca '' dla pominiętych.
 */
export function firstLetter(name: string, l: Lang): string {
  // Hiszpański: litera z akcentem liczy się jak bez („Árbol” na A).
  const n = (l === 'es' ? name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : name).toLowerCase();
  if (n.includes(' ') || n.includes('-')) return '';
  // Polski: dwuznaki (sz, cz, rz, ch, dz) i zmiękczenia przez „i” (zie-, sie-, nie-, cie-) brzmią inaczej niż sama litera.
  if (l === 'pl') return /^(sz|cz|rz|ch|dz|dź|dż)|^(dzi|ci|si|zi|ni)[aąeęioóuy]/.test(n) ? '' : n[0]!;
  const SKIP = {
    en: ['sh', 'ch', 'th', 'ph', 'wh', 'kn', 'wr', 'gi', 'ge', 'ce', 'ci'],
    de: ['sch', 'ch', 'st', 'sp', 'ph', 'pf', 'qu', 'ei', 'eu', 'au'],
    // „h” jest nieme, „ce/ci” i „ge/gi” brzmią inaczej niż nazwa litery, dwuznaki ch, ll, qu.
    es: ['h', 'ch', 'll', 'qu', 'gu', 'ce', 'ci', 'ge', 'gi'],
  };
  const skip = SKIP[l];
  if (skip.some((d) => n.startsWith(d))) return '';
  return n[0]!;
}

/** Pierwsza litera nazwy obiektu w bieżącym języku (zabawa „Co zaczyna się na literę…?”); '' = obiekt pomijamy. */
export function startOf(item: Item): string {
  return firstLetter(nameOf(item), lang());
}

/** Czy obiekt może mieć buzię na obrazku (zwierzęta, słońce). Przedmioty bez buzi: prompt dostaje „no face”. */
export const hasFace = (item: Item): boolean => item.category === 'zwierzeta' || item.id === 'slonce';

