/**
 * Katalog obiektów: jeden obrazek zasila wszystkie zagadki, do których pasuje (zob. docs/bystrzakowo.md).
 * Grafika: public/art/items/<id>.webp (Flux, styl plastelina; `prompt` = opis obiektu do przegenerowania),
 * nazwa w lektorze: public/audio/<głos>/item-<id>.m4a.
 */
import { lang, type Lang } from './lang.ts';
import { ITEM_NAMES } from './names.ts';

export type Category = 'animals' | 'fruit' | 'vegetables' | 'vehicles' | 'toys' | 'kitchen' | 'clothes' | 'nature';

export type Color = 'red' | 'yellow' | 'green' | 'blue' | 'orange' | 'pink' | 'purple' | 'brown' | 'white';

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
  chick: ['hen', 'kurczaczka'],
  calf: ['cow', 'cielaczka'],
  kitten: ['cat', 'kotka'],
  lamb: ['sheep', 'jagniątka'],
  piglet: ['pig', 'prosiaczka'],
  foal: ['horse', 'źrebaczka'],
  duckling: ['duck', 'kaczątka'],
  tadpole: ['frog', 'kijanki'],
  'fox-cub': ['fox', 'liska'],
  'bear-cub': ['bear', 'niedźwiadka'],
  'penguin-chick': ['penguin', 'pingwinka'],
  'lion-cub': ['lion', 'lwiątka'],
  'kid-goat': ['goat', 'koźlątka'],
  'baby-giraffe': ['giraffe', 'żyrafki'],
  'seal-pup': ['seal', 'foczki'],
  owlet: ['owl', 'sówki'],
  puppy: ['dog', 'szczeniaczka'],
  bunny: ['rabbit', 'króliczka'],
  'elephant-calf': ['elephant', 'słoniątka'],
  'baby-turtle': ['turtle', 'żółwika'],
};

/**
 * Obiekty o podobnej sylwetce albo łatwe do pomylenia przez dziecko. Nie trafiają razem do jednego pytania
 * (cień kotka obok kota byłby nie do rozróżnienia, konik na biegunach obok koni w „co nie pasuje” myli).
 */
const LOOKALIKES: string[][] = [
  ['cat', 'kitten'],
  ['cow', 'calf'],
  ['sheep', 'lamb'],
  ['pig', 'piglet'],
  ['horse', 'foal', 'zebra', 'pony', 'donkey', 'deer'],
  ['duck', 'duckling', 'chick', 'goose', 'swan'],
  ['teddy', 'bear', 'polar-bear'],
  ['sheep', 'goat', 'kid-goat', 'lamb'],
  ['fox', 'fox-cub'],
  ['bear', 'bear-cub', 'teddy'],
  ['penguin', 'penguin-chick'],
  ['lion', 'lion-cub'],
  ['giraffe', 'baby-giraffe'],
  ['seal', 'seal-pup', 'walrus'],
  ['owl', 'owlet'],
  ['pig', 'boar'],
  ['rabbit', 'hare', 'bunny'],
  ['dog', 'puppy'],
  ['elephant', 'elephant-calf'],
  ['turtle', 'baby-turtle'],
  ['whale', 'dolphin'],
  ['seal', 'walrus'],
  ['scooter', 'moped', 'bike'],
  ['hippo', 'rhino'],
  ['cucumber', 'peas'],
  ['car', 'truck', 'fire-station', 'bus'],
];
export const lookalike = (a: Item, b: Item): boolean => a === b || LOOKALIKES.some((g) => g.includes(a.id) && g.includes(b.id));

export const ITEMS: Item[] = [
  ...rows('animals', [
    ['cat', 'Kot', 'orange', 's', 'a cute cat sitting'],
    ['dog', 'Pies', '', 's', 'a cute puppy dog standing, side view'],
    ['cow', 'Krowa', '', 's', 'a cute cow standing, side view'],
    ['elephant', 'Słoń', '', 's', 'a cute baby elephant standing, side view'],
    ['chick', 'Kurczaczek', 'yellow', 'c', 'a tiny cute fluffy yellow baby chick with big friendly black eyes, a small orange beak and little orange feet, standing, front three-quarter view'],
    ['fish', 'Rybka', 'orange', 'sc', 'a cute orange fish, side view'],
    ['frog', 'Żaba', 'green', 's', 'a cute green frog sitting'],
    ['duck', 'Kaczka', 'white', 'sc', 'a cute adult white farm duck with an orange beak and orange feet, standing tall, side view'],
    ['hen', 'Kura', 'white', 's', 'a cute white hen with a red comb standing, side view'],
    ['calf', 'Cielaczek', '', 's', 'a tiny cute newborn baby calf with brown spots, oversized head, short stubby legs, lying down curled up, side view'],
    ['kitten', 'Kotek', '', 's', 'a tiny cute newborn grey baby kitten with an oversized head and big eyes, curled up lying down, side view'],
    ['sheep', 'Owca', 'white', '', 'a cute fluffy white sheep standing, side view'],
    ['lamb', 'Jagniątko', 'white', '', 'a tiny cute newborn white baby lamb with an oversized head, big eyes and short wool, lying down with legs folded, side view'],
    ['pig', 'Świnka', 'pink', 's', 'a cute pink pig standing, side view'],
    ['piglet', 'Prosiaczek', 'pink', 'sc', 'a tiny cute newborn pink piglet with an oversized head and big eyes, sitting on its bottom, side view'],
    ['horse', 'Koń', 'brown', 's', 'a cute brown horse standing, side view'],
    ['foal', 'Źrebaczek', 'brown', 's', 'a tiny cute newborn brown baby foal with an oversized head and big eyes, lying down with legs folded, side view'],
    ['duckling', 'Kaczątko', 'yellow', 'sc', 'a tiny fluffy yellow duckling, side view'],
    ['tadpole', 'Kijanka', '', 'sc', 'a cute dark green tadpole with a long tail, side view'],
    ['fox-cub', 'Lisek', '', 's', 'a tiny cute newborn orange baby fox cub with an oversized head, big eyes and a small fluffy white-tipped tail, sitting, side view'],
    ['bear-cub', 'Niedźwiadek', '', 's', 'a tiny cute newborn brown baby bear cub with an oversized round head, big eyes and small round ears, sitting, side view'],
    ['penguin-chick', 'Pingwinek', '', 's', 'a tiny cute fluffy grey baby penguin chick with an oversized head and big eyes, standing, front three-quarter view'],
    ['lion-cub', 'Lwiątko', '', 's', 'a tiny cute newborn baby lion cub without a mane, with an oversized head and big eyes, sitting, side view'],
    ['kid-goat', 'Koźlątko', '', 's', 'a tiny cute newborn white and brown baby goat kid with an oversized head, big eyes and tiny horn buds, standing, side view'],
    ['baby-giraffe', 'Żyrafka', '', 's', 'a tiny cute newborn baby giraffe with an oversized head, big eyes and a short neck, standing, side view'],
    ['seal-pup', 'Foczka', '', 's', 'a tiny cute fluffy white baby seal pup with big black eyes, lying on its belly, side view'],
    ['owlet', 'Sówka', '', 's', 'a tiny cute fluffy grey baby owlet with huge round eyes, sitting, front view'],
    // Mamy: kolejne młode (mamy są już w katalogu), wyraźnie maleńkie, żeby nie mylić z dorosłym.
    ['puppy', 'Szczeniaczek', '', 's', 'a tiny fluffy beige newborn puppy with floppy ears and a round chubby body, sitting, side view'],
    ['bunny', 'Króliczek', '', 's', 'a tiny round fluffy grey baby bunny with short ears, curled up small, side view'],
    ['elephant-calf', 'Słoniątko', '', 's', 'a tiny round baby elephant calf with a short trunk and big ears, small and chubby, side view'],
    ['baby-turtle', 'Żółwik', '', 's', 'a tiny cute green baby turtle hatching from a cracked white egg'],
    ['lion', 'Lew', '', 's', 'a cute lion with a big fluffy mane sitting'],
    ['giraffe', 'Żyrafa', 'yellow', 's', 'a cute giraffe with a very long neck standing, side view'],
    ['monkey', 'Małpka', 'brown', 's', 'a cute brown monkey sitting'],
    ['zebra', 'Zebra', '', 's', 'a cute zebra with black and white stripes standing, side view'],
    ['bear', 'Niedźwiedź', 'brown', 's', 'a cute big brown bear walking on four legs, side view'],
    ['hedgehog', 'Jeż', '', 'sc', 'a cute hedgehog with spikes, side view'],
    ['squirrel', 'Wiewiórka', 'orange', 's', 'a cute orange squirrel with a big fluffy tail, side view'],
    ['owl', 'Sowa', 'brown', 's', 'a cute brown owl with big round eyes'],
    ['butterfly', 'Motyl', 'blue', 'sc', 'a cute blue butterfly with open wings, top view'],
    ['ladybug', 'Biedronka', 'red', 'c', 'a cute red ladybug with black dots, top view'],
    ['bee', 'Pszczółka', 'yellow', 'sc', 'a cute yellow and black striped bee with small wings'],
    ['snail', 'Ślimak', '', 'sc', 'a cute snail with a spiral shell, side view'],
    ['rabbit', 'Królik', '', 's', 'a cute grey bunny rabbit with long ears sitting'],
    ['mouse', 'Myszka', '', 'c', 'a cute little grey mouse with round ears, side view'],
    ['penguin', 'Pingwin', '', 's', 'a cute penguin standing'],
    ['turtle', 'Żółw', 'green', 'sc', 'a cute green turtle, side view'],
    ['crab', 'Krab', 'red', 'sc', 'a cute red crab'],
    ['octopus', 'Ośmiornica', 'purple', 's', 'a cute purple octopus'],
    ['bird', 'Ptaszek', 'blue', 'c', 'a cute little blue bird, side view'],
    ['dinosaur', 'Dinozaur', 'green', 's', 'a cute green dinosaur with a long tail, side view'],
    // Las
    ['fox', 'Lis', 'orange', 's', 'a cute orange fox with a white-tipped fluffy tail, standing, side view'],
    ['hare', 'Zajączek', '', 's', 'a cute brown wild hare with very long ears, sitting, side view'],
    ['boar', 'Dzik', 'brown', 's', 'a cute dark brown wild boar with small tusks, standing, side view'],
    ['deer', 'Sarenka', 'brown', 's', 'a cute young roe deer with white spots, standing, side view'],
    ['woodpecker', 'Dzięcioł', '', 's', 'a cute woodpecker bird with a red cap, black and white wings, clinging to a short piece of brown tree trunk, side view'],
    // Woda
    ['whale', 'Wieloryb', 'blue', 's', 'a cute big blue whale with a small water spout, side view'],
    ['dolphin', 'Delfin', '', 's', 'a cute grey-blue dolphin jumping, side view'],
    ['jellyfish', 'Meduza', 'pink', 'sc', 'a cute pink jellyfish with wavy tentacles'],
    ['seahorse', 'Konik morski', 'orange', 'sc', 'a cute orange seahorse, side view'],
    // Wieś
    ['goat', 'Koza', 'white', 's', 'a cute white goat with small horns and a little beard, standing, side view'],
    ['donkey', 'Osiołek', '', 's', 'a cute grey donkey with long ears, standing, side view'],
    ['turkey', 'Indyk', '', 's', 'a cute brown turkey with a big round fanned tail, side view'],
    ['goose', 'Gęś', 'white', 's', 'a cute white farm goose with an orange beak, standing, side view'],
    // Lód i śnieg
    ['seal', 'Foka', '', 's', 'a cute grey seal lying on its belly, side view'],
    ['walrus', 'Mors', 'brown', 's', 'a cute brown walrus with two white tusks, side view'],
    ['polar-bear', 'Miś polarny', 'white', 's', 'a cute white polar bear standing on four legs, side view'],
    // Afryka
    ['hippo', 'Hipopotam', '', 's', 'a cute purple-grey hippopotamus standing, side view'],
    ['rhino', 'Nosorożec', '', 's', 'a cute grey rhinoceros with a horn, standing, side view'],
    // Pierwsza litera: więcej obrazków na rzadkie litery.
    ['swan', 'Łabędź', 'white', 's', 'a cute white swan swimming, side view'],
    ['heron', 'Czapla', '', 's', 'a cute grey heron standing on one leg, side view'],
  ]),
  ...rows('fruit', [
    ['apple', 'Jabłko', 'red', 'sc', 'a shiny red apple with a leaf'],
    ['banana', 'Banan', 'yellow', 'sc', 'a yellow banana'],
    ['pear', 'Gruszka', 'green', 'sc', 'a green pear with a leaf'],
    ['strawberry', 'Truskawka', 'red', 'sc', 'a red strawberry with green leaves'],
    ['plum', 'Śliwka', 'purple', 'c', 'a purple plum with a small leaf'],
    ['cherry', 'Wisienki', 'red', 'sc', 'two red cherries on a stem'],
    ['orange-fruit', 'Pomarańcza', 'orange', 'c', 'a round orange fruit with a leaf'],
    ['lemon', 'Cytryna', 'yellow', 'c', 'a yellow lemon'],
    ['grapes', 'Winogrona', 'purple', 's', 'a bunch of purple grapes'],
    ['watermelon', 'Arbuz', '', 's', 'a slice of watermelon with red flesh and green rind'],
    ['pineapple', 'Ananas', 'yellow', 's', 'a pineapple with green leaves'],
    ['raspberry', 'Malina', 'red', 'c', 'a pink raspberry'],
  ]),
  ...rows('vegetables', [
    ['carrot', 'Marchewka', 'orange', 'sc', 'an orange carrot with green leaves'],
    ['tomato', 'Pomidor', 'red', 'c', 'a red tomato'],
    ['cucumber', 'Ogórek', 'green', 'sc', 'a green cucumber'],
    ['potato', 'Ziemniak', 'brown', 'c', 'a brown potato'],
    ['corn', 'Kukurydza', 'yellow', 's', 'a yellow corn cob with green husk'],
    ['pepper', 'Papryka', 'red', 'sc', 'a red bell pepper'],
    ['broccoli', 'Brokuł', 'green', 's', 'a green broccoli'],
    ['pumpkin', 'Dynia', 'orange', 's', 'an orange pumpkin'],
    ['peas', 'Groszek', 'green', 's', 'an open green pea pod with peas'],
    ['radish', 'Rzodkiewka', 'pink', 'sc', 'a pink radish with green leaves'],
    ['mushroom', 'Grzybek', 'brown', 'sc', 'a cute forest mushroom with a brown cap'],
    ['onion', 'Cebula', '', 'c', 'a golden onion'],
  ]),
  ...rows('vehicles', [
    ['car', 'Autko', 'pink', 's', 'a small pink toy car'],
    ['bike', 'Rower', '', 's', 'a small bicycle, side view'],
    ['airplane', 'Samolot', '', 's', 'a small toy airplane, side view'],
    ['boat', 'Łódka', '', 's', 'a small toy sailboat, side view'],
    ['bus', 'Autobus', 'yellow', 's', 'a yellow toy bus, side view'],
    ['train', 'Pociąg', 'red', 's', 'a red toy steam train locomotive, side view'],
    ['tractor', 'Traktor', 'green', 's', 'a green toy tractor, side view'],
    ['helicopter', 'Helikopter', 'blue', 's', 'a blue toy helicopter, side view'],
    ['rocket', 'Rakieta', '', 's', 'a toy space rocket'],
    ['scooter', 'Hulajnoga', 'blue', 's', 'a blue children kick scooter with two small wheels, a tall handlebar and a flat narrow standing deck, no seat, no motor, no engine, side view'],
    ['moped', 'Skuter', 'pink', 's', 'a pink motor scooter with a seat, side view'],
    ['fire-station', 'Wóz strażacki', 'red', 's', 'a red toy fire truck with a ladder, side view'],
    ['truck', 'Ciężarówka', 'blue', 's', 'a blue toy truck, side view'],
  ]),
  ...rows('toys', [
    ['ball', 'Piłka', '', 'c', 'a colorful beach ball'],
    ['teddy', 'Miś', 'brown', 's', 'a teddy bear sitting'],
    ['block', 'Klocek', '', 'c', 'a single toy building block cube'],
    ['lalka', 'Lalka', '', 's', 'a cute toy doll in a pink dress'],
    ['kite', 'Latawiec', 'blue', 's', 'a blue diamond shaped kite with a tail'],
    ['drum', 'Bębenek', 'red', 's', 'a small red toy drum with drumsticks'],
    ['pony', 'Konik na biegunach', '', 's', 'a wooden rocking horse toy, side view'],
    ['spinning-top', 'Bączek', '', 'sc', 'a colorful spinning top toy'],
    ['robot', 'Robot', '', 's', 'a cute boxy toy robot with a square metal head, a small antenna, round button eyes and little claw hands, gray and red, standing, clearly a machine'], // poprzedni wyglądał jak astronauta
    ['small-balloon', 'Balonik', 'red', 'sc', 'a red balloon on a string'],
    ['trumpet', 'Trąbka', 'yellow', 's', 'a yellow toy trumpet'],
    ['bucket', 'Wiaderko', 'blue', 's', 'a blue sand bucket with a handle'],
    ['sled', 'Sanki', '', 's', 'an empty small wooden children sled with red runners and nothing on it, side view'],
    ['skis', 'Narty', 'red', 's', 'a pair of red children skis lying side by side, no poles, no person'],
    ['tent', 'Namiot', 'green', 's', 'a small green camping tent, front three-quarter view'],
    ['ukulele', 'Gitarka', '', 's', 'a small wooden ukulele'], // dziecko nazwie to gitarą, nie ukulele (test agentem)
    ['castle', 'Zamek z piasku', 'yellow', 's', 'a sandcastle with little towers and a small flag'],
    ['spade', 'Łopatka', 'red', 's', 'a red plastic toy sand shovel'],
  ]),
  ...rows('kitchen', [
    ['mug', 'Kubek', 'blue', 's', 'a blue mug'],
    ['plate', 'Talerz', 'white', 'c', 'an empty round white dinner plate, three-quarter top view'],
    ['spoon', 'Łyżka', '', 'sc', 'a spoon'],
    ['fork', 'Widelec', '', 'sc', 'a fork'],
    ['pot', 'Garnek', 'red', 's', 'a red cooking pot with a lid'],
    ['kettle', 'Czajnik', 'blue', 's', 'a blue tea kettle'],
    ['bowl', 'Miska', 'yellow', 'c', 'a yellow bowl'],
    ['pan', 'Patelnia', '', 's', 'a frying pan with a handle'],
    ['bottle', 'Butelka', '', 'sc', 'a baby milk bottle'],
    ['glass', 'Szklanka', 'white', 's', 'a plain clear drinking glass filled with white milk, inanimate object, no eyes, no mouth, no arms'],
    ['egg', 'Jajko', 'white', 'c', 'a plain smooth white chicken egg, simple oval eggshell, inanimate object, no eyes, no beak, no feet'],
  ]),
  ...rows('clothes', [
    ['hat', 'Czapka', 'red', 's', 'an empty red knitted winter beanie hat with a white pompom, lying on its own'],
    ['scarf', 'Szalik', 'green', 's', 'a green striped knitted scarf, neatly folded and lying on its own'],
    ['shoe', 'Bucik', 'blue', 'sc', 'a blue children sneaker shoe, side view'],
    ['sock', 'Skarpetka', 'pink', 'sc', 'a pink sock, side view'],
    ['t-shirt', 'Koszulka', 'yellow', '', 'a yellow t-shirt'],
    ['trousers', 'Spodnie', 'blue', 's', 'blue trousers'],
    ['dress', 'Sukienka', 'purple', '', 'a purple dress'],
    ['mittens', 'Rękawiczki', 'green', 's', 'a pair of green mittens'],
    ['rain-boots', 'Kalosze', 'yellow', 's', 'a pair of yellow rain boots'],
    ['umbrella', 'Parasol', 'red', 's', 'an open red umbrella'],
    ['glasses', 'Okulary', '', 's', 'a pair of colorful children sunglasses, front view'],
    ['sun-hat', 'Kapelusz', 'yellow', 's', 'a yellow straw sun hat with a ribbon'],
    ['sandals', 'Sandały', '', 's', 'a pair of colorful children summer sandals'],
    ['outfit', 'Strój kąpielowy', '', '', 'a colorful children one-piece swimsuit with polka dots lying flat on its own, empty, no body, no mannequin'],
    ['jacket', 'Kurtka', 'red', 's', 'a puffy red children winter jacket with a hood'],
  ]),
  ...rows('nature', [
    ['sun', 'Słońce', 'yellow', 's', 'a smiling yellow sun'],
    ['cloud', 'Chmurka', 'white', 's', 'a fluffy white cloud'],
    ['little-star', 'Gwiazdka', 'yellow', 'sc', 'a yellow five pointed star'],
    ['moon', 'Księżyc', 'yellow', 's', 'a yellow crescent moon'],
    ['little-flower', 'Kwiatek', 'pink', 'sc', 'a pink flower with green leaves'],
    ['tree', 'Drzewo', 'green', 's', 'a round green tree'],
    ['leaf', 'Listek', 'green', 'c', 'a green leaf'],
    ['rainbow', 'Tęcza', '', 's', 'a rainbow with clouds at the ends'],
    ['shell', 'Muszelka', 'pink', 'sc', 'a pink seashell'],
    ['pine-cone', 'Szyszka', 'brown', 'sc', 'a brown pine cone'],
    ['beehive', 'Ul', 'yellow', 's', 'a yellow wooden beehive box with a few cute bees around it'],
    ['snowflake', 'Śnieżynka', 'blue', 'sc', 'a light blue snowflake'],
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
export const hasFace = (item: Item): boolean => item.category === 'animals' || item.id === 'sun';

