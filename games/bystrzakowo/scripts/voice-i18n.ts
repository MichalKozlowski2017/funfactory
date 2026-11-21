/**
 * Kwestie lektora po angielsku i niemiecku → voice/<język>.json (zadanie dla skilla tts).
 *   node games/bystrzakowo/scripts/voice-i18n.ts
 * Lista nagrań pochodzi z gry (src/voice-lines.ts), więc brak tłumaczenia którejś kwestii przerywa skrypt.
 * Lusia mówi głosem „alt”, Bazyl (po angielsku i niemiecku: Basil) głosem „prezenter”.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ITEMS, itemById, nameOf } from '../src/sim/catalog.ts';
import { setLang, type Lang } from '../src/sim/lang.ts';
import { lettersOf } from '../src/sim/letters.ts';
import { ITEM_NAMES } from '../src/sim/names.ts';
import { wordsOf } from '../src/sim/syllables.ts';
import { voiceLines, type Guide } from '../src/voice-lines.ts';

type L = 'en' | 'de';
type Text = string | Record<Guide, string>;

/** Kwestie wspólne (klucz bez przedrostka głosu). */
const T: Record<L, Record<string, Text>> = {
  en: {
    'brawo-1': 'Well done!',
    'brawo-2': 'Great job!',
    'brawo-3': 'Super, keep it up!',
    'brawo-4': 'Wonderful!',
    'brawo-5': "You're so clever!",
    'oj-1': 'Oops, try again.',
    'oj-2': "Hmm, that's not it. Try once more!",
    nagroda: 'Well done! You get a new sticker!',
    witaj: { lusia: "Hi! I'm Lusia, and this is my friend Basil. Pick a little house and let's play together!", bazyl: "Hey! I'm Basil. Come on, it's going to be fun!" },
    pomoc: { lusia: 'Look carefully. You can do it!', bazyl: 'Go on, touch a picture!' },
    // Lusia
    'kraina-polana': 'This is Puzzle Meadow! Pick a little house.',
    'kraina-spi': 'This land is still asleep. Ask your mom or dad!',
    'kraina-sciezka': 'This is my Path! Here we draw with a finger.',
    'kraina-pracownia': "This is the Little Studio! Here you can paint and create.",
    kropki: 'Connect the dots in order! Start with number one.',
    memory: 'Find pairs of matching pictures!',
    dobranoc: "That's enough playing for today! Lusia and Basil are going to sleep. See you tomorrow!",
    melodia: 'Listen to my tune and play it the same way!',
    sylaby: "Put the syllables in order, and then we'll read together!",
    kolorowanka: 'Pick a color and touch the picture. Paint it any way you like!',
    'kolorowanka-gotowe': 'Beautiful! When you are done, touch the green arrow.',
    naklejanka: 'Make your own sticker picture! Drag a sticker onto the meadow.',
    litery: 'Draw the letter with your finger! Start at the green dot.',
    cyfry: 'Draw the number with your finger! Start at the green dot.',
    cienie: 'Whose shadow is this? Touch the right picture.',
    liczenie: 'Count how many there are!',
    'liczenie-dotyk': 'Touch them one by one and count with me.',
    album: 'This is your sticker album. Collect them all!',
    'liczba-0': 'Zero! There is nothing.',
    // Bazyl
    krainy: 'Touch the colorful circles at the top to visit other lands!',
    historyjki: 'What happened first? Put the pictures in order!',
    'kraina-warsztat': 'Welcome to my workshop! Here we drag and arrange.',
    wzory: 'What comes next? Drag the missing picture!',
    ksztalty: 'Put each block into its hole!',
    pasuje: "What doesn't belong? Touch that picture.",
    ukladanka: 'Finish the picture! Drag the pieces into their places.',
    przeciagnij: 'Hold a picture with your finger and drag it to the box.',
    'sort-domy': 'Where do these animals live? Take each one to its home!',
    'sort-kategorie': 'Sort them! Each thing goes into its box.',
    'sort-kolory': 'Put each thing into the bucket of the same color!',
    'sort-pory': 'What do we wear in summer, and what in winter?',
    'sort-ruch': 'How do these things move? Sort them!',
    'sort-wielkosc': 'Which animals are big, and which are small?',
    'kat-kuchnia': 'Kitchen things go here!',
    'kat-owoce': 'Fruit goes here!',
    'kat-pojazdy': 'Vehicles go here!',
    'kat-ubrania': 'Clothes go here!',
    'kat-warzywa': 'Vegetables go here!',
    'kat-zabawki': 'Toys go here!',
    'kat-zwierzeta': 'Animals go here!',
    'dom-afryka': 'In Africa!',
    'dom-las': 'In the forest!',
    'dom-lod': 'Where there is ice and snow!',
    'dom-wies': 'On the farm!',
    'dom-woda': 'In the water!',
    'pora-lato': 'For summer!',
    'pora-zima': 'For winter!',
    'rozmiar-duze': 'Big animals!',
    'rozmiar-male': 'Little animals!',
    'ruch-jezdzi': 'Things that drive!',
    'ruch-lata': 'Things that fly!',
    'ruch-plywa': 'Things that swim!',
  },
  de: {
    'brawo-1': 'Bravo!',
    'brawo-2': 'Toll gemacht!',
    'brawo-3': 'Super, weiter so!',
    'brawo-4': 'Wunderbar!',
    'brawo-5': 'Du bist ja ein kluger Kopf!',
    'oj-1': 'Hoppla, versuch es noch mal.',
    'oj-2': 'Hmm, das ist es nicht. Versuch es noch einmal!',
    nagroda: 'Bravo! Du bekommst einen neuen Sticker!',
    witaj: { lusia: 'Hallo! Ich bin Lusia, und das ist mein Freund Basil. Such dir ein Häuschen aus und lass uns zusammen spielen!', bazyl: 'Hey! Ich bin Basil. Komm, das wird lustig!' },
    pomoc: { lusia: 'Schau genau hin. Du schaffst das!', bazyl: 'Na los, tipp auf ein Bild!' },
    'kraina-polana': 'Das ist die Rätselwiese! Such dir ein Häuschen aus.',
    'kraina-spi': 'Dieses Land schläft noch. Frag Mama oder Papa!',
    'kraina-sciezka': 'Das ist mein Pfad! Hier malen wir mit dem Finger.',
    'kraina-pracownia': 'Das ist das kleine Atelier! Hier kannst du malen und basteln.',
    kropki: 'Verbinde die Punkte der Reihe nach! Fang bei der Eins an.',
    memory: 'Finde Paare mit gleichen Bildern!',
    dobranoc: 'Für heute ist genug gespielt! Lusia und Basil gehen schlafen. Bis morgen!',
    melodia: 'Hör dir meine Melodie an und spiel sie genauso nach!',
    sylaby: 'Leg die Silben in die richtige Reihenfolge, dann lesen wir zusammen!',
    kolorowanka: 'Such dir eine Farbe aus und tipp auf das Bild. Mal es an, wie du willst!',
    'kolorowanka-gotowe': 'Wunderschön! Wenn du fertig bist, tipp auf den grünen Pfeil.',
    naklejanka: 'Mach dein eigenes Stickerbild! Zieh einen Sticker auf die Wiese.',
    litery: 'Schreib den Buchstaben mit dem Finger! Fang beim grünen Punkt an.',
    cyfry: 'Schreib die Zahl mit dem Finger! Fang beim grünen Punkt an.',
    cienie: 'Wessen Schatten ist das? Tipp auf das richtige Bild.',
    liczenie: 'Zähl mal, wie viele es sind!',
    'liczenie-dotyk': 'Tipp sie der Reihe nach an und zähl mit mir.',
    album: 'Das ist dein Stickeralbum. Sammle sie alle!',
    'liczba-0': 'Null! Da ist nichts.',
    krainy: 'Tipp oben auf die bunten Kreise, um andere Länder zu besuchen!',
    historyjki: 'Was war zuerst? Leg die Bilder der Reihe nach!',
    'kraina-warsztat': 'Willkommen in meiner Werkstatt! Hier ziehen und sortieren wir.',
    wzory: 'Was kommt als Nächstes? Zieh das fehlende Bild hin!',
    ksztalty: 'Steck jeden Klotz in sein Loch!',
    pasuje: 'Was passt hier nicht? Tipp auf dieses Bild.',
    ukladanka: 'Setz das Bild zusammen! Zieh die Teile an ihren Platz.',
    przeciagnij: 'Halte ein Bild mit dem Finger fest und zieh es in die Kiste.',
    'sort-domy': 'Wo wohnen diese Tiere? Bring jedes nach Hause!',
    'sort-kategorie': 'Sortier mal! Jedes Ding kommt in seine Kiste.',
    'sort-kolory': 'Leg jedes Ding in den Eimer mit der gleichen Farbe!',
    'sort-pory': 'Was tragen wir im Sommer, und was im Winter?',
    'sort-ruch': 'Wie bewegen sich diese Dinge? Sortier sie!',
    'sort-wielkosc': 'Welche Tiere sind groß, und welche sind klein?',
    'kat-kuchnia': 'Hier kommen Küchensachen hin!',
    'kat-owoce': 'Hier kommt das Obst hin!',
    'kat-pojazdy': 'Hier kommen die Fahrzeuge hin!',
    'kat-ubrania': 'Hier kommt die Kleidung hin!',
    'kat-warzywa': 'Hier kommt das Gemüse hin!',
    'kat-zabawki': 'Hier kommt das Spielzeug hin!',
    'kat-zwierzeta': 'Hier kommen die Tiere hin!',
    'dom-afryka': 'In Afrika!',
    'dom-las': 'Im Wald!',
    'dom-lod': 'Wo es Eis und Schnee gibt!',
    'dom-wies': 'Auf dem Bauernhof!',
    'dom-woda': 'Im Wasser!',
    'pora-lato': 'Für den Sommer!',
    'pora-zima': 'Für den Winter!',
    'rozmiar-duze': 'Große Tiere!',
    'rozmiar-male': 'Kleine Tiere!',
    'ruch-jezdzi': 'Was fährt!',
    'ruch-lata': 'Was fliegt!',
    'ruch-plywa': 'Was schwimmt!',
  },
};

const NUM: Record<L, string[]> = {
  en: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
  de: ['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn'],
};

const COLORS: Record<L, Record<string, [show: string, bucket: string]>> = {
  en: {
    czerwony: ['Show me something red!', 'Red bucket!'],
    zolty: ['Show me something yellow!', 'Yellow bucket!'],
    zielony: ['Show me something green!', 'Green bucket!'],
    niebieski: ['Show me something blue!', 'Blue bucket!'],
    pomaranczowy: ['Show me something orange!', 'Orange bucket!'],
    rozowy: ['Show me something pink!', 'Pink bucket!'],
    fioletowy: ['Show me something purple!', 'Purple bucket!'],
    brazowy: ['Show me something brown!', 'Brown bucket!'],
    bialy: ['Show me something white!', 'White bucket!'],
  },
  de: {
    czerwony: ['Zeig mir etwas Rotes!', 'Roter Eimer!'],
    zolty: ['Zeig mir etwas Gelbes!', 'Gelber Eimer!'],
    zielony: ['Zeig mir etwas Grünes!', 'Grüner Eimer!'],
    niebieski: ['Zeig mir etwas Blaues!', 'Blauer Eimer!'],
    pomaranczowy: ['Zeig mir etwas Oranges!', 'Oranger Eimer!'],
    rozowy: ['Zeig mir etwas Rosanes!', 'Rosa Eimer!'],
    fioletowy: ['Zeig mir etwas Lilanes!', 'Lila Eimer!'],
    brazowy: ['Zeig mir etwas Braunes!', 'Brauner Eimer!'],
    bialy: ['Zeig mir etwas Weißes!', 'Weißer Eimer!'],
  },
};

const SHAPES: Record<L, Record<string, string>> = {
  en: { kolo: 'Circle!', kwadrat: 'Square!', trojkat: 'Triangle!', prostokat: 'Rectangle!', gwiazda: 'Star!', serce: 'Heart!', owal: 'Oval!', romb: 'Diamond!' },
  de: { kolo: 'Kreis!', kwadrat: 'Quadrat!', trojkat: 'Dreieck!', prostokat: 'Rechteck!', gwiazda: 'Stern!', serce: 'Herz!', owal: 'Oval!', romb: 'Raute!' },
};

const EMOTIONS: Record<L, Record<string, [show: string, face: string]>> = {
  en: {
    wesoly: ['Show me a happy face!', 'A happy face!'],
    smutny: ['Show me a sad face!', 'A sad face!'],
    zly: ['Show me an angry face!', 'An angry face!'],
    zdziwiony: ['Show me a surprised face!', 'A surprised face!'],
    przestraszony: ['Show me a scared face!', 'A scared face!'],
    spiacy: ['Show me a sleepy face!', 'A sleepy face!'],
  },
  de: {
    wesoly: ['Zeig mir ein fröhliches Gesicht!', 'Ein fröhliches Gesicht!'],
    smutny: ['Zeig mir ein trauriges Gesicht!', 'Ein trauriges Gesicht!'],
    zly: ['Zeig mir ein wütendes Gesicht!', 'Ein wütendes Gesicht!'],
    zdziwiony: ['Zeig mir ein überraschtes Gesicht!', 'Ein überraschtes Gesicht!'],
    przestraszony: ['Zeig mir ein ängstliches Gesicht!', 'Ein ängstliches Gesicht!'],
    spiacy: ['Zeig mir ein müdes Gesicht!', 'Ein müdes Gesicht!'],
  },
};

/** „Gdzie jest mama …?”: forma młodego w zdaniu. */
const MOTHERS: Record<L, Record<string, string>> = {
  en: { kurczak: "Where is the chick's mommy?", cielaczek: "Where is the calf's mommy?", kotek: "Where is the kitten's mommy?", jagniatko: "Where is the lamb's mommy?", prosiaczek: "Where is the piglet's mommy?", zrebak: "Where is the foal's mommy?", kaczatko: "Where is the duckling's mommy?", kijanka: "Where is the tadpole's mommy?" },
  de: { kurczak: 'Wo ist die Mama vom Küken?', cielaczek: 'Wo ist die Mama vom Kälbchen?', kotek: 'Wo ist die Mama vom Kätzchen?', jagniatko: 'Wo ist die Mama vom Lämmchen?', prosiaczek: 'Wo ist die Mama vom Ferkel?', zrebak: 'Wo ist die Mama vom Fohlen?', kaczatko: 'Wo ist die Mama vom Entenküken?', kijanka: 'Wo ist die Mama von der Kaulquappe?' },
};

const MAZE: Record<L, Record<string, string>> = {
  en: {
    cielaczek: 'Lead the calf to its mommy!',
    kaczatko: 'Lead the duckling to its mommy!',
    kotek: 'Lead the kitten to its mommy!',
    krolik: 'Lead the bunny to the carrot!',
    kurczak: 'Lead the chick to its mommy!',
    malpa: 'Lead the monkey to the banana!',
    motyl: 'Lead the butterfly to the flower!',
    prosiaczek: 'Lead the piglet to its mommy!',
    pszczola: 'Lead the bee to the flower!',
    wiewiorka: 'Lead the squirrel to the tree!',
  },
  de: {
    cielaczek: 'Bring das Kälbchen zu seiner Mama!',
    kaczatko: 'Bring das Entenküken zu seiner Mama!',
    kotek: 'Bring das Kätzchen zu seiner Mama!',
    krolik: 'Bring das Kaninchen zur Karotte!',
    kurczak: 'Bring das Küken zu seiner Mama!',
    malpa: 'Bring den Affen zur Banane!',
    motyl: 'Bring den Schmetterling zur Blume!',
    prosiaczek: 'Bring das Ferkel zu seiner Mama!',
    pszczola: 'Bring die Biene zur Blume!',
    wiewiorka: 'Bring das Eichhörnchen zum Baum!',
  },
};

const STORIES: Record<L, Record<string, string>> = {
  en: {
    kwiat: 'First a seed, then a sprout, and at the end a flower!',
    kurczak: "First an egg, then the shell cracks, and at the end there's a little chick!",
    motyl: 'First a caterpillar, then a cocoon, and at the end a butterfly!',
    balwan: 'First one snowball, then another, and at the end a snowman!',
    jablko: 'First a whole apple, then a bite, and at the end an apple core!',
    lody: 'First a full ice cream, then less and less, and at the end an empty cone!',
    zabka: 'First little eggs, then a tadpole, and at the end a frog!',
    kanapka: 'First the bread, then the butter, and at the end a yummy sandwich!',
    wieza: 'First one block, then two, and at the end a tall tower!',
    balon: 'First an empty balloon, then a little air, and at the end a big balloon!',
    tort: 'First we mix the batter, then we bake, and at the end there is a cake!',
    zamek: 'First a bucket of sand, then a sand tower, and at the end a sandcastle!',
    jajko: 'First an egg, then we crack it into the pan, and at the end a fried egg!',
    pizza: 'First a ball of dough, then the sauce, and at the end a yummy pizza!',
    swieca: 'First a tall candle, then shorter and shorter, and at the end a tiny stub!',
    kakao: 'First an empty mug, then milk, and at the end warm cocoa!',
    gniazdo: 'First some twigs, then a nest, and at the end a bird in the nest!',
    drzewko: 'First a tiny sapling, then a little tree, and at the end an apple tree with apples!',
    samolot: 'First a sheet of paper, then we fold it, and at the end a paper plane!',
    dzien: 'First the sun rises in the morning, then it is daytime, and at the end it is night!',
  },
  de: {
    kwiat: 'Zuerst ein Samen, dann ein Keimling, und am Ende eine Blume!',
    kurczak: 'Zuerst ein Ei, dann bricht die Schale, und am Ende ist da ein kleines Küken!',
    motyl: 'Zuerst eine Raupe, dann ein Kokon, und am Ende ein Schmetterling!',
    balwan: 'Zuerst eine Schneekugel, dann noch eine, und am Ende ein Schneemann!',
    jablko: 'Zuerst ein ganzer Apfel, dann ein Biss, und am Ende ein Apfelgriebs!',
    lody: 'Zuerst ein volles Eis, dann immer weniger, und am Ende eine leere Waffel!',
    zabka: 'Zuerst kleine Eier, dann eine Kaulquappe, und am Ende ein Frosch!',
    kanapka: 'Zuerst das Brot, dann die Butter, und am Ende ein leckeres Butterbrot!',
    wieza: 'Zuerst ein Klotz, dann zwei, und am Ende ein hoher Turm!',
    balon: 'Zuerst ein leerer Ballon, dann ein bisschen Luft, und am Ende ein großer Ballon!',
    tort: 'Zuerst rühren wir den Teig, dann backen wir, und am Ende gibt es eine Torte!',
    zamek: 'Zuerst ein Eimer Sand, dann ein Sandturm, und am Ende eine Sandburg!',
    jajko: 'Zuerst ein Ei, dann schlagen wir es in die Pfanne, und am Ende ein Spiegelei!',
    pizza: 'Zuerst eine Teigkugel, dann die Soße, und am Ende eine leckere Pizza!',
    swieca: 'Zuerst eine lange Kerze, dann immer kürzer, und am Ende ein kleiner Stummel!',
    kakao: 'Zuerst eine leere Tasse, dann Milch, und am Ende warmer Kakao!',
    gniazdo: 'Zuerst ein paar Zweige, dann ein Nest, und am Ende ein Vogel im Nest!',
    drzewko: 'Zuerst ein kleiner Setzling, dann ein Bäumchen, und am Ende ein Apfelbaum mit Äpfeln!',
    samolot: 'Zuerst ein Blatt Papier, dann falten wir es, und am Ende ein Papierflieger!',
    dzien: 'Zuerst geht morgens die Sonne auf, dann ist Tag, und am Ende ist Nacht!',
  },
};

/** Tekst kwestii `line` przewodnika `guide` w języku `l`. */
function text(l: L, guide: Guide, line: string): string {
  const common = T[l][line];
  if (common !== undefined) return typeof common === 'string' ? common : common[guide];
  const [kind, ...rest] = line.split('-');
  const key = rest.join('-');
  switch (kind) {
    case 'item':
      return `${ITEM_NAMES[key]![l]}!`;
    case 'liczba':
      return `${NUM[l][Number(key) - 1]}!`;
    case 'kolor':
      return COLORS[l][key]![0];
    case 'barwa':
      return COLORS[l][key]![1];
    case 'ksztalt':
      return SHAPES[l][key]!;
    case 'emocje':
      return EMOTIONS[l][key]![0];
    case 'minka':
      return EMOTIONS[l][key]![1];
    case 'mama':
      return MOTHERS[l][key]!;
    case 'labirynt':
      return MAZE[l][key]!;
    case 'historia':
      return STORIES[l][key]!;
    case 'czytaj': {
      const w = wordsOf(l).find((x) => x.item === key)!;
      const whole = ITEM_NAMES[key]![l];
      const parts = w.syl.map((s, i) => (i === 0 ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase()));
      return `${parts.join('... ')}... ${whole}!`;
    }
    case 'litera': {
      const x = lettersOf(l).find((y) => y.ch.toLowerCase() === key)!;
      const word = nameOf(itemById(x.item));
      return l === 'en' ? `${x.ch} is for ${word.toLowerCase()}!` : `${x.ch} wie ${word}!`;
    }
    case 'gloska':
      return l === 'en' ? `What starts with... ${key.toUpperCase()}?` : `Was fängt mit... ${key.toUpperCase()} an?`;
  }
  throw new Error(`Brak tłumaczenia: ${l} ${guide}-${line}`);
}

const VOICE: Record<Guide, string> = { lusia: 'voices/alt', bazyl: 'voices/prezenter' };
const dir = join(import.meta.dirname, '..', 'voice');
for (const l of ['en', 'de'] as const) {
  setLang(l as Lang);
  const names = voiceLines(l);
  const lines = (['lusia', 'bazyl'] as const).flatMap((g) => names[g].map((line) => ({ name: `${g}-${line}`, text: text(l, g, line), voice: VOICE[g] })));
  // Każda kwestia raz (np. nazwy obiektów są w obu głosach osobno, więc zostają).
  const unique = [...new Map(lines.map((x) => [x.name, x])).values()];
  writeFileSync(join(dir, `${l}.json`), JSON.stringify({ voice: 'voices/alt', lang: l, tries: 8, lines: unique }, null, 1) + '\n');
  console.log(`${l}: ${unique.length} kwestii`);
}
void ITEMS;
