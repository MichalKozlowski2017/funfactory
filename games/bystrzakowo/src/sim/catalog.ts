/**
 * Item catalog: one picture feeds every puzzle it fits (see docs/bystrzakowo.md).
 * Image: public/art/items/<id>.webp (Flux, plasticine style; `prompt` = item description for regenerating it),
 * narrator name: public/audio/<voice>/item-<id>.m4a.
 */
import { lang, type Lang } from './lang.ts';
import { ITEM_NAMES, PL_GENITIVE } from './locales/items.ts';

export type Category = 'animals' | 'fruit' | 'vegetables' | 'vehicles' | 'toys' | 'kitchen' | 'clothes' | 'nature';

export type Color = 'red' | 'yellow' | 'green' | 'blue' | 'orange' | 'pink' | 'purple' | 'brown' | 'white';

export interface Item {
  id: string;
  /** Name in the nominative (the narrator reads it after a correct answer). */
  name: string;
  category: Category;
  /** Main colour (colours puzzle). Missing = multicoloured item or ambiguous colour. */
  color?: Color;
  /** Distinctive silhouette: the item can appear in the shadows puzzle. */
  shadow: boolean;
  /** Small, "countable" item for counting puzzles. */
  countable: boolean;
  /** Item description for Flux (in English). */
  prompt: string;
  /** Baby animal: the mother's id ("mothers and babies" puzzle). */
  mother?: string;
  /** Genitive of the baby's name (Polish "Where is the chick's mum?" line). */
  genitive?: string;
}


type Row = [id: string, color: Color | '', flags: string, prompt: string];

/** Flags: s = silhouette for shadows, c = for counting. */
function rows(category: Category, list: Row[]): Item[] {
  return list.map(([id, color, flags, prompt]) => ({
    id,
    name: ITEM_NAMES[id]!.pl,
    category,
    ...(color ? { color } : {}),
    shadow: flags.includes('s'),
    countable: flags.includes('c'),
    prompt,
  }));
}

const BABIES: Record<string, string> = {
  chick: 'hen',
  calf: 'cow',
  kitten: 'cat',
  lamb: 'sheep',
  piglet: 'pig',
  foal: 'horse',
  duckling: 'duck',
  tadpole: 'frog',
  'fox-cub': 'fox',
  'bear-cub': 'bear',
  'penguin-chick': 'penguin',
  'lion-cub': 'lion',
  'kid-goat': 'goat',
  'baby-giraffe': 'giraffe',
  'seal-pup': 'seal',
  owlet: 'owl',
  puppy: 'dog',
  bunny: 'rabbit',
  'elephant-calf': 'elephant',
  'baby-turtle': 'turtle',
};

/**
 * Items with a similar silhouette or easy for a child to confuse. They never appear together in one question
 * (a kitten's shadow next to a cat's would be indistinguishable, a rocking horse next to horses in "odd one out" is confusing).
 */
const LOOKALIKES: string[][] = [
  ['cat', 'kitten'],
  ['cow', 'calf'],
  ['sheep', 'lamb'],
  ['pig', 'piglet'],
  ['horse', 'foal', 'zebra', 'pony', 'donkey', 'deer'],
  ['duck', 'chick', 'goose', 'swan'],
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
    ['cat', 'orange', 's', 'a cute cat sitting'],
    ['dog', '', 's', 'a cute puppy dog standing, side view'],
    ['cow', '', 's', 'a cute cow standing, side view'],
    ['elephant', '', 's', 'a cute baby elephant standing, side view'],
    ['chick', 'yellow', 'c', 'a tiny cute fluffy yellow baby chick with big friendly black eyes, a small orange beak and little orange feet, standing, front three-quarter view'],
    ['fish', 'orange', 'sc', 'a cute orange fish, side view'],
    ['frog', 'green', 's', 'a cute green frog sitting'],
    ['duck', 'white', 'sc', 'a cute adult white farm duck with an orange beak and orange feet, standing tall, side view'],
    ['hen', 'white', 's', 'a cute white hen with a red comb standing, side view'],
    ['calf', '', 's', 'a tiny cute newborn baby calf with brown spots, oversized head, short stubby legs, lying down curled up, side view'],
    ['kitten', '', 's', 'a tiny cute newborn grey baby kitten with an oversized head and big eyes, curled up lying down, side view'],
    ['sheep', 'white', '', 'a cute fluffy white sheep standing, side view'],
    ['lamb', 'white', '', 'a tiny cute newborn white baby lamb with an oversized head, big eyes and short wool, lying down with legs folded, side view'],
    ['pig', 'pink', 's', 'a cute pink pig standing, side view'],
    ['piglet', 'pink', 'sc', 'a tiny cute newborn pink piglet with an oversized head and big eyes, sitting on its bottom, side view'],
    ['horse', 'brown', 's', 'a cute brown horse standing, side view'],
    ['foal', 'brown', 's', 'a tiny cute newborn brown baby foal with an oversized head and big eyes, lying down with legs folded, side view'],
    ['duckling', 'yellow', 'sc', 'a tiny fluffy yellow duckling, side view'],
    ['tadpole', '', 'sc', 'a cute dark green tadpole with a long tail, side view'],
    ['fox-cub', '', 's', 'a tiny cute newborn orange baby fox cub with an oversized head, big eyes and a small fluffy white-tipped tail, sitting, side view'],
    ['bear-cub', '', 's', 'a tiny cute newborn brown baby bear cub with an oversized round head, big eyes and small round ears, sitting, side view'],
    ['penguin-chick', '', 's', 'a tiny cute fluffy grey baby penguin chick with an oversized head and big eyes, standing, front three-quarter view'],
    ['lion-cub', '', 's', 'a tiny cute newborn baby lion cub without a mane, with an oversized head and big eyes, sitting, side view'],
    ['kid-goat', '', 's', 'a tiny cute newborn white and brown baby goat kid with an oversized head, big eyes and tiny horn buds, standing, side view'],
    ['baby-giraffe', '', 's', 'a tiny cute newborn baby giraffe with an oversized head, big eyes and a short neck, standing, side view'],
    ['seal-pup', '', 's', 'a tiny cute fluffy white baby seal pup with big black eyes, lying on its belly, side view'],
    ['owlet', '', 's', 'a tiny cute fluffy grey baby owlet with huge round eyes, sitting, front view'],
    // Mothers: more babies (the mothers are already in the catalog), clearly tiny so they aren't mistaken for adults.
    ['puppy', '', 's', 'a tiny fluffy beige newborn puppy with floppy ears and a round chubby body, sitting, side view'],
    ['bunny', '', 's', 'a tiny round fluffy grey baby bunny with short ears, curled up small, side view'],
    ['elephant-calf', '', 's', 'a tiny round baby elephant calf with a short trunk and big ears, small and chubby, side view'],
    ['baby-turtle', '', 's', 'a tiny cute green baby turtle hatching from a cracked white egg'],
    ['lion', '', 's', 'a cute lion with a big fluffy mane sitting'],
    ['giraffe', 'yellow', 's', 'a cute giraffe with a very long neck standing, side view'],
    ['monkey', 'brown', 's', 'a cute brown monkey sitting'],
    ['zebra', '', 's', 'a cute zebra with black and white stripes standing, side view'],
    ['bear', 'brown', 's', 'a cute big brown bear walking on four legs, side view'],
    ['hedgehog', '', 'sc', 'a cute hedgehog with spikes, side view'],
    ['squirrel', 'orange', 's', 'a cute orange squirrel with a big fluffy tail, side view'],
    ['owl', 'brown', 's', 'a cute brown owl with big round eyes'],
    ['butterfly', 'blue', 'sc', 'a cute blue butterfly with open wings, top view'],
    ['ladybug', 'red', 'c', 'a cute red ladybug with black dots, top view'],
    ['bee', 'yellow', 'sc', 'a cute yellow and black striped bee with small wings'],
    ['snail', '', 'sc', 'a cute snail with a spiral shell, side view'],
    ['rabbit', '', 's', 'a cute grey bunny rabbit with long ears sitting'],
    ['mouse', '', 'c', 'a cute little grey mouse with round ears, side view'],
    ['penguin', '', 's', 'a cute penguin standing'],
    ['turtle', 'green', 'sc', 'a cute green turtle, side view'],
    ['crab', 'red', 'sc', 'a cute red crab'],
    ['octopus', 'purple', 's', 'a cute purple octopus'],
    ['bird', 'blue', 'c', 'a cute little blue bird, side view'],
    ['dinosaur', 'green', 's', 'a cute green dinosaur with a long tail, side view'],
    // Forest
    ['fox', 'orange', 's', 'a cute orange fox with a white-tipped fluffy tail, standing, side view'],
    ['hare', '', 's', 'a cute brown wild hare with very long ears, sitting, side view'],
    ['boar', 'brown', 's', 'a cute dark brown wild boar with small tusks, standing, side view'],
    ['deer', 'brown', 's', 'a cute young roe deer with white spots, standing, side view'],
    ['woodpecker', '', 's', 'a cute woodpecker bird with a red cap, black and white wings, clinging to a short piece of brown tree trunk, side view'],
    // Water
    ['whale', 'blue', 's', 'a cute big blue whale with a small water spout, side view'],
    ['dolphin', '', 's', 'a cute grey-blue dolphin jumping, side view'],
    ['jellyfish', 'pink', 'sc', 'a cute pink jellyfish with wavy tentacles'],
    ['seahorse', 'orange', 'sc', 'a cute orange seahorse, side view'],
    // Farm
    ['goat', 'white', 's', 'a cute white goat with small horns and a little beard, standing, side view'],
    ['donkey', '', 's', 'a cute grey donkey with long ears, standing, side view'],
    ['turkey', '', 's', 'a cute brown turkey with a big round fanned tail, side view'],
    ['goose', 'white', 's', 'a cute white farm goose with an orange beak, standing, side view'],
    // Ice and snow
    ['seal', '', 's', 'a cute grey seal lying on its belly, side view'],
    ['walrus', 'brown', 's', 'a cute brown walrus with two white tusks, side view'],
    ['polar-bear', 'white', 's', 'a cute white polar bear standing on four legs, side view'],
    // Africa
    ['hippo', '', 's', 'a cute purple-grey hippopotamus standing, side view'],
    ['rhino', '', 's', 'a cute grey rhinoceros with a horn, standing, side view'],
    // First letter: more pictures for rare letters.
    ['swan', 'white', 's', 'a cute white swan swimming, side view'],
    ['heron', '', 's', 'a cute grey heron standing on one leg, side view'],
  ]),
  ...rows('fruit', [
    ['apple', 'red', 'sc', 'a shiny red apple with a leaf'],
    ['banana', 'yellow', 'sc', 'a yellow banana'],
    ['pear', 'green', 'sc', 'a green pear with a leaf'],
    ['strawberry', 'red', 'sc', 'a red strawberry with green leaves'],
    ['plum', 'purple', 'c', 'a purple plum with a small leaf'],
    ['cherry', 'red', 'sc', 'two red cherries on a stem'],
    ['orange-fruit', 'orange', 'c', 'a round orange fruit with a leaf'],
    ['lemon', 'yellow', 'c', 'a yellow lemon'],
    ['grapes', 'purple', 's', 'a bunch of purple grapes'],
    ['watermelon', '', 's', 'a slice of watermelon with red flesh and green rind'],
    ['pineapple', 'yellow', 's', 'a pineapple with green leaves'],
    ['raspberry', 'red', 'c', 'a pink raspberry'],
  ]),
  ...rows('vegetables', [
    ['carrot', 'orange', 'sc', 'an orange carrot with green leaves'],
    ['tomato', 'red', 'c', 'a red tomato'],
    ['cucumber', 'green', 'sc', 'a green cucumber'],
    ['potato', 'brown', 'c', 'a brown potato'],
    ['corn', 'yellow', 's', 'a yellow corn cob with green husk'],
    ['pepper', 'red', 'sc', 'a red bell pepper'],
    ['broccoli', 'green', 's', 'a green broccoli'],
    ['pumpkin', 'orange', 's', 'an orange pumpkin'],
    ['peas', 'green', 's', 'an open green pea pod with peas'],
    ['radish', 'pink', 'sc', 'a pink radish with green leaves'],
    ['mushroom', 'brown', 'sc', 'a cute forest mushroom with a brown cap'],
    ['onion', '', 'c', 'a golden onion'],
  ]),
  ...rows('vehicles', [
    ['car', 'pink', 's', 'a small pink toy car'],
    ['bike', '', 's', 'a small bicycle, side view'],
    ['airplane', '', 's', 'a small toy airplane, side view'],
    ['boat', '', 's', 'a small toy sailboat, side view'],
    ['bus', 'yellow', 's', 'a yellow toy bus, side view'],
    ['train', 'red', 's', 'a red toy steam train locomotive, side view'],
    ['tractor', 'green', 's', 'a green toy tractor, side view'],
    ['helicopter', 'blue', 's', 'a blue toy helicopter, side view'],
    ['rocket', '', 's', 'a toy space rocket'],
    ['scooter', 'blue', 's', 'a blue children kick scooter with two small wheels, a tall handlebar and a flat narrow standing deck, no seat, no motor, no engine, side view'],
    ['moped', 'pink', 's', 'a pink motor scooter with a seat, side view'],
    ['fire-station', 'red', 's', 'a red toy fire truck with a ladder, side view'],
    ['truck', 'blue', 's', 'a blue toy truck, side view'],
  ]),
  ...rows('toys', [
    ['ball', '', 'c', 'a colorful beach ball'],
    ['teddy', 'brown', 's', 'a teddy bear sitting'],
    ['block', '', 'c', 'a single toy building block cube'],
    ['doll', '', 's', 'a cute toy doll in a pink dress'],
    ['kite', 'blue', 's', 'a blue diamond shaped kite with a tail'],
    ['drum', 'red', 's', 'a small red toy drum with drumsticks'],
    ['pony', '', 's', 'a wooden rocking horse toy, side view'],
    ['spinning-top', '', 'sc', 'a colorful spinning top toy'],
    ['robot', '', 's', 'a cute boxy toy robot with a square metal head, a small antenna, round button eyes and little claw hands, gray and red, standing, clearly a machine'], // the previous one looked like an astronaut
    ['small-balloon', 'red', 'sc', 'a red balloon on a string'],
    ['trumpet', 'yellow', 's', 'a yellow toy trumpet'],
    ['bucket', 'blue', 's', 'a blue sand bucket with a handle'],
    ['sled', '', 's', 'an empty small wooden children sled with red runners and nothing on it, side view'],
    ['skis', 'red', 's', 'a pair of red children skis lying side by side, no poles, no person'],
    ['tent', 'green', 's', 'a small green camping tent, front three-quarter view'],
    ['ukulele', '', 's', 'a small wooden ukulele'], // a child would call it a guitar, not a ukulele (agent test)
    ['castle', 'yellow', 's', 'a sandcastle with little towers and a small flag'],
    ['spade', 'red', 's', 'a red plastic toy sand shovel'],
  ]),
  ...rows('kitchen', [
    ['mug', 'blue', 's', 'a blue mug'],
    ['plate', 'white', 'c', 'an empty round white dinner plate, three-quarter top view'],
    ['spoon', '', 'sc', 'a spoon'],
    ['fork', '', 'sc', 'a fork'],
    ['pot', 'red', 's', 'a red cooking pot with a lid'],
    ['kettle', 'blue', 's', 'a blue tea kettle'],
    ['bowl', 'yellow', 'c', 'a yellow bowl'],
    ['pan', '', 's', 'a frying pan with a handle'],
    ['bottle', '', 'sc', 'a baby milk bottle'],
    ['glass', 'white', 's', 'a plain clear drinking glass filled with white milk, inanimate object, no eyes, no mouth, no arms'],
    ['egg', 'white', 'c', 'a plain smooth white chicken egg, simple oval eggshell, inanimate object, no eyes, no beak, no feet'],
  ]),
  ...rows('clothes', [
    ['hat', 'red', 's', 'an empty red knitted winter beanie hat with a white pompom, lying on its own'],
    ['scarf', 'green', 's', 'a green striped knitted scarf, neatly folded and lying on its own'],
    ['shoe', 'blue', 'sc', 'a blue children sneaker shoe, side view'],
    ['sock', 'pink', 'sc', 'a pink sock, side view'],
    ['t-shirt', 'yellow', '', 'a yellow t-shirt'],
    ['trousers', 'blue', 's', 'blue trousers'],
    ['dress', 'purple', '', 'a purple dress'],
    ['mittens', 'green', 's', 'a pair of green mittens'],
    ['rain-boots', 'yellow', 's', 'a pair of yellow rain boots'],
    ['umbrella', 'red', 's', 'an open red umbrella'],
    ['glasses', '', 's', 'a pair of colorful children sunglasses, front view'],
    ['sun-hat', 'yellow', 's', 'a yellow straw sun hat with a ribbon'],
    ['sandals', '', 's', 'a pair of colorful children summer sandals'],
    ['outfit', '', '', 'a colorful children one-piece swimsuit with polka dots lying flat on its own, empty, no body, no mannequin'],
    ['jacket', 'red', 's', 'a puffy red children winter jacket with a hood'],
  ]),
  ...rows('nature', [
    ['sun', 'yellow', 's', 'a smiling yellow sun'],
    ['cloud', 'white', 's', 'a fluffy white cloud'],
    ['little-star', 'yellow', 'sc', 'a yellow five pointed star'],
    ['moon', 'yellow', 's', 'a yellow crescent moon'],
    ['little-flower', 'pink', 'sc', 'a pink flower with green leaves'],
    ['tree', 'green', 's', 'a round green tree'],
    ['leaf', 'green', 'c', 'a green leaf'],
    ['rainbow', '', 's', 'a rainbow with clouds at the ends'],
    ['shell', 'pink', 'sc', 'a pink seashell'],
    ['pine-cone', 'brown', 'sc', 'a brown pine cone'],
    ['beehive', 'yellow', 's', 'a yellow wooden beehive box with a few cute bees around it'],
    ['snowflake', 'blue', 'sc', 'a light blue snowflake'],
  ]),
]
  .map((item) => (BABIES[item.id] ? { ...item, mother: BABIES[item.id]!, genitive: PL_GENITIVE[item.id] } : item));

/**
 * Keeps only the items with the given ids in the catalog (e.g. those whose image loaded).
 * Mutates the array in place, so every module sees the same trimmed catalog.
 */
export function keepOnly(ids: ReadonlySet<string>): void {
  for (let i = ITEMS.length - 1; i >= 0; i--) if (!ids.has(ITEMS[i]!.id)) ITEMS.splice(i, 1);
}

export const itemById = (id: string): Item => {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return item;
};

/** Item name in the current game language. */
export const nameOf = (item: Item): string => {
  const l = lang();
  return l === 'pl' ? item.name : (ITEM_NAMES[item.id]?.[l] ?? item.name);
};

/**
 * First letter of a name (English, German: the "What starts with…?" activity is about letters there).
 * Names starting with a digraph (sh, ch, sch, st…) or made of two words are skipped: the letter doesn't sound
 * like the start of the word there, so it would confuse the child. Returns '' for skipped ones.
 */
export function firstLetter(name: string, l: Lang): string {
  // Spanish: an accented letter counts as the plain one ("Árbol" under A).
  const n = (l === 'es' ? name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : name).toLowerCase();
  if (n.includes(' ') || n.includes('-')) return '';
  // Polish: digraphs (sz, cz, rz, ch, dz) and softening by "i" (zi-, si-, ni-, ci- before a vowel) sound different from the letter alone.
  if (l === 'pl') return /^(sz|cz|rz|ch|dz|dź|dż)|^(dzi|ci|si|zi|ni)[aąeęioóuy]/.test(n) ? '' : n[0]!;
  const SKIP = {
    en: ['sh', 'ch', 'th', 'ph', 'wh', 'kn', 'wr', 'gi', 'ge', 'ce', 'ci'],
    de: ['sch', 'ch', 'st', 'sp', 'ph', 'pf', 'qu', 'ei', 'eu', 'au'],
    // "h" is silent, "ce/ci" and "ge/gi" sound different from the letter name, digraphs ch, ll, qu.
    es: ['h', 'ch', 'll', 'qu', 'gu', 'ce', 'ci', 'ge', 'gi'],
  };
  const skip = SKIP[l];
  if (skip.some((d) => n.startsWith(d))) return '';
  return n[0]!;
}

/** First letter of the item's name in the current language (the "What starts with the letter…?" activity); '' = item skipped. */
export function startOf(item: Item): string {
  return firstLetter(nameOf(item), lang());
}

/** Whether the item may have a face in its picture (animals, sun). Objects without a face: the prompt gets "no face". */
export const hasFace = (item: Item): boolean => item.category === 'animals' || item.id === 'sun';

