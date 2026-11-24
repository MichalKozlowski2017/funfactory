/**
 * Generuje brakujące grafiki na Legionie (Flux 2, styl plastelina) do assets-raw/bystrzakowo/items/<id>-<seed>.png.
 * Pomija obiekty, które mają już plik w public/art/items. Rejestruje paczkę w podglądzie `pnpm legion`.
 *   node games/bystrzakowo/scripts/gen-art.ts [--extra] [--warsztat] [--only id,id --seed N]
 *   (--extra: domki, ikona, muzyka; --warsztat: tła, stanowiska i skrzynki Warsztatu Bazyla, po 2 warianty)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { hasFace, ITEMS } from '../src/sim/catalog.ts';

const repo = resolve(import.meta.dirname, '../../..');
const raw = join(repo, 'assets-raw/bystrzakowo');
const comfy = join(homedir(), '.claude/skills/comfyui/comfy.ts');
const job = join(homedir(), '.claude/skills/comfyui/scripts/legion-job.sh');
export const STYLE = 'soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly';
const seedArg = process.argv.indexOf('--seed');
const SEED = seedArg > 0 ? Number(process.argv[seedArg + 1]) : 21;
const onlyArg = process.argv.indexOf('--only');
/** --only a,b,c: wygeneruj ponownie tylko te obiekty (np. z nowym promptem i innym --seed). */
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1]!.split(',')) : null;

interface Task {
  out: string;
  prefix: string;
  args: string[];
}
const tasks: Task[] = [];
const extra = process.argv.includes('--extra');

if (extra) {
  const house = (roof: string) => `a tiny cozy cottage with a round wooden door and ${roof}, front view, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  for (const [k, roof] of [
    ['kolory', 'a rainbow striped roof'],
    ['gloski', 'a blue roof'],
    ['mamy', 'a pink roof with a little heart window'],
  ])
    tasks.push({ out: 'extra', prefix: `dom-${k}`, args: ['--workflow', 'flux2-sprite', '--prompt', house(roof!)] });
  tasks.push({
    out: 'extra',
    prefix: 'ikona',
    args: ['--workflow', 'flux2', '--prompt', `app icon, a cute friendly cartoon fox face with a green scarf, centered, filling the frame, soft warm yellow background, ${STYLE}`],
  });
  tasks.push({
    out: 'extra',
    prefix: 'muzyka',
    args: ['--workflow', 'ace15', '--prompt', 'gentle playful children music, ukulele, glockenspiel, soft marimba, light shaker, happy and calm, warm, simple melody, loopable background music for a preschool game', '--bpm', '96', '--duration', '64', '--key', 'C major'],
  });
}

if (process.argv.includes('--znaki')) {
  // Znaki skrzynek segregowania (nie są obiektami katalogu).
  const sign = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  for (const [id, what] of [
    ['droga', 'a short curvy piece of road with a dashed white line and a tiny traffic light'],
    ['balwan', 'a cute snowman with a carrot nose, a scarf and a little hat'],
    ['palma', 'a single palm tree on a small sandy island with savanna grass'],
    ['kra', 'a small white ice floe with snow and a tiny icicle, floating on a bit of blue water'],
    // Morze zamiast stawu: w „wodzie” są wieloryb, delfin, meduza (test agentem: zwierzęta morskie w stawie mylą).
    ['morze', 'a small round patch of blue sea with big waves and white foam, a starfish and a seashell on a bit of sand in front'],
  ])
    tasks.push({ out: 'warsztat', prefix: id!, args: ['--workflow', 'flux2-sprite', '--prompt', sign(what!)] });
}

if (process.argv.includes('--sciezka')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'sciezka', prefix: 'tlo-sciezka', args: [...wide, '--prompt', bg('wide view of a sunny forest clearing with a winding light dirt path, round trees at the edges, small mushrooms and flowers, wooden signposts, large empty grassy space in the middle and bottom, no characters, no animals')] },
    { out: 'sciezka', prefix: 'tlo-sciezka-gra', args: [...wide, '--prompt', bg('a completely empty soft light green grassy meadow ground seen from above with a few tiny flowers only at the edges, very simple and calm, lots of empty space, no objects, no characters')] },
    { out: 'sciezka', prefix: 'stacja-kropki', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small green chalkboard on a wooden easel with colorful dots connected by a line forming a star shape, front view')] },
    { out: 'sciezka', prefix: 'stacja-labirynt', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small square green hedge maze garden seen from slightly above, with a little wooden gate')] },
  );
}

if (process.argv.includes('--pracownia')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'pracownia', prefix: 'tlo-pracownia', args: [...wide, '--prompt', bg('wide view of a cozy bright children art studio room, easels, jars with brushes and crayons on shelves, colorful paint splashes on the wall, a big window with sunlight, large empty wooden floor in the middle and bottom, no characters, no animals')] },
    { out: 'pracownia', prefix: 'tlo-pracownia-gra', args: [...wide, '--prompt', bg('a completely empty soft cream colored paper wall with a few tiny colorful paint dots only at the edges, very simple and calm, lots of empty space, no objects, no characters')] },
    { out: 'pracownia', prefix: 'stacja-kolorowanka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden easel with a half colored picture of a flower, a paint palette and a brush next to it, front view')] },
    { out: 'pracownia', prefix: 'stacja-naklejanka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an open children sticker book with colorful round stickers of stars, hearts and animals, front view')] },
    { out: 'pracownia', prefix: 'dom-memory', args: ['--workflow', 'flux2-sprite', '--prompt', `a tiny cozy cottage with a round wooden door and an orange roof, front view, single object, centered, ${STYLE}, no face on objects, plain light gray background`] },
    { out: 'pracownia', prefix: 'stacja-wzory', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden children abacus with rows of colorful beads in repeating color patterns, front view')] },
    { out: 'pracownia', prefix: 'stacja-litery', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden board standing on a little stand with a big letter A made of colorful dots, front view')] },
  );
  // Kolorowanki: same kontury, grube linie, białe tło (zamalowywanie dotykiem).
  const page = (what: string) => `children coloring book page of ${what}, very thick clean black outlines, closed shapes, large simple areas, pure white background, no shading, no gray, no color, no texture, cute and friendly, centered, whole object visible`;
  for (const [id, what] of [
    ['kot', 'a cute sitting cat'],
    ['pies', 'a cute happy puppy'],
    ['slon', 'a cute baby elephant'],
    ['ryba', 'a cute fish with big fins'],
    ['motyl', 'a cute butterfly with big wings'],
    ['auto', 'a cute small car'],
    ['kwiatek', 'a big flower with round petals and two leaves'],
    ['dinozaur', 'a cute friendly dinosaur'],
    ['zolw', 'a cute turtle with a patterned shell'],
    ['rakieta', 'a cute rocket with round windows'],
    ['sowa', 'a cute owl sitting on a branch'],
    ['domek', 'a little house with a door, two windows and a tree'],
  ])
    tasks.push({ out: 'kolorowanki', prefix: id!, args: ['--workflow', 'flux2', '--prompt', page(what!)] });
}

if (process.argv.includes('--dodatki')) {
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  tasks.push(
    { out: 'pracownia', prefix: 'stacja-ksztalty', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a wooden children shape sorter box with a circle, a square and a triangle hole and colorful blocks next to it, front view')] },
    { out: 'pracownia', prefix: 'stacja-cyfry', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden board standing on a little stand with big colorful numbers 1 2 3 made of dots, front view')] },
  );
  tasks.push(
    { out: 'pracownia', prefix: 'stacja-sylaby', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small stack of colorful wooden alphabet toy blocks with big letters, front view')] },
    { out: 'pracownia', prefix: 'stacja-historyjki', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('three small square picture cards standing in a row on a little wooden shelf, showing an egg, a hatching chick and a chick, front view')] },
    { out: 'pracownia', prefix: 'dom-emocje', args: ['--workflow', 'flux2-sprite', '--prompt', `a tiny cozy cottage with a round wooden door, a yellow roof and a round window shaped like a smiling face, front view, single object, centered, ${STYLE}, plain light gray background`] },
    { out: 'pracownia', prefix: 'stacja-melodia', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a colorful children wooden xylophone with rainbow bars and two mallets, front view')] },
  );
  // Emocje: ta sama postać (ten sam seed), różne miny. Wyraźne, przesadzone, jak w książeczkach dla maluchów.
  const face = (what: string) => `a cute round little child head with short brown hair and big eyes, ${what}, very clear exaggerated expression for toddlers, front view, single object, centered, ${STYLE}, plain light gray background`;
  for (const [id, what] of [
    ['wesoly', 'very happy, big open smile, cheerful'],
    ['smutny', 'very sad, frowning mouth, a single tear on the cheek'],
    ['zly', 'angry, furrowed eyebrows, red cheeks, pouting'],
    ['zdziwiony', 'surprised, round open mouth, raised eyebrows, wide eyes'],
    ['przestraszony', 'scared and frightened, eyebrows raised high and pulled together, very wide eyes, mouth open in a small scream, hands on cheeks, no tears'],
    ['spiacy', 'sleepy, closed eyes, yawning, a little nightcap'],
  ])
    tasks.push({ out: 'emocje', prefix: id!, args: ['--workflow', 'flux2-sprite', '--prompt', face(what!)] });
}

if (process.argv.includes('--emocje2')) {
  // Emocje: kolejne postaci z tym samym zestawem min (art/emocje/<emocja>-<postać>.webp).
  const chars: [string, string][] = [
    ['dziewczynka', 'a cute round little girl head with two blond pigtails and big eyes'],
    ['kotek', 'a cute round orange kitten head with big eyes'],
    ['mis', 'a cute round brown teddy bear head with big eyes'],
  ];
  const moods: [string, string][] = [
    ['wesoly', 'very happy, big open smile, cheerful'],
    ['smutny', 'very sad, frowning mouth, a single tear on the cheek'],
    ['zly', 'angry, furrowed eyebrows, red cheeks, pouting'],
    ['zdziwiony', 'surprised, round open mouth, raised eyebrows, wide eyes'],
    ['przestraszony', 'scared and frightened, eyebrows raised high and pulled together, very wide eyes, mouth open in a small scream, paws or hands on cheeks, no tears'],
    ['spiacy', 'sleepy, closed eyes, yawning, a little nightcap'],
  ];
  for (const [c, who] of chars)
    for (const [id, what] of moods)
      tasks.push({ out: 'emocje', prefix: `${id}-${c}`, args: ['--workflow', 'flux2-sprite', '--prompt', `${who}, ${what}, very clear exaggerated expression for toddlers, front view, single object, centered, ${STYLE}, plain light gray background`] });
}

if (process.argv.includes('--historyjki')) {
  // Historyjki obrazkowe: po trzy kadry (kolejność zdarzeń), ten sam styl co obiekty.
  const frame = (what: string) => `${what}, single scene object, centered, ${STYLE}, no text, plain light gray background`;
  const stories: [string, string[]][] = [
    ['kwiat', ['a small brown seed in a little pile of soil', 'a tiny green sprout with two leaves growing from a little pile of soil', 'a pink flower in bloom growing from a little pile of soil']],
    ['kurczak', ['a white egg in a little straw nest', 'a cracked white egg with a tiny yellow chick peeking out, in a little straw nest', 'a fluffy yellow chick standing next to broken egg shells in a little straw nest']],
    ['motyl', ['a cute green caterpillar on a leaf', 'a brown cocoon hanging from a twig with a leaf', 'a colorful butterfly with open wings sitting on a leaf']],
    ['balwan', ['one big snowball on snowy ground', 'two snowballs stacked on snowy ground', 'a finished cute snowman with a carrot nose, a hat and a scarf on snowy ground']],
    ['jablko', ['a whole shiny red apple', 'a red apple with one big bite taken out', 'an apple core']],
    ['lody', ['a full ice cream cone with two scoops', 'an ice cream cone with one small melting scoop', 'an empty waffle cone with a few drips']],
  ];
  for (const [id, frames] of stories) frames.forEach((what, i) => tasks.push({ out: 'historyjki', prefix: `${id}-${i + 1}`, args: ['--workflow', 'flux2-sprite', '--prompt', frame(what)] }));
}

if (process.argv.includes('--balwan')) {
  // Bałwan krok po kroku: same kule śniegu bez twarzy (wcześniej Flux dorysowywał buzie i wyglądały jak głowy).
  const frame = (what: string) => `${what}, plain snow, no face, no eyes, no mouth, no nose, no carrot, no decorations, single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, no text, plain light gray background`;
  tasks.push(
    { out: 'historyjki', prefix: 'balwan-1', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', frame('one big round plain white snowball lying on a small patch of snowy ground')] },
    { out: 'historyjki', prefix: 'balwan-2', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', frame('two plain white snowballs stacked on top of each other, a big one at the bottom and a smaller one on top, on a small patch of snowy ground, an unfinished snowman body')] },
  );
}

if (process.argv.includes('--historyjki2')) {
  // Nowe historyjki i poprawione kadry. Przedmioty bez buzi (Flux z „cute” dorysowywał twarze jajkom i jabłkom).
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const animal = (what: string) => `${what}, cute and friendly, ${base}`;
  const frames: [string, string][] = [
    // Poprawki (bez twarzy).
    ['kwiat-1', thing('a small brown seed in a little pile of brown soil')],
    ['kwiat-2', thing('a tiny green sprout with two leaves growing from a little pile of brown soil')],
    ['kwiat-3', thing('a pink flower in bloom growing from a little pile of brown soil')],
    ['kurczak-1', thing('a plain white egg in a little straw nest')],
    ['jablko-1', thing('a whole shiny red apple with a leaf')],
    ['jablko-2', thing('a red apple with one big bite taken out, with a leaf')],
    ['jablko-3', thing('an apple core with a stem')],
    ['lody-1', thing('a full ice cream cone with two scoops, pink and vanilla')],
    ['lody-2', thing('an ice cream cone with one small half melted pink scoop')],
    // Nowe historyjki.
    ['zabka-1', thing('a small clump of round transparent frog eggs with black dots floating in a bit of blue pond water')],
    ['zabka-2', animal('a small dark green tadpole with a long tail swimming in a bit of blue pond water')],
    ['zabka-3', animal('a green frog sitting on a lily pad on a bit of blue pond water')],
    ['kanapka-1', thing('a single plain slice of bread on a small wooden board')],
    ['kanapka-2', thing('a single slice of bread spread with yellow butter on a small wooden board, a butter knife next to it')],
    ['kanapka-3', thing('an open sandwich, a slice of bread with butter, cheese, tomato slices and lettuce on a small wooden board')],
    ['wieza-1', thing('one single red wooden toy block standing on the floor')],
    ['wieza-2', thing('two wooden toy blocks stacked on top of each other, red at the bottom and yellow on top')],
    ['wieza-3', thing('a tall tower of five stacked colorful wooden toy blocks, red, yellow, green, blue and orange')],
    ['balon-1', thing('a flat deflated red rubber balloon lying on the floor')],
    ['balon-2', thing('a small half inflated red balloon with a string')],
    ['balon-3', thing('a big round fully inflated shiny red balloon with a string')],
    ['tort-1', thing('a mixing bowl with cake batter, a whisk, two eggs and a bag of flour next to it')],
    ['tort-2', thing('a plain round baked sponge cake in a round baking tin')],
    ['tort-3', thing('a round birthday cake with pink frosting, sprinkles and three lit candles on a plate')],
    ['zamek-1', thing('a red toy bucket full of sand standing on beach sand with a small spade')],
    ['zamek-2', thing('a small round pile of sand shaped like an upturned bucket on beach sand')],
    ['zamek-3', thing('a sand castle with three towers and a little red flag on beach sand')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'historyjki', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--historyjki4')) {
  // Poprawki kadrów z --historyjki2: żabki na skrzeku, klocek z kółkami, napis na mące, dziwna babka z piasku.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['zabka-1', thing('frog spawn: a clump of many small round clear jelly balls, each with one tiny black dot inside, floating on a bit of blue pond water, no frogs, no animals')],
    ['wieza-1', thing('one single plain red cube toy block, no wheels, standing alone')],
    ['wieza-3', thing('a tall tower of five stacked plain cube toy blocks: red cube at the bottom, yellow cube on it, then green, then blue, and a small red triangle block on the very top')],
    ['tort-1', thing('a blue mixing bowl with yellow cake batter and a whisk, two brown eggs next to it, no bags, no labels')],
    ['zamek-2', thing('a smooth sand tower in the exact shape of an upside down bucket, standing on beach sand, a red toy bucket lying on its side next to it')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'historyjki', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--historyjki5')) {
  // Poprawki z --historyjki3: biała kartka ginęła na tle, ciasto z kolorową posypką.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['pizza-1', thing('one smooth plain beige ball of raw bread dough, no toppings, no sprinkles, no dots, on a small wooden board dusted with white flour')],
    ['samolot-1', thing('one flat square sheet of light blue paper lying on a small wooden table, seen from the front at an angle')],
    ['samolot-2', thing('a sheet of light blue paper folded into a simple triangle shape, lying on a small wooden table')],
    ['samolot-3', thing('a light blue folded paper airplane with pointed nose and two wings, flying, side view')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'historyjki', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--historyjki6')) {
  // Sześć kolejnych historyjek (razem 24): zmiana widoczna od razu, ten sam przedmiot w każdym kadrze.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['banan-1', thing('a whole unpeeled yellow banana lying on a small round white plate')],
    ['banan-2', thing('a half peeled yellow banana with the peel hanging down and the white fruit showing, lying on a small round white plate')],
    ['banan-3', thing('only an empty limp yellow banana peel lying on a small round white plate, the fruit is eaten')],
    ['arbuz-1', thing('a whole round green striped watermelon on a small wooden board')],
    ['arbuz-2', thing('a green striped watermelon cut into two halves showing red juicy flesh with black seeds, on a small wooden board')],
    ['arbuz-3', thing('three triangular slices of red watermelon with green rind and black seeds on a small wooden board')],
    ['akwarium-1', thing('an empty round glass fish bowl with no water, yellow sand and a small green plant at the bottom, blue tinted glass rim')],
    ['akwarium-2', thing('a round glass fish bowl filled with clear blue water, yellow sand and a small green plant at the bottom, no fish')],
    ['akwarium-3', thing('a round glass fish bowl filled with clear blue water, yellow sand and a small green plant at the bottom, one orange goldfish swimming inside')],
    ['prezent-1', thing('a closed gift box wrapped in red paper with a big yellow ribbon bow')],
    ['prezent-2', thing('a gift box with torn red wrapping paper, the lid half open, a yellow ribbon lying next to it')],
    ['prezent-3', 'a cute brown teddy bear sitting next to an open empty gift box and torn red wrapping paper, ' + base],
    ['myjnia-1', thing('a small red toy car covered in brown mud splashes and dirt')],
    ['myjnia-2', thing('a small red toy car covered in white soap foam and bubbles')],
    ['myjnia-3', thing('a small shiny clean red toy car with tiny white sparkles around it')],
    ['babeczka-1', thing('a pink paper muffin cup filled with raw runny yellow cake batter')],
    ['babeczka-2', thing('a baked golden brown muffin in a pink paper cup')],
    ['babeczka-3', thing('a muffin in a pink paper cup topped with swirled pink cream frosting and one red cherry')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'historyjki', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--historyjki7')) {
  // Poprawki z --historyjki6: zamiast skórki wychodził cały banan, a surowe ciasto wyglądało jak babeczka z kremem.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['banan-3', thing('an empty limp banana peel lying flat, four floppy yellow peel strips spread open like a star, nothing inside the peel, the banana fruit is gone')],
    ['babeczka-1', thing('a pink paper muffin cup seen from slightly above, half filled with smooth flat runny pale yellow liquid cake batter, glossy flat surface, no swirl, no frosting, no sprinkles')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'historyjki', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '3', '--prompt', prompt] });
}

if (process.argv.includes('--historyjki3')) {
  // Kolejne historyjki (razem 20).
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const animal = (what: string) => `${what}, cute and friendly, ${base}`;
  const frames: [string, string][] = [
    ['jajko-1', thing('a whole white egg next to a small frying pan')],
    ['jajko-2', thing('a cracked egg with raw yolk and egg white pouring into a small frying pan')],
    ['jajko-3', thing('a fried egg with a round yellow yolk in a small frying pan')],
    ['pizza-1', thing('a round ball of pizza dough on a floured wooden board')],
    ['pizza-2', thing('a flat round raw pizza dough spread with red tomato sauce on a wooden board')],
    ['pizza-3', thing('a baked round pizza with melted cheese, tomato and basil on a wooden board')],
    ['swieca-1', thing('a tall new white candle with a small flame in a candle holder')],
    ['swieca-2', thing('a half burned white candle with a small flame and wax drips in a candle holder')],
    ['swieca-3', thing('a tiny short burned down candle stub with a small flame and a puddle of wax in a candle holder')],
    ['kakao-1', thing('an empty blue mug')],
    ['kakao-2', thing('a blue mug full of white milk')],
    ['kakao-3', thing('a blue mug full of hot brown cocoa with pink and white marshmallows on top')],
    ['gniazdo-1', thing('a small pile of twigs and straw on a tree branch')],
    ['gniazdo-2', thing('an empty round bird nest made of twigs on a tree branch')],
    ['gniazdo-3', animal('a small blue bird sitting in a round nest made of twigs on a tree branch')],
    ['drzewko-1', thing('a tiny tree sapling with a few leaves growing from a small mound of soil')],
    ['drzewko-2', thing('a small young tree with a thin trunk and a small round crown on a small mound of grass')],
    ['drzewko-3', thing('a big apple tree with a round green crown full of red apples on a small mound of grass')],
    ['samolot-1', thing('a plain flat sheet of white paper lying on a table')],
    ['samolot-2', thing('a sheet of white paper folded in half with a pointed folded tip, half made paper airplane')],
    ['samolot-3', thing('a finished white paper airplane')],
    ['dzien-1', thing('a small round green hill with the sun rising behind it, orange and pink morning sky in a round frame')],
    ['dzien-2', thing('a small round green hill with a bright yellow sun high in a blue sky in a round frame')],
    ['dzien-3', thing('a small round dark green hill under a dark blue night sky with a crescent moon and stars in a round frame')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'historyjki', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--krajobrazy')) {
  // Tła naklejanki: szeroki krajobraz z dużą pustą przestrzenią na naklejki (dolne dwie trzecie).
  const land = (what: string) => `wide landscape scene of ${what}, the bottom two thirds is a big open empty flat area for placing stickers, low horizon detail, no characters, no animals, no people, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft lighting, bright cheerful pastel colors, cute and friendly`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2', '--prompt'];
  for (const [id, what] of [
    ['plaza', 'a sunny sandy beach with calm blue sea, a few small waves and a bright sky with fluffy clouds'],
    ['las', 'a sunny forest clearing with big round trees at the edges and a soft green grass meadow'],
    ['zima', 'a snowy winter meadow with snow covered round hills, a few snowy pine trees at the edges and a pale blue sky'],
    ['farma', 'a farm meadow with a wooden fence, a small red barn far away on a hill and a sunny sky'],
    ['morze', 'an underwater sea floor with sand, colorful corals and seaweed at the edges, light blue water with light rays'],
    ['kosmos', 'outer space with a dark blue starry sky, colorful planets far away and a gray moon surface with round craters at the bottom'],
  ])
    tasks.push({ out: 'krajobrazy', prefix: id!, args: [...wide, land(what!)] });
}

if (process.argv.includes('--kolorowanki2')) {
  // Prostsze kolorowanki dla maluchów: kilka dużych pól, bez drobnych detali (palec 3-latka).
  const page = (what: string) => `very simple children coloring book page for toddlers aged 2 to 3 of ${what}, only 6 to 10 big closed areas, extremely thick bold black outlines, no small details, no stripes, no patterns, no scales, no texture lines, no tiny eyes details, big chunky rounded shapes, object fills the whole page, pure white background, no shading, no gray, no color`;
  for (const [id, what] of [
    ['ryba', 'a round chubby fish with one big tail fin'],
    ['zolw', 'a chubby turtle with a big round shell made of four big plates'],
    ['motyl', 'a butterfly with four big round wings'],
    ['kwiatek', 'a big flower with five round petals, a round center, a stem and two big leaves'],
    ['domek', 'a little house with a big roof, a door and one round window'],
    ['sowa', 'a chubby round owl with big eyes and two wings'],
    ['slon', 'a chubby baby elephant with big ears, sitting'],
  ])
    tasks.push({ out: 'kolorowanki', prefix: id!, args: ['--workflow', 'flux2', '--count', '2', '--prompt', page(what!)] });
}

if (process.argv.includes('--polana')) {
  // Stanowiska Polany Zagadek: obrazek mówi, na czym polega zabawa (zamiast jednakowych domków).
  const sprite = (what: string, face = false) => `${what}, single object, centered, ${STYLE}${face ? '' : ', no face on objects'}, plain light gray background`;
  const two = ['--workflow', 'flux2-sprite', '--count', '2', '--prompt'];
  tasks.push(
    { out: 'polana', prefix: 'stacja-kolory', args: [...two, sprite('four small open paint jars in a row, red, yellow, blue and green paint, with a paintbrush, front view')] },
    { out: 'polana', prefix: 'stacja-gloski', args: [...two, sprite('an open children picture alphabet book showing a big letter A on one page and a red apple on the other page, front view')] },
    { out: 'polana', prefix: 'stacja-mamy', args: [...two, sprite('a big mother hen and a tiny fluffy yellow chick standing side by side, looking at each other lovingly', true)] },
    { out: 'polana', prefix: 'stacja-memory', args: [...two, sprite('six small square memory game cards lying in a grid on a little wooden board, four face down with a purple back and a yellow star, two turned face up showing the same red apple, seen slightly from above')] },
    { out: 'polana', prefix: 'stacja-cienie', args: [...two, sprite('a small cute orange cat figurine standing next to its flat dark purple silhouette cutout of the same shape, on a small wooden stand, front view')] },
    { out: 'polana', prefix: 'stacja-pasuje', args: [...two, sprite('three identical red apples and one small blue toy car standing in a row on a little wooden shelf, front view')] },
    { out: 'polana', prefix: 'stacja-liczenie', args: [...two, sprite('a small wooden counting tray with five round hollows, three of them holding shiny red apples, and a little abacus next to it, seen slightly from above')] },
    { out: 'polana', prefix: 'stacja-emocje', args: [...two, sprite('three round cards standing on a little wooden stand, showing a happy smiling face, a sad face and a surprised face, simple cartoon faces, front view', true)] },
  );
}

if (process.argv.includes('--zebatka')) {
  // Ikona wejścia do strefy rodzica (zębatka w stylu plasteliny), 4 warianty do wyboru.
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  tasks.push(
    { out: 'extra', prefix: 'zebatka-a', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a chubby rounded cogwheel gear icon with a round hole in the middle, soft lilac purple, front view, flat facing the camera')] },
    { out: 'extra', prefix: 'zebatka-b', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a chubby rounded settings gear icon with eight soft round teeth and a small yellow button in the center, warm grey and cream, front view, flat facing the camera')] },
  );
}

if (process.argv.includes('--warsztat')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'warsztat', prefix: 'tlo-warsztat', args: [...wide, '--prompt', bg('wide view of a cozy wooden toy workshop interior, wooden shelves with colorful toys and jars along the walls, a big round window with sunlight, warm and friendly, large empty wooden floor in the middle and bottom, no characters, no animals')] },
    { out: 'warsztat', prefix: 'tlo-warsztat-gra', args: [...wide, '--prompt', bg('a soft blurred cozy background of a warm wooden toy workshop, wooden wall and a light wooden tabletop, very simple and calm, lots of empty space, no characters, no objects in the foreground')] },
    { out: 'warsztat', prefix: 'stacja-sortowanie', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('three small open wooden crates in a row filled with colorful fruits, toys and vegetables, front view')] },
    { out: 'warsztat', prefix: 'stacja-ukladanka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden easel holding a colorful jigsaw puzzle picture with one piece missing, front view')] },
    { out: 'warsztat', prefix: 'skrzynka', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an empty open wooden crate, front view, wide and low')] },
    { out: 'warsztat', prefix: 'wiadro', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an empty plain pure white bucket with a handle, front view, matte white plasticine')] },
    { out: 'warsztat', prefix: 'stodola', args: ['--workflow', 'flux2-sprite', '--prompt', sprite('a small red farm barn with a white cross on the door')] },
    { out: 'warsztat', prefix: 'staw', args: ['--workflow', 'flux2-sprite', '--prompt', sprite('a small round blue pond with a green lily pad and reeds, seen from slightly above')] },
  );
}

if (process.argv.includes('--raczka')) {
  // Rączka z samouczka: pokazuje gesty (dotknij, przeciągnij, prowadź palcem). Palec wskazujący do góry, obracana w kodzie.
  const hand = (what: string) => `${what}, single object, centered, ${STYLE}, plain light gray background`;
  tasks.push(
    { out: 'ui', prefix: 'raczka-a', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a cute chubby cartoon child hand with the index finger pointing straight up and the other fingers curled into the palm, warm peach skin, a short light blue sleeve cuff at the wrist, seen from the back of the hand, exactly five fingers')] },
    { out: 'ui', prefix: 'raczka-b', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a simple rounded cartoon pointing hand icon like a tutorial cursor, index finger pointing up, thumb tucked to the side, three fingers folded, white glove-like smooth plasticine with a soft orange outline cuff, exactly five fingers')] },
  );
}
if (process.argv.includes('--raczka2')) {
  // Druga wersja (uwaga właściciela): grzbiet dłoni, widok z góry jak ręka stukająca w ekran, nie od strony wnętrza dłoni.
  const hand = (what: string) => `${what}, single object, centered, ${STYLE}, plain light gray background`;
  tasks.push(
    { out: 'ui', prefix: 'raczka-c', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a cute chubby cartoon child right hand seen from above showing the back of the hand, knuckles on top, palm facing away from the viewer, the index finger stretched straight up, the other three fingers folded under the hand and hidden, thumb tucked along the side, warm peach skin, a short light blue sleeve cuff at the wrist at the bottom, like a hand tapping a touchscreen')] },
    { out: 'ui', prefix: 'raczka-d', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a cartoon tutorial pointer hand icon, view of the back of a right hand from above, smooth rounded knuckles visible, no palm and no fingernails of the folded fingers visible, index finger pointing straight up with a small fingernail on its tip, warm peach plasticine skin, light blue sleeve cuff at the bottom')] },
  );
}

for (const item of ITEMS) {
  if ((process.argv.includes('--warsztat') || process.argv.includes('--zebatka') || process.argv.includes('--sciezka') || process.argv.includes('--znaki') || process.argv.includes('--pracownia') || process.argv.includes('--dodatki') || process.argv.includes('--historyjki') || process.argv.includes('--polana') || process.argv.includes('--kolorowanki2') || process.argv.includes('--krajobrazy') || process.argv.includes('--balwan') || process.argv.includes('--historyjki2') || process.argv.includes('--historyjki3') || process.argv.includes('--historyjki4') || process.argv.includes('--historyjki5') || process.argv.includes('--historyjki6') || process.argv.includes('--historyjki7') || process.argv.includes('--emocje2') || process.argv.includes('--raczka') || process.argv.includes('--raczka2')) && !only) break;
  if (only && !only.has(item.id)) continue;
  if (!only && existsSync(join(repo, 'games/bystrzakowo/public/art/items', `${item.id}.webp`))) continue;
  if (existsSync(join(raw, 'items', `${item.id}-${SEED}.png`))) continue;
  const prompt = `${item.prompt}, single object, centered, ${STYLE}${hasFace(item) ? '' : ', no face on objects'}, plain light gray background`;
  tasks.push({ out: 'items', prefix: item.id, args: ['--workflow', 'flux2-sprite', '--prompt', prompt] });
}

// Zadania spoza katalogu (tła, stanowiska, znaki): pomijamy te, które mają już plik z tym seedem.
for (let i = tasks.length - 1; i >= 0; i--) {
  const t = tasks[i]!;
  if (t.out !== 'items' && existsSync(join(raw, t.out, `${t.prefix}-${SEED}.png`))) tasks.splice(i, 1);
}
console.log(`Do wygenerowania: ${tasks.length}`);
for (const dir of ['items', 'extra', 'warsztat', 'sciezka', 'pracownia', 'kolorowanki', 'emocje', 'historyjki', 'polana', 'krajobrazy', 'ui']) mkdirSync(join(raw, dir), { recursive: true });
// Postęp liczony w obrazkach (zadanie z --count N daje N plików .png).
const images = tasks.reduce((n, t) => n + (t.args.includes('--count') ? Number(t.args[t.args.indexOf('--count') + 1]) : t.args.includes('ace15') ? 0 : 1), 0);
execFileSync(job, ['bystrzakowo-items', 'Bystrzakowo: grafiki', String(images), '--dir', raw, '--glob', '*'], { stdio: 'inherit' });
for (const [i, t] of tasks.entries()) {
  try {
    const out = execFileSync('node', [comfy, 'gen', ...t.args, '--seed', String(SEED), '--out', join(raw, t.out), '--prefix', t.prefix], { encoding: 'utf8' });
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} ${out.trim().split('\n').pop()}`);
  } catch (e) {
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} BŁĄD ${String(e).slice(0, 200)}`);
  }
}
console.log('GOTOWE');
