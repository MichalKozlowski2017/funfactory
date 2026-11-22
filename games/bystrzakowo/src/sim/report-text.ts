/**
 * Zdania raportu dla rodzica w każdym języku (logika: report.ts). Bez form zależnych od płci:
 * czas teraźniejszy i imię w mianowniku („Zosia liczy”, „Sam counts”, „Lena zählt”).
 */
import type { Lang } from './lang.ts';
import type { Activity } from './realms.ts';

export type Domain = 'liczby' | 'litery' | 'kolory' | 'emocje' | 'logika' | 'tworczosc';

type N = (n: number) => string;
type S = (xs: string[]) => string;

export interface ReportText {
  child: string;
  /** Jak zapisać głoskę/literę w zdaniu („„sz”” albo „M”). */
  sound: (s: string) => string;
  colors: Record<string, string>;
  shapes: Record<string, string>;
  emotions: Record<string, string>;
  titles: Record<Domain, string>;
  countUpTo: (who: string, n: number) => string;
  countSets: (who: string, xs: string[]) => string;
  countPractice: (who: string) => string;
  countHard: S;
  digitsDrawn: (xs: string[], total: number) => string;
  dots: N;
  countNone: string;
  soundsOk: (who: string, xs: string[]) => string;
  soundsPractice: (who: string) => string;
  soundsHard: S;
  lettersDrawn: (xs: string[], total: number) => string;
  syllables: N;
  lettersNone: string;
  colorsOk: (who: string, xs: string[]) => string;
  colorsHard: S;
  shapesOk: S;
  shapesHard: S;
  colorsPractice: (who: string) => string;
  colorsNone: string;
  emoOk: (who: string, xs: string[]) => string;
  emoHard: S;
  emoPractice: (who: string) => string;
  emoNone: string;
  /** Zagadki logiczne: opis i liczba („Układa historyjki w dobrej kolejności: 6 historyjek”). */
  logic: Partial<Record<Activity, [what: string, count: N]>>;
  quality: [good: string, ok: string, hard: string];
  logicMore: S;
  logicNoneWeek: string;
  logicNone: string;
  creative: { kolorowanka: N; naklejanka: N; melodia: N; sum: S; album: string; none: string };
  week: (days: number, minutes: number, tasks: number) => string;
  weekNone: string;
  firsts: [Activity, string][];
  hl: {
    countTo: N;
    counted: S;
    letters: S;
    sounds: S;
    colors: S;
    digits: S;
    shapes: S;
    emotions: S;
    counts: [Activity, N][];
    tasks: N;
  };
  tips: Record<Domain, string[]>;
  months: string[];
}

const list = (xs: string[]) => xs.join(', ');
/** Polskie liczebniki: 1 zadanie, 2 zadania, 5 zadań. */
const pl3 = (n: number, one: string, few: string, many: string) => {
  const t = n % 100;
  const u = n % 10;
  return `${n} ${n === 1 ? one : u >= 2 && u <= 4 && (t < 12 || t > 14) ? few : many}`;
};
const two = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const PL: ReportText = {
  child: 'Dziecko',
  sound: (s) => `„${s}”`,
  colors: { czerwony: 'czerwony', zolty: 'żółty', zielony: 'zielony', niebieski: 'niebieski', pomaranczowy: 'pomarańczowy', rozowy: 'różowy', fioletowy: 'fioletowy', brazowy: 'brązowy', bialy: 'biały' },
  shapes: { kolo: 'koło', kwadrat: 'kwadrat', trojkat: 'trójkąt', prostokat: 'prostokąt', gwiazda: 'gwiazda', serce: 'serce', owal: 'owal', romb: 'romb' },
  emotions: { wesoly: 'radość', smutny: 'smutek', zly: 'złość', zdziwiony: 'zdziwienie', przestraszony: 'strach', spiacy: 'senność' },
  titles: { liczby: 'Liczby i liczenie', litery: 'Głoski i literki', kolory: 'Kolory i kształty', emocje: 'Emocje', logika: 'Logika i spostrzegawczość', tworczosc: 'Twórczość' },
  countUpTo: (who, n) => `${who} liczy bez pomyłek do ${n}.`,
  countSets: (who, xs) => `${who} bez pomyłek liczy zbiory po ${list(xs)} przedmiotów, mniejsze liczby jeszcze ćwiczy.`,
  countPractice: (who) => `${who} ćwiczy liczenie przedmiotów.`,
  countHard: (xs) => `Jeszcze sprawiają kłopot: ${list(xs)}.`,
  digitsDrawn: (xs, total) => `Narysowane cyferki: ${list(xs)} (${xs.length} z ${total}).`,
  dots: (n) => `Obrazki z kropek połączone po kolei: ${n}.`,
  countNone: 'Liczenia jeszcze nie było. Zajrzyjcie na Polanę Zagadek („Liczenie”) i na Ścieżkę Lusi („Cyferki”).',
  soundsOk: (who, xs) => `${who} rozpoznaje, na jaką literę zaczyna się słowo: ${list(xs)}.`,
  soundsPractice: (who) => `${who} ćwiczy rozpoznawanie pierwszej litery w słowach.`,
  soundsHard: (xs) => `Trudniejsze litery: ${list(xs)}.`,
  lettersDrawn: (xs, total) => `Narysowane literki: ${list(xs)} (${xs.length} z ${total}).`,
  syllables: (n) => `Słowa ułożone z sylab: ${n}.`,
  lettersNone: 'Liter jeszcze nie było. Spróbujcie zabaw „Pierwsza litera”, „Sylaby” i „Literki”.',
  colorsOk: (who, xs) => `${who} rozpoznaje kolory: ${list(xs)}.`,
  colorsHard: (xs) => `Myli się jeszcze przy kolorach: ${list(xs)}.`,
  shapesOk: (xs) => `Dopasowuje kształty: ${list(xs)}.`,
  shapesHard: (xs) => `Trudniejsze kształty: ${list(xs)}.`,
  colorsPractice: (who) => `${who} ćwiczy kolory i kształty.`,
  colorsNone: 'Kolorów i kształtów jeszcze nie było. Spróbujcie zabaw „Kolory” i „Kształty”.',
  emoOk: (who, xs) => `${who} rozpoznaje na buziach: ${list(xs)}.`,
  emoHard: (xs) => `Trudniej idzie z: ${list(xs)}.`,
  emoPractice: (who) => `${who} uczy się rozpoznawać emocje.`,
  emoNone: 'Emocji jeszcze nie było. Spróbujcie zabawy „Minki”.',
  logic: {
    historyjki: ['Układa historyjki w dobrej kolejności', (n) => pl3(n, 'historyjka', 'historyjki', 'historyjek')],
    memory: ['Znajduje pary w grze w pary', (n) => pl3(n, 'plansza', 'plansze', 'plansz')],
    sortowanie: ['Segreguje według kategorii, koloru i wielkości', (n) => pl3(n, 'zadanie', 'zadania', 'zadań')],
    wzory: ['Dokańcza wzory i rytmy', (n) => pl3(n, 'wzór', 'wzory', 'wzorów')],
    cienie: ['Dopasowuje przedmioty do cieni', (n) => pl3(n, 'cień', 'cienie', 'cieni')],
    pasuje: ['Wskazuje, co nie pasuje do reszty', (n) => pl3(n, 'zagadka', 'zagadki', 'zagadek')],
    mamy: ['Łączy zwierzątka z ich mamami', (n) => pl3(n, 'para', 'pary', 'par')],
    ukladanka: ['Składa układanki', (n) => pl3(n, 'układanka', 'układanki', 'układanek')],
    labirynt: ['Przechodzi labirynty', (n) => pl3(n, 'labirynt', 'labirynty', 'labiryntów')],
  },
  quality: ['prawie bez pomyłek', 'czasem z pomyłką', 'jeszcze często z pomyłkami'],
  logicMore: (xs) => `I jeszcze: ${list(xs.map((x) => x.toLowerCase()))}.`,
  logicNoneWeek: 'W tym tygodniu bez zagadek logicznych. Wcześniejsze postępy są zapisane.',
  logicNone: 'Zagadek logicznych jeszcze nie było: cienie, wzory, historyjki, pary, układanki.',
  creative: {
    kolorowanka: (n) => `pokolorowane obrazki: ${n}`,
    naklejanka: (n) => `obrazki z naklejek: ${n}`,
    melodia: (n) => `zagrane melodie: ${n}`,
    sum: (xs) => `Razem ${list(xs)}.`,
    album: 'Prace dziecka znajdziesz w zakładce „Album”.',
    none: 'Pracowni Malucha jeszcze nie było: kolorowanki, naklejki i melodie.',
  },
  week: (days, minutes, tasks) => `Ostatnie 7 dni: ${pl3(days, 'dzień', 'dni', 'dni')} zabawy, razem ${minutes} min, ${pl3(tasks, 'rozwiązane zadanie', 'rozwiązane zadania', 'rozwiązanych zadań')}.`,
  weekNone: 'W ostatnich 7 dniach nie było zabawy.',
  firsts: [
    ['historyjki', 'pierwsza ułożona historyjka'],
    ['litery', 'pierwsza narysowana literka'],
    ['cyfry', 'pierwsza narysowana cyferka'],
    ['sylaby', 'pierwsze słowo ułożone z sylab'],
    ['ukladanka', 'pierwsza ułożona układanka'],
    ['melodia', 'pierwsza powtórzona melodia'],
    ['kolorowanka', 'pierwsza kolorowanka'],
    ['naklejanka', 'pierwszy obrazek z naklejek'],
    ['kropki', 'pierwszy obrazek z kropek'],
    ['labirynt', 'pierwszy przebyty labirynt'],
    ['wzory', 'pierwszy dokończony wzór'],
    ['memory', 'pierwsza gra w pary'],
    ['sortowanie', 'pierwsze segregowanie'],
    ['liczenie', 'pierwsze liczenie'],
    ['gloski', 'pierwsze litery'],
    ['kolory', 'pierwsze kolory'],
    ['ksztalty', 'pierwsze kształty'],
    ['emocje', 'pierwsze minki'],
    ['cienie', 'pierwsze cienie'],
    ['pasuje', 'pierwsze „co nie pasuje”'],
    ['mamy', 'pierwsze mamy zwierzątek'],
  ],
  hl: {
    countTo: (n) => `Liczenie do ${n}`,
    counted: (xs) => `Policzone bez pomyłki: ${list(xs)}`,
    letters: (xs) => `${xs.length > 1 ? 'Nowe literki' : 'Nowa literka'}: ${list(xs)}`,
    sounds: (xs) => `${xs.length > 1 ? 'Litery' : 'Litera'} na początku słowa: ${list(xs)}`,
    colors: (xs) => `${xs.length > 1 ? 'Nowe kolory' : 'Nowy kolor'}: ${list(xs)}`,
    digits: (xs) => `${xs.length > 1 ? 'Nowe cyferki' : 'Nowa cyferka'}: ${list(xs)}`,
    shapes: (xs) => `Kształty: ${list(xs)}`,
    emotions: (xs) => `Emocje: ${list(xs)}`,
    counts: [
      ['historyjki', (n) => pl3(n, 'ułożona historyjka', 'ułożone historyjki', 'ułożonych historyjek')],
      ['kolorowanka', (n) => pl3(n, 'pokolorowany obrazek', 'pokolorowane obrazki', 'pokolorowanych obrazków')],
      ['ukladanka', (n) => pl3(n, 'ułożona układanka', 'ułożone układanki', 'ułożonych układanek')],
      ['melodia', (n) => pl3(n, 'zagrana melodia', 'zagrane melodie', 'zagranych melodii')],
    ],
    tasks: (n) => pl3(n, 'rozwiązane zadanie', 'rozwiązane zadania', 'rozwiązanych zadań'),
  },
  tips: {
    liczby: [
      'Na spacerze liczcie razem schody, auta albo ptaki. Niech dziecko dotyka palcem każdej liczonej rzeczy.',
      'Przy nakrywaniu do stołu poproś: „podaj cztery łyżki”. Liczenie w codziennych sprawach uczy najlepiej.',
      'Zagrajcie w chowanego i liczcie na głos do dziesięciu, raz Ty, raz dziecko.',
    ],
    litery: [
      'Zabawa „Co zaczyna się na…?”: szukajcie w domu rzeczy na literę „m” (miska, miś, mleko).',
      'Narysuj palcem literkę na plecach dziecka i niech zgadnie, jaka to. Potem zamiana.',
      'Na szyldach i w sklepie szukajcie pierwszej litery imienia dziecka.',
      'Wyklaskujcie sylaby w imionach domowników: ma-ma, ta-ta, bab-cia.',
    ],
    kolory: [
      'Kolorowe łowy: kto pierwszy znajdzie w pokoju trzy zielone rzeczy?',
      'Przy sprzątaniu klocków sortujcie je według kolorów albo kształtów.',
      'Szukajcie kształtów na spacerze: okrągłe koła, kwadratowe okna, trójkątne dachy.',
    ],
    emocje: [
      'Przy czytaniu książeczki zapytaj: „jak myślisz, co teraz czuje ten miś?”.',
      'Pokazujcie sobie miny przed lustrem: wesołą, smutną, zdziwioną. Kto zgadnie, jaka to?',
      'Wieczorem porozmawiajcie, co dziś było wesołe, a co smutne.',
    ],
    logika: [
      'Po spacerze albo pieczeniu poproś, żeby dziecko opowiedziało po kolei: co było najpierw, a co potem.',
      'Ułóżcie z kredek rytm: czerwona, niebieska, czerwona… Co będzie dalej?',
      'Zagrajcie w „Co zniknęło?”: połóż cztery przedmioty, dziecko zamyka oczy, a Ty jeden chowasz.',
    ],
    tworczosc: ['Powieście razem rysunek dziecka na lodówce. Dziecko widzi, że jego praca jest ważna.', 'Zróbcie domowy koncert: garnki, łyżki i pudełka jako bębenki.'],
  },
  months: ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'],
};

const EN: ReportText = {
  child: 'Your child',
  sound: (s) => s.toUpperCase(),
  colors: { czerwony: 'red', zolty: 'yellow', zielony: 'green', niebieski: 'blue', pomaranczowy: 'orange', rozowy: 'pink', fioletowy: 'purple', brazowy: 'brown', bialy: 'white' },
  shapes: { kolo: 'circle', kwadrat: 'square', trojkat: 'triangle', prostokat: 'rectangle', gwiazda: 'star', serce: 'heart', owal: 'oval', romb: 'diamond' },
  emotions: { wesoly: 'happy', smutny: 'sad', zly: 'angry', zdziwiony: 'surprised', przestraszony: 'scared', spiacy: 'sleepy' },
  titles: { liczby: 'Numbers and counting', litery: 'Letters', kolory: 'Colors and shapes', emocje: 'Emotions', logika: 'Logic and observation', tworczosc: 'Creativity' },
  countUpTo: (who, n) => `${who} counts up to ${n} without mistakes.`,
  countSets: (who, xs) => `${who} counts groups of ${list(xs)} without mistakes and is still practicing smaller numbers.`,
  countPractice: (who) => `${who} is practicing counting objects.`,
  countHard: (xs) => `Still tricky: ${list(xs)}.`,
  digitsDrawn: (xs, total) => `Numbers drawn: ${list(xs)} (${xs.length} of ${total}).`,
  dots: (n) => `Dot-to-dot pictures finished: ${n}.`,
  countNone: "No counting yet. Visit Puzzle Meadow (“Counting”) and Lusia's Path (“Numbers”).",
  soundsOk: (who, xs) => `${who} knows which letter a word starts with: ${list(xs)}.`,
  soundsPractice: (who) => `${who} is practicing the first letter of words.`,
  soundsHard: (xs) => `Trickier letters: ${list(xs)}.`,
  lettersDrawn: (xs, total) => `Letters drawn: ${list(xs)} (${xs.length} of ${total}).`,
  syllables: (n) => `Words built from syllables: ${n}.`,
  lettersNone: 'No letters yet. Try “First Letter”, “Syllables” and “Letters”.',
  colorsOk: (who, xs) => `${who} recognizes colors: ${list(xs)}.`,
  colorsHard: (xs) => `Still mixes up: ${list(xs)}.`,
  shapesOk: (xs) => `Matches shapes: ${list(xs)}.`,
  shapesHard: (xs) => `Trickier shapes: ${list(xs)}.`,
  colorsPractice: (who) => `${who} is practicing colors and shapes.`,
  colorsNone: 'No colors or shapes yet. Try “Colors” and “Shapes”.',
  emoOk: (who, xs) => `${who} recognizes faces that are: ${list(xs)}.`,
  emoHard: (xs) => `Harder: ${list(xs)}.`,
  emoPractice: (who) => `${who} is learning to recognize emotions.`,
  emoNone: 'No emotions yet. Try “Faces”.',
  logic: {
    historyjki: ['Puts stories in the right order', (n) => two(n, 'story', 'stories')],
    memory: ['Finds pairs in the memory game', (n) => two(n, 'board', 'boards')],
    sortowanie: ['Sorts by category, color and size', (n) => two(n, 'task', 'tasks')],
    wzory: ['Completes patterns and rhythms', (n) => two(n, 'pattern', 'patterns')],
    cienie: ['Matches objects to their shadows', (n) => two(n, 'shadow', 'shadows')],
    pasuje: ["Spots the odd one out", (n) => two(n, 'puzzle', 'puzzles')],
    mamy: ['Matches baby animals with their mommies', (n) => two(n, 'pair', 'pairs')],
    ukladanka: ['Completes jigsaw puzzles', (n) => two(n, 'puzzle', 'puzzles')],
    labirynt: ['Finds the way through mazes', (n) => two(n, 'maze', 'mazes')],
  },
  quality: ['almost without mistakes', 'with an occasional mistake', 'still often with mistakes'],
  logicMore: (xs) => `And also: ${list(xs.map((x) => x[0]!.toLowerCase() + x.slice(1)))}.`,
  logicNoneWeek: 'No logic puzzles this week. Earlier progress is saved.',
  logicNone: 'No logic puzzles yet: shadows, patterns, stories, pairs, jigsaws.',
  creative: {
    kolorowanka: (n) => `colored pictures: ${n}`,
    naklejanka: (n) => `sticker pictures: ${n}`,
    melodia: (n) => `tunes played: ${n}`,
    sum: (xs) => `In total: ${list(xs)}.`,
    album: "You'll find your child's creations in the “Album” tab.",
    none: 'No Little Studio yet: coloring, stickers and tunes.',
  },
  week: (days, minutes, tasks) => `Last 7 days: ${two(days, 'day', 'days')} of play, ${minutes} min in total, ${two(tasks, 'task', 'tasks')} solved.`,
  weekNone: 'No play in the last 7 days.',
  firsts: [
    ['historyjki', 'first story put in order'],
    ['litery', 'first letter drawn'],
    ['cyfry', 'first number drawn'],
    ['sylaby', 'first word built from syllables'],
    ['ukladanka', 'first jigsaw done'],
    ['melodia', 'first tune repeated'],
    ['kolorowanka', 'first coloring page'],
    ['naklejanka', 'first sticker picture'],
    ['kropki', 'first dot-to-dot picture'],
    ['labirynt', 'first maze solved'],
    ['wzory', 'first pattern completed'],
    ['memory', 'first memory game'],
    ['sortowanie', 'first sorting'],
    ['liczenie', 'first counting'],
    ['gloski', 'first letters'],
    ['kolory', 'first colors'],
    ['ksztalty', 'first shapes'],
    ['emocje', 'first faces'],
    ['cienie', 'first shadows'],
    ['pasuje', 'first “odd one out”'],
    ['mamy', 'first animal mommies'],
  ],
  hl: {
    countTo: (n) => `Counting up to ${n}`,
    counted: (xs) => `Counted without mistakes: ${list(xs)}`,
    letters: (xs) => `${xs.length > 1 ? 'New letters' : 'New letter'}: ${list(xs)}`,
    sounds: (xs) => `First ${xs.length > 1 ? 'letters' : 'letter'} of words: ${list(xs)}`,
    colors: (xs) => `${xs.length > 1 ? 'New colors' : 'New color'}: ${list(xs)}`,
    digits: (xs) => `${xs.length > 1 ? 'New numbers' : 'New number'}: ${list(xs)}`,
    shapes: (xs) => `Shapes: ${list(xs)}`,
    emotions: (xs) => `Emotions: ${list(xs)}`,
    counts: [
      ['historyjki', (n) => two(n, 'story put in order', 'stories put in order')],
      ['kolorowanka', (n) => two(n, 'picture colored', 'pictures colored')],
      ['ukladanka', (n) => two(n, 'jigsaw done', 'jigsaws done')],
      ['melodia', (n) => two(n, 'tune played', 'tunes played')],
    ],
    tasks: (n) => two(n, 'task solved', 'tasks solved'),
  },
  tips: {
    liczby: [
      'On a walk, count stairs, cars or birds together. Let your child point at each thing being counted.',
      'When setting the table, ask: “please bring four spoons”. Counting in everyday life teaches best.',
      'Play hide and seek and count out loud to ten, taking turns.',
    ],
    litery: [
      'Play “What starts with…?”: look for things at home starting with M (mug, milk, mittens).',
      "Draw a letter on your child's back with your finger and let them guess. Then switch.",
      "Look for the first letter of your child's name on signs and in shops.",
      'Clap the syllables of family names: mom-my, dad-dy, grand-ma.',
    ],
    kolory: [
      'Color hunt: who can find three green things in the room first?',
      'When tidying up blocks, sort them by color or shape.',
      'Look for shapes on a walk: round wheels, square windows, triangle roofs.',
    ],
    emocje: [
      'While reading a book, ask: “how do you think this bear feels now?”.',
      'Make faces in the mirror: happy, sad, surprised. Who can guess which one it is?',
      'In the evening, talk about what was happy and what was sad today.',
    ],
    logika: [
      'After a walk or baking, ask your child to tell what happened first and what came next.',
      'Lay out a pattern with crayons: red, blue, red… What comes next?',
      'Play “What’s missing?”: put down four objects, your child closes their eyes, and you hide one.',
    ],
    tworczosc: ["Hang your child's drawing on the fridge together. It shows that their work matters.", 'Have a kitchen concert: pots, spoons and boxes make great drums.'],
  },
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const DE: ReportText = {
  child: 'Ihr Kind',
  sound: (s) => s.toUpperCase(),
  colors: { czerwony: 'Rot', zolty: 'Gelb', zielony: 'Grün', niebieski: 'Blau', pomaranczowy: 'Orange', rozowy: 'Rosa', fioletowy: 'Lila', brazowy: 'Braun', bialy: 'Weiß' },
  shapes: { kolo: 'Kreis', kwadrat: 'Quadrat', trojkat: 'Dreieck', prostokat: 'Rechteck', gwiazda: 'Stern', serce: 'Herz', owal: 'Oval', romb: 'Raute' },
  emotions: { wesoly: 'Freude', smutny: 'Traurigkeit', zly: 'Wut', zdziwiony: 'Überraschung', przestraszony: 'Angst', spiacy: 'Müdigkeit' },
  titles: { liczby: 'Zahlen und Zählen', litery: 'Buchstaben', kolory: 'Farben und Formen', emocje: 'Gefühle', logika: 'Logik und Beobachtung', tworczosc: 'Kreativität' },
  countUpTo: (who, n) => `${who} zählt fehlerfrei bis ${n}.`,
  countSets: (who, xs) => `${who} zählt Mengen von ${list(xs)} fehlerfrei und übt kleinere Zahlen noch.`,
  countPractice: (who) => `${who} übt das Zählen von Gegenständen.`,
  countHard: (xs) => `Noch schwierig: ${list(xs)}.`,
  digitsDrawn: (xs, total) => `Geschriebene Zahlen: ${list(xs)} (${xs.length} von ${total}).`,
  dots: (n) => `Punktebilder der Reihe nach verbunden: ${n}.`,
  countNone: 'Noch kein Zählen. Schauen Sie auf der Rätselwiese („Zählen“) und auf Lusias Pfad („Zahlen“) vorbei.',
  soundsOk: (who, xs) => `${who} erkennt, mit welchem Buchstaben ein Wort anfängt: ${list(xs)}.`,
  soundsPractice: (who) => `${who} übt den Anfangsbuchstaben von Wörtern.`,
  soundsHard: (xs) => `Schwierigere Buchstaben: ${list(xs)}.`,
  lettersDrawn: (xs, total) => `Geschriebene Buchstaben: ${list(xs)} (${xs.length} von ${total}).`,
  syllables: (n) => `Aus Silben gelegte Wörter: ${n}.`,
  lettersNone: 'Noch keine Buchstaben. Probieren Sie „Anlaute“, „Silben“ und „Buchstaben“.',
  colorsOk: (who, xs) => `${who} erkennt die Farben: ${list(xs)}.`,
  colorsHard: (xs) => `Verwechselt noch: ${list(xs)}.`,
  shapesOk: (xs) => `Ordnet Formen zu: ${list(xs)}.`,
  shapesHard: (xs) => `Schwierigere Formen: ${list(xs)}.`,
  colorsPractice: (who) => `${who} übt Farben und Formen.`,
  colorsNone: 'Noch keine Farben und Formen. Probieren Sie „Farben“ und „Formen“.',
  emoOk: (who, xs) => `${who} erkennt in Gesichtern: ${list(xs)}.`,
  emoHard: (xs) => `Schwieriger: ${list(xs)}.`,
  emoPractice: (who) => `${who} lernt, Gefühle zu erkennen.`,
  emoNone: 'Noch keine Gefühle. Probieren Sie „Gesichter“.',
  logic: {
    historyjki: ['Legt Geschichten in die richtige Reihenfolge', (n) => two(n, 'Geschichte', 'Geschichten')],
    memory: ['Findet Paare im Memory', (n) => two(n, 'Spiel', 'Spiele')],
    sortowanie: ['Sortiert nach Art, Farbe und Größe', (n) => two(n, 'Aufgabe', 'Aufgaben')],
    wzory: ['Setzt Muster und Rhythmen fort', (n) => two(n, 'Muster', 'Muster')],
    cienie: ['Ordnet Gegenstände ihren Schatten zu', (n) => two(n, 'Schatten', 'Schatten')],
    pasuje: ['Findet, was nicht dazupasst', (n) => two(n, 'Rätsel', 'Rätsel')],
    mamy: ['Findet die Mamas der Tierkinder', (n) => two(n, 'Paar', 'Paare')],
    ukladanka: ['Setzt Puzzles zusammen', (n) => two(n, 'Puzzle', 'Puzzles')],
    labirynt: ['Findet den Weg durch Labyrinthe', (n) => two(n, 'Labyrinth', 'Labyrinthe')],
  },
  quality: ['fast fehlerfrei', 'mit gelegentlichen Fehlern', 'noch oft mit Fehlern'],
  logicMore: (xs) => `Außerdem: ${list(xs.map((x) => x[0]!.toLowerCase() + x.slice(1)))}.`,
  logicNoneWeek: 'Diese Woche keine Logikrätsel. Frühere Fortschritte sind gespeichert.',
  logicNone: 'Noch keine Logikrätsel: Schatten, Muster, Geschichten, Paare, Puzzles.',
  creative: {
    kolorowanka: (n) => `ausgemalte Bilder: ${n}`,
    naklejanka: (n) => `Stickerbilder: ${n}`,
    melodia: (n) => `gespielte Melodien: ${n}`,
    sum: (xs) => `Insgesamt ${list(xs)}.`,
    album: 'Die Werke Ihres Kindes finden Sie im Reiter „Album“.',
    none: 'Das kleine Atelier war noch nicht dran: Ausmalen, Sticker und Melodien.',
  },
  week: (days, minutes, tasks) => `Letzte 7 Tage: ${two(days, 'Spieltag', 'Spieltage')}, insgesamt ${minutes} Min., ${two(tasks, 'gelöste Aufgabe', 'gelöste Aufgaben')}.`,
  weekNone: 'In den letzten 7 Tagen wurde nicht gespielt.',
  firsts: [
    ['historyjki', 'erste geordnete Geschichte'],
    ['litery', 'erster geschriebener Buchstabe'],
    ['cyfry', 'erste geschriebene Zahl'],
    ['sylaby', 'erstes Wort aus Silben'],
    ['ukladanka', 'erstes fertiges Puzzle'],
    ['melodia', 'erste nachgespielte Melodie'],
    ['kolorowanka', 'erstes ausgemaltes Bild'],
    ['naklejanka', 'erstes Stickerbild'],
    ['kropki', 'erstes Punktebild'],
    ['labirynt', 'erstes gelöstes Labyrinth'],
    ['wzory', 'erstes fortgesetztes Muster'],
    ['memory', 'erstes Memory'],
    ['sortowanie', 'erstes Sortieren'],
    ['liczenie', 'erstes Zählen'],
    ['gloski', 'erste Anlaute'],
    ['kolory', 'erste Farben'],
    ['ksztalty', 'erste Formen'],
    ['emocje', 'erste Gesichter'],
    ['cienie', 'erste Schatten'],
    ['pasuje', 'erstes „Was passt nicht?“'],
    ['mamy', 'erste Tiermamas'],
  ],
  hl: {
    countTo: (n) => `Zählen bis ${n}`,
    counted: (xs) => `Fehlerfrei gezählt: ${list(xs)}`,
    letters: (xs) => `${xs.length > 1 ? 'Neue Buchstaben' : 'Neuer Buchstabe'}: ${list(xs)}`,
    sounds: (xs) => `${xs.length > 1 ? 'Anfangsbuchstaben' : 'Anfangsbuchstabe'}: ${list(xs)}`,
    colors: (xs) => `${xs.length > 1 ? 'Neue Farben' : 'Neue Farbe'}: ${list(xs)}`,
    digits: (xs) => `${xs.length > 1 ? 'Neue Zahlen' : 'Neue Zahl'}: ${list(xs)}`,
    shapes: (xs) => `Formen: ${list(xs)}`,
    emotions: (xs) => `Gefühle: ${list(xs)}`,
    counts: [
      ['historyjki', (n) => two(n, 'geordnete Geschichte', 'geordnete Geschichten')],
      ['kolorowanka', (n) => two(n, 'ausgemaltes Bild', 'ausgemalte Bilder')],
      ['ukladanka', (n) => two(n, 'fertiges Puzzle', 'fertige Puzzles')],
      ['melodia', (n) => two(n, 'gespielte Melodie', 'gespielte Melodien')],
    ],
    tasks: (n) => two(n, 'gelöste Aufgabe', 'gelöste Aufgaben'),
  },
  tips: {
    liczby: [
      'Zählen Sie beim Spaziergang gemeinsam Treppenstufen, Autos oder Vögel. Ihr Kind zeigt dabei mit dem Finger auf jedes Ding.',
      'Beim Tischdecken: „Bring bitte vier Löffel.“ Zählen im Alltag lehrt am besten.',
      'Spielen Sie Verstecken und zählen Sie abwechselnd laut bis zehn.',
    ],
    litery: [
      'Spiel „Was fängt mit … an?“: Suchen Sie zu Hause Dinge mit M (Milch, Mütze, Maus).',
      'Malen Sie Ihrem Kind einen Buchstaben auf den Rücken und lassen Sie es raten. Dann tauschen.',
      'Suchen Sie auf Schildern und im Laden den Anfangsbuchstaben vom Namen Ihres Kindes.',
      'Klatschen Sie die Silben der Familiennamen: Ma-ma, Pa-pa, O-ma.',
    ],
    kolory: [
      'Farbenjagd: Wer findet zuerst drei grüne Dinge im Zimmer?',
      'Beim Aufräumen die Bauklötze nach Farben oder Formen sortieren.',
      'Formen beim Spaziergang suchen: runde Räder, eckige Fenster, dreieckige Dächer.',
    ],
    emocje: [
      'Fragen Sie beim Vorlesen: „Was meinst du, wie fühlt sich der Bär jetzt?“',
      'Gesichter im Spiegel machen: fröhlich, traurig, überrascht. Wer errät es?',
      'Sprechen Sie abends darüber, was heute fröhlich und was traurig war.',
    ],
    logika: [
      'Lassen Sie Ihr Kind nach einem Spaziergang oder Backen erzählen, was zuerst war und was danach kam.',
      'Legen Sie mit Stiften ein Muster: rot, blau, rot… Was kommt als Nächstes?',
      'Spielen Sie „Was fehlt?“: Legen Sie vier Dinge hin, Ihr Kind schließt die Augen, und Sie verstecken eins.',
    ],
    tworczosc: ['Hängen Sie gemeinsam ein Bild Ihres Kindes an den Kühlschrank. So sieht es, dass seine Arbeit zählt.', 'Machen Sie ein Küchenkonzert: Töpfe, Löffel und Kartons sind tolle Trommeln.'],
  },
  months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
};


const ES: ReportText = {
  child: 'Tu hijo o hija',
  sound: (s) => s.toUpperCase(),
  colors: { czerwony: 'rojo', zolty: 'amarillo', zielony: 'verde', niebieski: 'azul', pomaranczowy: 'naranja', rozowy: 'rosa', fioletowy: 'morado', brazowy: 'café', bialy: 'blanco' },
  shapes: { kolo: 'círculo', kwadrat: 'cuadrado', trojkat: 'triángulo', prostokat: 'rectángulo', gwiazda: 'estrella', serce: 'corazón', owal: 'óvalo', romb: 'rombo' },
  emotions: { wesoly: 'alegría', smutny: 'tristeza', zly: 'enojo', zdziwiony: 'sorpresa', przestraszony: 'miedo', spiacy: 'sueño' },
  titles: { liczby: 'Números y conteo', litery: 'Letras', kolory: 'Colores y formas', emocje: 'Emociones', logika: 'Lógica y observación', tworczosc: 'Creatividad' },
  countUpTo: (who, n) => `${who} cuenta hasta ${n} sin errores.`,
  countSets: (who, xs) => `${who} cuenta grupos de ${list(xs)} sin errores y todavía practica los números más pequeños.`,
  countPractice: (who) => `${who} practica contar objetos.`,
  countHard: (xs) => `Todavía cuestan: ${list(xs)}.`,
  digitsDrawn: (xs, total) => `Números trazados: ${list(xs)} (${xs.length} de ${total}).`,
  dots: (n) => `Dibujos de unir puntos terminados: ${n}.`,
  countNone: 'Todavía no hay conteo. Visiten la Pradera de Acertijos («Contar») y el Sendero de Lusia («Números»).',
  soundsOk: (who, xs) => `${who} sabe con qué letra empieza una palabra: ${list(xs)}.`,
  soundsPractice: (who) => `${who} practica la primera letra de las palabras.`,
  soundsHard: (xs) => `Letras más difíciles: ${list(xs)}.`,
  lettersDrawn: (xs, total) => `Letras trazadas: ${list(xs)} (${xs.length} de ${total}).`,
  syllables: (n) => `Palabras formadas con sílabas: ${n}.`,
  lettersNone: 'Todavía no hay letras. Prueben «Primera letra», «Sílabas» y «Letras».',
  colorsOk: (who, xs) => `${who} reconoce los colores: ${list(xs)}.`,
  colorsHard: (xs) => `Todavía confunde: ${list(xs)}.`,
  shapesOk: (xs) => `Encaja las formas: ${list(xs)}.`,
  shapesHard: (xs) => `Formas más difíciles: ${list(xs)}.`,
  colorsPractice: (who) => `${who} practica colores y formas.`,
  colorsNone: 'Todavía no hay colores ni formas. Prueben «Colores» y «Formas».',
  emoOk: (who, xs) => `${who} reconoce en las caritas: ${list(xs)}.`,
  emoHard: (xs) => `Más difícil: ${list(xs)}.`,
  emoPractice: (who) => `${who} aprende a reconocer emociones.`,
  emoNone: 'Todavía no hay emociones. Prueben «Caritas».',
  logic: {
    historyjki: ['Ordena cuentos en la secuencia correcta', (n) => two(n, 'cuento', 'cuentos')],
    memory: ['Encuentra parejas en el memorama', (n) => two(n, 'tablero', 'tableros')],
    sortowanie: ['Clasifica por tipo, color y tamaño', (n) => two(n, 'tarea', 'tareas')],
    wzory: ['Completa patrones y ritmos', (n) => two(n, 'patrón', 'patrones')],
    cienie: ['Relaciona objetos con su sombra', (n) => two(n, 'sombra', 'sombras')],
    pasuje: ['Encuentra cuál sobra', (n) => two(n, 'acertijo', 'acertijos')],
    mamy: ['Encuentra a la mamá de cada animalito', (n) => two(n, 'pareja', 'parejas')],
    ukladanka: ['Arma rompecabezas', (n) => two(n, 'rompecabezas', 'rompecabezas')],
    labirynt: ['Encuentra el camino en laberintos', (n) => two(n, 'laberinto', 'laberintos')],
  },
  quality: ['casi sin errores', 'con algún error', 'todavía con muchos errores'],
  logicMore: (xs) => `Y también: ${list(xs.map((x) => x[0]!.toLowerCase() + x.slice(1)))}.`,
  logicNoneWeek: 'Esta semana no hubo acertijos de lógica. El progreso anterior está guardado.',
  logicNone: 'Todavía no hay acertijos de lógica: sombras, patrones, cuentos, parejas, rompecabezas.',
  creative: {
    kolorowanka: (n) => `dibujos coloreados: ${n}`,
    naklejanka: (n) => `imágenes con calcomanías: ${n}`,
    melodia: (n) => `melodías tocadas: ${n}`,
    sum: (xs) => `En total: ${list(xs)}.`,
    album: 'Sus creaciones están en la pestaña «Álbum».',
    none: 'Todavía no han visitado el Pequeño Estudio: colorear, calcomanías y melodías.',
  },
  week: (days, minutes, tasks) => `Últimos 7 días: ${two(days, 'día', 'días')} de juego, ${minutes} min en total, ${two(tasks, 'tarea resuelta', 'tareas resueltas')}.`,
  weekNone: 'No hubo juego en los últimos 7 días.',
  firsts: [
    ['historyjki', 'primer cuento ordenado'],
    ['litery', 'primera letra trazada'],
    ['cyfry', 'primer número trazado'],
    ['sylaby', 'primera palabra con sílabas'],
    ['ukladanka', 'primer rompecabezas armado'],
    ['melodia', 'primera melodía repetida'],
    ['kolorowanka', 'primer dibujo coloreado'],
    ['naklejanka', 'primera imagen con calcomanías'],
    ['kropki', 'primer dibujo de unir puntos'],
    ['labirynt', 'primer laberinto resuelto'],
    ['wzory', 'primer patrón completado'],
    ['memory', 'primer memorama'],
    ['sortowanie', 'primera clasificación'],
    ['liczenie', 'primer conteo'],
    ['gloski', 'primeras letras'],
    ['kolory', 'primeros colores'],
    ['ksztalty', 'primeras formas'],
    ['emocje', 'primeras caritas'],
    ['cienie', 'primeras sombras'],
    ['pasuje', 'primer «¿Cuál sobra?»'],
    ['mamy', 'primeras mamás de animalitos'],
  ],
  hl: {
    countTo: (n) => `Contar hasta ${n}`,
    counted: (xs) => `Contado sin errores: ${list(xs)}`,
    letters: (xs) => `${xs.length > 1 ? 'Letras nuevas' : 'Letra nueva'}: ${list(xs)}`,
    sounds: (xs) => `${xs.length > 1 ? 'Primeras letras' : 'Primera letra'} de palabras: ${list(xs)}`,
    colors: (xs) => `${xs.length > 1 ? 'Colores nuevos' : 'Color nuevo'}: ${list(xs)}`,
    digits: (xs) => `${xs.length > 1 ? 'Números nuevos' : 'Número nuevo'}: ${list(xs)}`,
    shapes: (xs) => `Formas: ${list(xs)}`,
    emotions: (xs) => `Emociones: ${list(xs)}`,
    counts: [
      ['historyjki', (n) => two(n, 'cuento ordenado', 'cuentos ordenados')],
      ['kolorowanka', (n) => two(n, 'dibujo coloreado', 'dibujos coloreados')],
      ['ukladanka', (n) => two(n, 'rompecabezas armado', 'rompecabezas armados')],
      ['melodia', (n) => two(n, 'melodía tocada', 'melodías tocadas')],
    ],
    tasks: (n) => two(n, 'tarea resuelta', 'tareas resueltas'),
  },
  tips: {
    liczby: [
      'En un paseo, cuenten juntos escalones, carros o pájaros. Que señale con el dedo cada cosa que cuenta.',
      'Al poner la mesa, pide: «tráeme cuatro cucharas». Contar en la vida diaria enseña mejor.',
      'Jueguen a las escondidas y cuenten en voz alta hasta diez, por turnos.',
    ],
    litery: [
      'Jueguen a «¿Qué empieza con…?»: busquen en casa cosas con M (mesa, mamá, manzana).',
      'Dibuja una letra con el dedo en su espalda y que adivine cuál es. Luego cambien.',
      'Busquen en letreros y tiendas la primera letra de su nombre.',
      'Aplaudan las sílabas de los nombres de la familia: ma-má, pa-pá, a-bue-la.',
    ],
    kolory: [
      'Cacería de colores: ¿quién encuentra primero tres cosas verdes en el cuarto?',
      'Al guardar los bloques, sepárenlos por color o por forma.',
      'Busquen formas en un paseo: ruedas redondas, ventanas cuadradas, techos de triángulo.',
    ],
    emocje: [
      'Al leer un cuento, pregunta: «¿cómo crees que se siente este osito?».',
      'Hagan caras frente al espejo: alegre, triste, sorprendida. ¿Quién adivina cuál es?',
      'Por la noche, platiquen qué fue alegre y qué fue triste hoy.',
    ],
    logika: [
      'Después de un paseo o de hornear, pide que cuente qué pasó primero y qué después.',
      'Formen un patrón con crayones: rojo, azul, rojo… ¿Qué sigue?',
      'Jueguen a «¿Qué falta?»: pon cuatro objetos, cierra los ojos, y tú escondes uno.',
    ],
    tworczosc: ['Cuelguen juntos un dibujo en el refrigerador. Así ve que su trabajo es importante.', 'Hagan un concierto en la cocina: ollas, cucharas y cajas son tambores geniales.'],
  },
  months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};

export const REPORT_TEXT: Record<Lang, ReportText> = { pl: PL, en: EN, de: DE, es: ES };
