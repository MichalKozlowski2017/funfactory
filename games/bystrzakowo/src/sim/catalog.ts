/**
 * Katalog obiektów: jeden obrazek zasila wszystkie zagadki, do których pasuje (zob. docs/bystrzakowo.md).
 * Grafika: public/art/items/<id>.webp (Flux, styl plastelina; `prompt` = opis obiektu do przegenerowania),
 * nazwa w lektorze: public/audio/<głos>/item-<id>.m4a.
 */
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
};

export const ITEMS: Item[] = [
  ...rows('zwierzeta', [
    ['kot', 'Kot', 'pomaranczowy', 's', 'a cute cat sitting'],
    ['pies', 'Pies', '', 's', 'a cute puppy dog standing, side view'],
    ['krowa', 'Krowa', '', 's', 'a cute cow standing, side view'],
    ['slon', 'Słoń', '', 's', 'a cute baby elephant standing, side view'],
    ['kurczak', 'Kurczaczek', 'zolty', 'c', 'a fluffy yellow chick'],
    ['ryba', 'Rybka', 'pomaranczowy', 'sc', 'a cute orange fish, side view'],
    ['zaba', 'Żaba', 'zielony', 's', 'a cute green frog sitting'],
    ['kaczka', 'Kaczka', 'zolty', 'sc', 'a cute yellow duck standing, side view'],
    ['kura', 'Kura', 'bialy', 's', 'a cute white hen with a red comb standing, side view'],
    ['cielaczek', 'Cielaczek', '', 's', 'a tiny cute baby calf with brown spots, side view'],
    ['kotek', 'Kotek', '', 's', 'a tiny cute grey kitten playing'],
    ['owca', 'Owca', 'bialy', 's', 'a cute fluffy white sheep standing, side view'],
    ['jagniatko', 'Jagniątko', 'bialy', 's', 'a tiny cute fluffy white baby lamb, side view'],
    ['swinka', 'Świnka', 'rozowy', 's', 'a cute pink pig standing, side view'],
    ['prosiaczek', 'Prosiaczek', 'rozowy', 'sc', 'a tiny cute pink piglet, side view'],
    ['kon', 'Koń', 'brazowy', 's', 'a cute brown horse standing, side view'],
    ['zrebak', 'Źrebaczek', 'brazowy', 's', 'a tiny cute brown foal with long legs, side view'],
    ['kaczatko', 'Kaczątko', 'zolty', 'sc', 'a tiny fluffy yellow duckling, side view'],
    ['kijanka', 'Kijanka', '', 'sc', 'a cute dark green tadpole with a long tail, side view'],
    ['lew', 'Lew', '', 's', 'a cute lion with a big fluffy mane sitting'],
    ['zyrafa', 'Żyrafa', 'zolty', 's', 'a cute giraffe with a very long neck standing, side view'],
    ['malpa', 'Małpka', 'brazowy', 's', 'a cute brown monkey sitting'],
    ['zebra', 'Zebra', '', 's', 'a cute zebra with black and white stripes standing, side view'],
    ['niedzwiedz', 'Niedźwiedź', 'brazowy', 's', 'a cute big brown bear walking on four legs, side view'],
    ['jez', 'Jeż', 'brazowy', 'sc', 'a cute hedgehog with spikes, side view'],
    ['wiewiorka', 'Wiewiórka', 'pomaranczowy', 's', 'a cute orange squirrel with a big fluffy tail, side view'],
    ['sowa', 'Sowa', 'brazowy', 's', 'a cute brown owl with big round eyes'],
    ['motyl', 'Motyl', 'niebieski', 'sc', 'a cute blue butterfly with open wings, top view'],
    ['biedronka', 'Biedronka', 'czerwony', 'sc', 'a cute red ladybug with black dots, top view'],
    ['pszczola', 'Pszczółka', 'zolty', 'sc', 'a cute yellow and black striped bee with small wings'],
    ['slimak', 'Ślimak', '', 'sc', 'a cute snail with a spiral shell, side view'],
    ['krolik', 'Królik', '', 's', 'a cute grey bunny rabbit with long ears sitting'],
    ['mysz', 'Myszka', '', 'sc', 'a cute little grey mouse with round ears, side view'],
    ['pingwin', 'Pingwin', '', 's', 'a cute penguin standing'],
    ['zolw', 'Żółw', 'zielony', 'sc', 'a cute green turtle, side view'],
    ['krab', 'Krab', 'czerwony', 'sc', 'a cute red crab'],
    ['osmiornica', 'Ośmiornica', 'fioletowy', 's', 'a cute purple octopus'],
    ['ptak', 'Ptaszek', 'niebieski', 'sc', 'a cute little blue bird, side view'],
    ['dinozaur', 'Dinozaur', 'zielony', 's', 'a cute green dinosaur with a long tail, side view'],
  ]),
  ...rows('owoce', [
    ['jablko', 'Jabłko', 'czerwony', 'sc', 'a shiny red apple with a leaf'],
    ['banan', 'Banan', 'zolty', 'sc', 'a yellow banana'],
    ['gruszka', 'Gruszka', 'zielony', 'sc', 'a green pear with a leaf'],
    ['truskawka', 'Truskawka', 'czerwony', 'sc', 'a red strawberry with green leaves'],
    ['sliwka', 'Śliwka', 'fioletowy', 'c', 'a purple plum with a small leaf'],
    ['wisnia', 'Wisienki', 'czerwony', 'sc', 'two red cherries on a stem'],
    ['pomarancza', 'Pomarańcza', 'pomaranczowy', 'c', 'a round orange fruit with a leaf'],
    ['cytryna', 'Cytryna', 'zolty', 'sc', 'a yellow lemon'],
    ['winogrona', 'Winogrona', 'fioletowy', 's', 'a bunch of purple grapes'],
    ['arbuz', 'Arbuz', 'zielony', 's', 'a slice of watermelon with red flesh and green rind'],
    ['ananas', 'Ananas', 'zolty', 's', 'a pineapple with green leaves'],
    ['malina', 'Malina', 'rozowy', 'c', 'a pink raspberry'],
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
    ['hulajnoga', 'Hulajnoga', 'rozowy', 's', 'a pink kick scooter, side view'],
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
  ]),
  ...rows('kuchnia', [
    ['kubek', 'Kubek', 'niebieski', 's', 'a blue mug'],
    ['talerz', 'Talerz', 'bialy', 'c', 'a white plate'],
    ['lyzka', 'Łyżka', '', 'sc', 'a spoon'],
    ['widelec', 'Widelec', '', 'sc', 'a fork'],
    ['garnek', 'Garnek', 'czerwony', 's', 'a red cooking pot with a lid'],
    ['czajnik', 'Czajnik', 'niebieski', 's', 'a blue tea kettle'],
    ['miska', 'Miska', 'zolty', 'c', 'a yellow bowl'],
    ['patelnia', 'Patelnia', '', 's', 'a frying pan with a handle'],
    ['butelka', 'Butelka', '', 'sc', 'a baby milk bottle'],
  ]),
  ...rows('ubrania', [
    ['czapka', 'Czapka', 'czerwony', 's', 'a red knitted winter hat with a pompom'],
    ['szalik', 'Szalik', 'zielony', 's', 'a green striped scarf'],
    ['but', 'Bucik', 'niebieski', 'sc', 'a blue children sneaker shoe, side view'],
    ['skarpetka', 'Skarpetka', 'rozowy', 'sc', 'a pink sock, side view'],
    ['koszulka', 'Koszulka', 'zolty', 's', 'a yellow t-shirt'],
    ['spodnie', 'Spodnie', 'niebieski', 's', 'blue trousers'],
    ['sukienka', 'Sukienka', 'fioletowy', 's', 'a purple dress'],
    ['rekawiczki', 'Rękawiczki', 'zielony', 's', 'a pair of green mittens'],
    ['kalosze', 'Kalosze', 'zolty', 's', 'a pair of yellow rain boots'],
    ['parasol', 'Parasol', 'czerwony', 's', 'an open red umbrella'],
  ]),
  ...rows('natura', [
    ['slonce', 'Słońce', 'zolty', 's', 'a smiling yellow sun'],
    ['chmurka', 'Chmurka', 'bialy', 's', 'a fluffy white cloud'],
    ['gwiazdka', 'Gwiazdka', 'zolty', 'sc', 'a yellow five pointed star'],
    ['ksiezyc', 'Księżyc', 'zolty', 's', 'a yellow crescent moon'],
    ['kwiatek', 'Kwiatek', 'rozowy', 'sc', 'a pink flower with green leaves'],
    ['drzewo', 'Drzewo', 'zielony', 's', 'a round green tree'],
    ['lisc', 'Listek', 'zielony', 'sc', 'a green leaf'],
    ['tecza', 'Tęcza', '', 's', 'a rainbow with clouds at the ends'],
    ['muszelka', 'Muszelka', 'rozowy', 'sc', 'a pink seashell'],
  ]),
].map((item) => (BABIES[item.id] ? { ...item, mother: BABIES[item.id]![0], genitive: BABIES[item.id]![1] } : item));

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

/** Czy obiekt może mieć buzię na obrazku (zwierzęta, słońce). Przedmioty bez buzi: prompt dostaje „no face”. */
export const hasFace = (item: Item): boolean => item.category === 'zwierzeta' || item.id === 'slonce';

/**
 * Pierwsza głoska nazwy (do zagadki z głoskami). Dwuznaki: sz, cz, rz (= ż), ch (= h), dz, dź, dż.
 * Zwraca zapis głoski, np. "sz", "ż", "k".
 */
export function firstSound(name: string): string {
  const n = name.toLowerCase();
  for (const d of ['dż', 'dź', 'sz', 'cz', 'dz']) if (n.startsWith(d)) return d;
  if (n.startsWith('rz')) return 'ż';
  if (n.startsWith('ch')) return 'h';
  if (n.startsWith('ó')) return 'u';
  return n[0]!;
}
