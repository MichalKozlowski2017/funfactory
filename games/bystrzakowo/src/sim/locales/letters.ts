import type { Lang } from '../lang.ts';

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

/** Polish letter names as the narrator reads them. */
const PL_NAMES: Record<string, string> = {
  A: 'A', B: 'Be', C: 'Ce', Ć: 'Cie', D: 'De', E: 'E', F: 'Efff', G: 'Gie', H: 'Ha', I: 'I', J: 'Jot', K: 'Ka', L: 'El', Ł: 'Eł', M: 'Em',
  N: 'En', O: 'O', Ó: 'O z kreską', P: 'Pe', R: 'Er', S: 'Es', Ś: 'Eś', T: 'Te', U: 'U', W: 'Wu', Z: 'Zet', Ź: 'Ziet', Ż: 'Żet',
};
// Pełne nazwy liter z pauzą („Zett... wie Zug.”): sama litera przed krótkim zdaniem kończyła się w Chatterboxie
// dopowiedzianym bełkotem (2026-11-24: 34 z 53 niemieckich zdań odpadło w kontroli).
const SPOKEN: Partial<Record<Lang, Record<string, string>>> = {
  de: {
    A: 'A', B: 'Be', C: 'Ce', D: 'De', E: 'E', F: 'Eff', G: 'Ge', H: 'Ha', I: 'I', J: 'Jott', K: 'Ka', L: 'El', M: 'Em', N: 'En',
    O: 'O', P: 'Pe', Q: 'Ku', R: 'Er', S: 'Es', T: 'Te', U: 'U', V: 'Fau', W: 'We', Y: 'Ypsilon', Z: 'Zett',
  },
  es: {
    A: 'A', B: 'Be', C: 'Ce', D: 'De', E: 'E', F: 'Efe', G: 'Ge', H: 'Hache', I: 'I', J: 'Jota', K: 'Ka', L: 'Ele', M: 'Eme',
    N: 'Ene', Ñ: 'Eñe', O: 'O', P: 'Pe', R: 'Erre', S: 'Ese', T: 'Te', U: 'U', V: 'Uve', W: 'Uve doble', Y: 'Ye', Z: 'Zeta',
  },
};
const low = (w: string) => (w === w.toUpperCase() ? w : w.toLowerCase());

/** Tekst zdania (bez wykrzyknika: Chatterbox czyta go jak okrzyk). */
export function letterText(l: Lang, ch: string, word: string): string {
  if (l === 'pl') return `${PL_NAMES[ch] ?? ch}... jak ${low(word)}.`;
  if (l === 'en') return `${ch} is for ${low(word)}.`;
  const spoken = SPOKEN[l]?.[ch] ?? ch;
  return l === 'de' ? `${spoken}... wie ${word}.` : `${spoken}... de ${low(word)}.`;
}
