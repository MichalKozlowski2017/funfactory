/**
 * Generates missing art on Legion (Flux 2, plasticine style) into assets-raw/bystrzakowo/items/<id>-<seed>.png.
 * Skips items that already have a file in public/art/items. Registers the batch in the `pnpm legion` preview.
 *   node games/bystrzakowo/scripts/gen-art.ts [--extra] [--workshop] [--only id,id --seed N]
 *   (--extra: houses, icon, music; --workshop: backgrounds, stations and crates of Bazyl's Workshop, 2 variants each)
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
/** --only a,b,c: regenerate only these items (e.g. with a new prompt and a different --seed). */
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
    ['colors', 'a rainbow striped roof'],
    ['phonemes', 'a blue roof'],
    ['mothers', 'a pink roof with a little heart window'],
  ])
    tasks.push({ out: 'extra', prefix: `house-${k}`, args: ['--workflow', 'flux2-sprite', '--prompt', house(roof!)] });
  tasks.push({
    out: 'extra',
    prefix: 'icon',
    args: ['--workflow', 'flux2', '--prompt', `app icon, a cute friendly cartoon fox face with a green scarf, centered, filling the frame, soft warm yellow background, ${STYLE}`],
  });
  tasks.push({
    out: 'extra',
    prefix: 'music',
    args: ['--workflow', 'ace15', '--prompt', 'gentle playful children music, ukulele, glockenspiel, soft marimba, light shaker, happy and calm, warm, simple melody, loopable background music for a preschool game', '--bpm', '96', '--duration', '64', '--key', 'C major'],
  });
}

if (process.argv.includes('--signs')) {
  // Signs for the sorting crates (not catalog items).
  const sign = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  for (const [id, what] of [
    ['road', 'a short curvy piece of road with a dashed white line and a tiny traffic light'],
    ['snowman', 'a cute snowman with a carrot nose, a scarf and a little hat'],
    ['palm', 'a single palm tree on a small sandy island with savanna grass'],
    ['ice-floe', 'a small white ice floe with snow and a tiny icicle, floating on a bit of blue water'],
    // Sea instead of a pond: whale, dolphin and jellyfish go "in water" (agent test: sea animals in a pond were confusing).
    ['sea', 'a small round patch of blue sea with big waves and white foam, a starfish and a seashell on a bit of sand in front'],
  ])
    tasks.push({ out: 'workshop', prefix: id!, args: ['--workflow', 'flux2-sprite', '--prompt', sign(what!)] });
}

if (process.argv.includes('--path')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'path', prefix: 'background-path', args: [...wide, '--prompt', bg('wide view of a sunny forest clearing with a winding light dirt path, round trees at the edges, small mushrooms and flowers, wooden signposts, large empty grassy space in the middle and bottom, no characters, no animals')] },
    { out: 'path', prefix: 'background-path-game', args: [...wide, '--prompt', bg('a completely empty soft light green grassy meadow ground seen from above with a few tiny flowers only at the edges, very simple and calm, lots of empty space, no objects, no characters')] },
    { out: 'path', prefix: 'station-dots', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small green chalkboard on a wooden easel with colorful dots connected by a line forming a star shape, front view')] },
    { out: 'path', prefix: 'station-maze', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small square green hedge maze garden seen from slightly above, with a little wooden gate')] },
  );
}

if (process.argv.includes('--studio')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'studio', prefix: 'background-studio', args: [...wide, '--prompt', bg('wide view of a cozy bright children art studio room, easels, jars with brushes and crayons on shelves, colorful paint splashes on the wall, a big window with sunlight, large empty wooden floor in the middle and bottom, no characters, no animals')] },
    { out: 'studio', prefix: 'background-studio-game', args: [...wide, '--prompt', bg('a completely empty soft cream colored paper wall with a few tiny colorful paint dots only at the edges, very simple and calm, lots of empty space, no objects, no characters')] },
    { out: 'studio', prefix: 'station-coloring', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden easel with a half colored picture of a flower, a paint palette and a brush next to it, front view')] },
    { out: 'studio', prefix: 'station-stickers', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an open children sticker book with colorful round stickers of stars, hearts and animals, front view')] },
    { out: 'studio', prefix: 'house-memory', args: ['--workflow', 'flux2-sprite', '--prompt', `a tiny cozy cottage with a round wooden door and an orange roof, front view, single object, centered, ${STYLE}, no face on objects, plain light gray background`] },
    { out: 'studio', prefix: 'station-patterns', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden children abacus with rows of colorful beads in repeating color patterns, front view')] },
    { out: 'studio', prefix: 'station-letters', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden board standing on a little stand with a big letter A made of colorful dots, front view')] },
  );
  // Coloring pages: outlines only, thick lines, white background (filled by touch).
  const page = (what: string) => `children coloring book page of ${what}, very thick clean black outlines, closed shapes, large simple areas, pure white background, no shading, no gray, no color, no texture, cute and friendly, centered, whole object visible`;
  for (const [id, what] of [
    ['cat', 'a cute sitting cat'],
    ['dog', 'a cute happy puppy'],
    ['elephant', 'a cute baby elephant'],
    ['fish', 'a cute fish with big fins'],
    ['butterfly', 'a cute butterfly with big wings'],
    ['car', 'a cute small car'],
    ['little-flower', 'a big flower with round petals and two leaves'],
    ['dinosaur', 'a cute friendly dinosaur'],
    ['turtle', 'a cute turtle with a patterned shell'],
    ['rocket', 'a cute rocket with round windows'],
    ['owl', 'a cute owl sitting on a branch'],
    ['little-house', 'a little house with a door, two windows and a tree'],
  ])
    tasks.push({ out: 'coloring-pages', prefix: id!, args: ['--workflow', 'flux2', '--prompt', page(what!)] });
}

if (process.argv.includes('--extras')) {
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  tasks.push(
    { out: 'studio', prefix: 'station-shapes', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a wooden children shape sorter box with a circle, a square and a triangle hole and colorful blocks next to it, front view')] },
    { out: 'studio', prefix: 'station-digits', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden board standing on a little stand with big colorful numbers 1 2 3 made of dots, front view')] },
  );
  tasks.push(
    { out: 'studio', prefix: 'station-syllables', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small stack of colorful wooden alphabet toy blocks with big letters, front view')] },
    { out: 'studio', prefix: 'station-stories', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('three small square picture cards standing in a row on a little wooden shelf, showing an egg, a hatching chick and a chick, front view')] },
    { out: 'studio', prefix: 'house-emotions', args: ['--workflow', 'flux2-sprite', '--prompt', `a tiny cozy cottage with a round wooden door, a yellow roof and a round window shaped like a smiling face, front view, single object, centered, ${STYLE}, plain light gray background`] },
    { out: 'studio', prefix: 'station-melody', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a colorful children wooden xylophone with rainbow bars and two mallets, front view')] },
  );
  // Emotions: the same character (same seed), different faces. Clear and exaggerated, like in toddler books.
  const face = (what: string) => `a cute round little child head with short brown hair and big eyes, ${what}, very clear exaggerated expression for toddlers, front view, single object, centered, ${STYLE}, plain light gray background`;
  for (const [id, what] of [
    ['happy', 'very happy, big open smile, cheerful'],
    ['sad', 'very sad, frowning mouth, a single tear on the cheek'],
    ['angry', 'angry, furrowed eyebrows, red cheeks, pouting'],
    ['surprised', 'surprised, round open mouth, raised eyebrows, wide eyes'],
    ['scared', 'scared and frightened, eyebrows raised high and pulled together, very wide eyes, mouth open in a small scream, hands on cheeks, no tears'],
    ['sleepy', 'sleepy, closed eyes, yawning, a little nightcap'],
  ])
    tasks.push({ out: 'emotions', prefix: id!, args: ['--workflow', 'flux2-sprite', '--prompt', face(what!)] });
}

if (process.argv.includes('--emotions2')) {
  // Emotions: more characters with the same set of faces (art/emotions/<emotion>-<character>.webp).
  const chars: [string, string][] = [
    ['girl', 'a cute round little girl head with two blond pigtails and big eyes'],
    ['kitten', 'a cute round orange kitten head with big eyes'],
    ['teddy', 'a cute round brown teddy bear head with big eyes'],
  ];
  const moods: [string, string][] = [
    ['happy', 'very happy, big open smile, cheerful'],
    ['sad', 'very sad, frowning mouth, a single tear on the cheek'],
    ['angry', 'angry, furrowed eyebrows, red cheeks, pouting'],
    ['surprised', 'surprised, round open mouth, raised eyebrows, wide eyes'],
    ['scared', 'scared and frightened, eyebrows raised high and pulled together, very wide eyes, mouth open in a small scream, paws or hands on cheeks, no tears'],
    ['sleepy', 'sleepy, closed eyes, yawning, a little nightcap'],
  ];
  for (const [c, who] of chars)
    for (const [id, what] of moods)
      tasks.push({ out: 'emotions', prefix: `${id}-${c}`, args: ['--workflow', 'flux2-sprite', '--prompt', `${who}, ${what}, very clear exaggerated expression for toddlers, front view, single object, centered, ${STYLE}, plain light gray background`] });
}

if (process.argv.includes('--stories')) {
  // Picture stories: three frames each (order of events), same style as the items.
  const frame = (what: string) => `${what}, single scene object, centered, ${STYLE}, no text, plain light gray background`;
  const stories: [string, string[]][] = [
    ['flower', ['a small brown seed in a little pile of soil', 'a tiny green sprout with two leaves growing from a little pile of soil', 'a pink flower in bloom growing from a little pile of soil']],
    ['chick', ['a white egg in a little straw nest', 'a cracked white egg with a tiny yellow chick peeking out, in a little straw nest', 'a fluffy yellow chick standing next to broken egg shells in a little straw nest']],
    ['butterfly', ['a cute green caterpillar on a leaf', 'a brown cocoon hanging from a twig with a leaf', 'a colorful butterfly with open wings sitting on a leaf']],
    ['snowman', ['one big snowball on snowy ground', 'two snowballs stacked on snowy ground', 'a finished cute snowman with a carrot nose, a hat and a scarf on snowy ground']],
    ['apple', ['a whole shiny red apple', 'a red apple with one big bite taken out', 'an apple core']],
    ['ice-cream', ['a full ice cream cone with two scoops', 'an ice cream cone with one small melting scoop', 'an empty waffle cone with a few drips']],
  ];
  for (const [id, frames] of stories) frames.forEach((what, i) => tasks.push({ out: 'stories', prefix: `${id}-${i + 1}`, args: ['--workflow', 'flux2-sprite', '--prompt', frame(what)] }));
}

if (process.argv.includes('--snowman')) {
  // Snowman step by step: plain snowballs without faces (Flux used to draw faces on them and they looked like heads).
  const frame = (what: string) => `${what}, plain snow, no face, no eyes, no mouth, no nose, no carrot, no decorations, single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, no text, plain light gray background`;
  tasks.push(
    { out: 'stories', prefix: 'snowman-1', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', frame('one big round plain white snowball lying on a small patch of snowy ground')] },
    { out: 'stories', prefix: 'snowman-2', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', frame('two plain white snowballs stacked on top of each other, a big one at the bottom and a smaller one on top, on a small patch of snowy ground, an unfinished snowman body')] },
  );
}

if (process.argv.includes('--stories2')) {
  // New stories and fixed frames. Objects without faces (with "cute" Flux drew faces on eggs and apples).
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const animal = (what: string) => `${what}, cute and friendly, ${base}`;
  const frames: [string, string][] = [
    // Fixes (no faces).
    ['flower-1', thing('a small brown seed in a little pile of brown soil')],
    ['flower-2', thing('a tiny green sprout with two leaves growing from a little pile of brown soil')],
    ['flower-3', thing('a pink flower in bloom growing from a little pile of brown soil')],
    ['chick-1', thing('a plain white egg in a little straw nest')],
    ['apple-1', thing('a whole shiny red apple with a leaf')],
    ['apple-2', thing('a red apple with one big bite taken out, with a leaf')],
    ['apple-3', thing('an apple core with a stem')],
    ['ice-cream-1', thing('a full ice cream cone with two scoops, pink and vanilla')],
    ['ice-cream-2', thing('an ice cream cone with one small half melted pink scoop')],
    // New stories.
    ['froglet-1', thing('a small clump of round transparent frog eggs with black dots floating in a bit of blue pond water')],
    ['froglet-2', animal('a small dark green tadpole with a long tail swimming in a bit of blue pond water')],
    ['froglet-3', animal('a green frog sitting on a lily pad on a bit of blue pond water')],
    ['sandwich-1', thing('a single plain slice of bread on a small wooden board')],
    ['sandwich-2', thing('a single slice of bread spread with yellow butter on a small wooden board, a butter knife next to it')],
    ['sandwich-3', thing('an open sandwich, a slice of bread with butter, cheese, tomato slices and lettuce on a small wooden board')],
    ['tower-1', thing('one single red wooden toy block standing on the floor')],
    ['tower-2', thing('two wooden toy blocks stacked on top of each other, red at the bottom and yellow on top')],
    ['tower-3', thing('a tall tower of five stacked colorful wooden toy blocks, red, yellow, green, blue and orange')],
    ['balloon-1', thing('a flat deflated red rubber balloon lying on the floor')],
    ['balloon-2', thing('a small half inflated red balloon with a string')],
    ['balloon-3', thing('a big round fully inflated shiny red balloon with a string')],
    ['cake-1', thing('a mixing bowl with cake batter, a whisk, two eggs and a bag of flour next to it')],
    ['cake-2', thing('a plain round baked sponge cake in a round baking tin')],
    ['cake-3', thing('a round birthday cake with pink frosting, sprinkles and three lit candles on a plate')],
    ['castle-1', thing('a red toy bucket full of sand standing on beach sand with a small spade')],
    ['castle-2', thing('a small round pile of sand shaped like an upturned bucket on beach sand')],
    ['castle-3', thing('a sand castle with three towers and a little red flag on beach sand')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'stories', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--stories4')) {
  // Fixes of frames from --stories2: froglets on frogspawn, block with wheels, writing on the flour, odd sand cake.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['froglet-1', thing('frog spawn: a clump of many small round clear jelly balls, each with one tiny black dot inside, floating on a bit of blue pond water, no frogs, no animals')],
    ['tower-1', thing('one single plain red cube toy block, no wheels, standing alone')],
    ['tower-3', thing('a tall tower of five stacked plain cube toy blocks: red cube at the bottom, yellow cube on it, then green, then blue, and a small red triangle block on the very top')],
    ['cake-1', thing('a blue mixing bowl with yellow cake batter and a whisk, two brown eggs next to it, no bags, no labels')],
    ['castle-2', thing('a smooth sand tower in the exact shape of an upside down bucket, standing on beach sand, a red toy bucket lying on its side next to it')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'stories', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--stories5')) {
  // Fixes from --stories3: the white sheet got lost on the background, cake with colorful sprinkles.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['pizza-1', thing('one smooth plain beige ball of raw bread dough, no toppings, no sprinkles, no dots, on a small wooden board dusted with white flour')],
    ['airplane-1', thing('one flat square sheet of light blue paper lying on a small wooden table, seen from the front at an angle')],
    ['airplane-2', thing('a sheet of light blue paper folded into a simple triangle shape, lying on a small wooden table')],
    ['airplane-3', thing('a light blue folded paper airplane with pointed nose and two wings, flying, side view')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'stories', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--stories6')) {
  // Six more stories (24 in total): the change is visible at once, the same object in every frame.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['banana-1', thing('a whole unpeeled yellow banana lying on a small round white plate')],
    ['banana-2', thing('a half peeled yellow banana with the peel hanging down and the white fruit showing, lying on a small round white plate')],
    ['banana-3', thing('only an empty limp yellow banana peel lying on a small round white plate, the fruit is eaten')],
    ['watermelon-1', thing('a whole round green striped watermelon on a small wooden board')],
    ['watermelon-2', thing('a green striped watermelon cut into two halves showing red juicy flesh with black seeds, on a small wooden board')],
    ['watermelon-3', thing('three triangular slices of red watermelon with green rind and black seeds on a small wooden board')],
    ['aquarium-1', thing('an empty round glass fish bowl with no water, yellow sand and a small green plant at the bottom, blue tinted glass rim')],
    ['aquarium-2', thing('a round glass fish bowl filled with clear blue water, yellow sand and a small green plant at the bottom, no fish')],
    ['aquarium-3', thing('a round glass fish bowl filled with clear blue water, yellow sand and a small green plant at the bottom, one orange goldfish swimming inside')],
    ['gift-1', thing('a closed gift box wrapped in red paper with a big yellow ribbon bow')],
    ['gift-2', thing('a gift box with torn red wrapping paper, the lid half open, a yellow ribbon lying next to it')],
    ['gift-3', 'a cute brown teddy bear sitting next to an open empty gift box and torn red wrapping paper, ' + base],
    ['car-wash-1', thing('a small red toy car covered in brown mud splashes and dirt')],
    ['car-wash-2', thing('a small red toy car covered in white soap foam and bubbles')],
    ['car-wash-3', thing('a small shiny clean red toy car with tiny white sparkles around it')],
    ['cupcake-1', thing('a pink paper muffin cup filled with raw runny yellow cake batter')],
    ['cupcake-2', thing('a baked golden brown muffin in a pink paper cup')],
    ['cupcake-3', thing('a muffin in a pink paper cup topped with swirled pink cream frosting and one red cherry')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'stories', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--stories7')) {
  // Fixes from --stories6: a whole banana came out instead of the peel, and raw dough looked like a cupcake with cream.
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const frames: [string, string][] = [
    ['banana-3', thing('an empty limp banana peel lying flat, four floppy yellow peel strips spread open like a star, nothing inside the peel, the banana fruit is gone')],
    ['cupcake-1', thing('a pink paper muffin cup seen from slightly above, half filled with smooth flat runny pale yellow liquid cake batter, glossy flat surface, no swirl, no frosting, no sprinkles')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'stories', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '3', '--prompt', prompt] });
}

if (process.argv.includes('--stories3')) {
  // More stories (20 in total).
  const base = 'single scene object, centered, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, no text, plain light gray background';
  const thing = (what: string) => `${what}, no face, no eyes, no mouth, ${base}`;
  const animal = (what: string) => `${what}, cute and friendly, ${base}`;
  const frames: [string, string][] = [
    ['egg-1', thing('a whole white egg next to a small frying pan')],
    ['egg-2', thing('a cracked egg with raw yolk and egg white pouring into a small frying pan')],
    ['egg-3', thing('a fried egg with a round yellow yolk in a small frying pan')],
    ['pizza-1', thing('a round ball of pizza dough on a floured wooden board')],
    ['pizza-2', thing('a flat round raw pizza dough spread with red tomato sauce on a wooden board')],
    ['pizza-3', thing('a baked round pizza with melted cheese, tomato and basil on a wooden board')],
    ['candle-1', thing('a tall new white candle with a small flame in a candle holder')],
    ['candle-2', thing('a half burned white candle with a small flame and wax drips in a candle holder')],
    ['candle-3', thing('a tiny short burned down candle stub with a small flame and a puddle of wax in a candle holder')],
    ['cocoa-1', thing('an empty blue mug')],
    ['cocoa-2', thing('a blue mug full of white milk')],
    ['cocoa-3', thing('a blue mug full of hot brown cocoa with pink and white marshmallows on top')],
    ['nest-1', thing('a small pile of twigs and straw on a tree branch')],
    ['nest-2', thing('an empty round bird nest made of twigs on a tree branch')],
    ['nest-3', animal('a small blue bird sitting in a round nest made of twigs on a tree branch')],
    ['small-tree-1', thing('a tiny tree sapling with a few leaves growing from a small mound of soil')],
    ['small-tree-2', thing('a small young tree with a thin trunk and a small round crown on a small mound of grass')],
    ['small-tree-3', thing('a big apple tree with a round green crown full of red apples on a small mound of grass')],
    ['airplane-1', thing('a plain flat sheet of white paper lying on a table')],
    ['airplane-2', thing('a sheet of white paper folded in half with a pointed folded tip, half made paper airplane')],
    ['airplane-3', thing('a finished white paper airplane')],
    ['day-1', thing('a small round green hill with the sun rising behind it, orange and pink morning sky in a round frame')],
    ['day-2', thing('a small round green hill with a bright yellow sun high in a blue sky in a round frame')],
    ['day-3', thing('a small round dark green hill under a dark blue night sky with a crescent moon and stars in a round frame')],
  ];
  for (const [id, prompt] of frames) tasks.push({ out: 'stories', prefix: id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', prompt] });
}

if (process.argv.includes('--landscapes')) {
  // Sticker-book backgrounds: a wide landscape with a big empty space for stickers (bottom two thirds).
  const land = (what: string) => `wide landscape scene of ${what}, the bottom two thirds is a big open empty flat area for placing stickers, low horizon detail, no characters, no animals, no people, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft lighting, bright cheerful pastel colors, cute and friendly`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2', '--prompt'];
  for (const [id, what] of [
    ['beach', 'a sunny sandy beach with calm blue sea, a few small waves and a bright sky with fluffy clouds'],
    ['forest', 'a sunny forest clearing with big round trees at the edges and a soft green grass meadow'],
    ['winter', 'a snowy winter meadow with snow covered round hills, a few snowy pine trees at the edges and a pale blue sky'],
    ['farm', 'a farm meadow with a wooden fence, a small red barn far away on a hill and a sunny sky'],
    ['sea', 'an underwater sea floor with sand, colorful corals and seaweed at the edges, light blue water with light rays'],
    ['space', 'outer space with a dark blue starry sky, colorful planets far away and a gray moon surface with round craters at the bottom'],
  ])
    tasks.push({ out: 'landscapes', prefix: id!, args: [...wide, land(what!)] });
}

if (process.argv.includes('--coloring-pages2')) {
  // Simpler coloring pages for toddlers: a few big areas, no small details (a 3-year-old's finger).
  const page = (what: string) => `very simple children coloring book page for toddlers aged 2 to 3 of ${what}, only 6 to 10 big closed areas, extremely thick bold black outlines, no small details, no stripes, no patterns, no scales, no texture lines, no tiny eyes details, big chunky rounded shapes, object fills the whole page, pure white background, no shading, no gray, no color`;
  for (const [id, what] of [
    ['fish', 'a round chubby fish with one big tail fin'],
    ['turtle', 'a chubby turtle with a big round shell made of four big plates'],
    ['butterfly', 'a butterfly with four big round wings'],
    ['little-flower', 'a big flower with five round petals, a round center, a stem and two big leaves'],
    ['little-house', 'a little house with a big roof, a door and one round window'],
    ['owl', 'a chubby round owl with big eyes and two wings'],
    ['elephant', 'a chubby baby elephant with big ears, sitting'],
  ])
    tasks.push({ out: 'coloring-pages', prefix: id!, args: ['--workflow', 'flux2', '--count', '2', '--prompt', page(what!)] });
}

if (process.argv.includes('--coloring-scenes')) {
  // Whole scenes to color (more parts than a single animal), still big closed areas for a child's finger.
  const scene = (what: string) => `children coloring book page of a whole cheerful scene: ${what}, about 15 to 25 big closed areas, very thick clean bold black outlines, every shape fully closed, big simple rounded shapes, no tiny details, no hatching, no texture lines, no grass strokes, no patterns, pure white background, no shading, no gray, no color, cute and friendly, the scene fills the whole square page`;
  for (const [id, what] of [
    ['scene-farm', 'a red barn, a cow and a hen in front of a wooden fence, a big sun and two clouds'],
    ['scene-sea', 'under the sea, two round fish, a crab, a starfish, seaweed and big bubbles'],
    ['scene-forest', 'a forest clearing with a hedgehog, a big mushroom, two round trees and a butterfly'],
    ['scene-beach', 'a beach with a sandcastle, a bucket and spade, a beach umbrella and a sailboat on the sea'],
    ['scene-space', 'a rocket flying past two planets and big stars, a smiling moon'],
    ['scene-garden', 'a garden with three big flowers, a snail, a bee and a watering can'],
    ['scene-winter', 'a snowman next to a little house with a chimney, two pine trees and big snowflakes'],
    ['scene-playground', 'a playground with a slide, a swing, a ball, a tree and the sun'],
    ['scene-train', 'a toy train with an engine and two wagons on tracks, round hills and the sun'],
    ['scene-pond', 'a pond with a mother duck and two ducklings, water lilies, reeds and a frog on a leaf'],
  ])
    tasks.push({ out: 'coloring-pages', prefix: id!, args: ['--workflow', 'flux2', '--count', '3', '--prompt', scene(what!)] });
}

if (process.argv.includes('--meadow')) {
  // Puzzle Meadow stations: the picture tells what the activity is about (instead of identical houses).
  const sprite = (what: string, face = false) => `${what}, single object, centered, ${STYLE}${face ? '' : ', no face on objects'}, plain light gray background`;
  const two = ['--workflow', 'flux2-sprite', '--count', '2', '--prompt'];
  tasks.push(
    { out: 'meadow', prefix: 'station-colors', args: [...two, sprite('four small open paint jars in a row, red, yellow, blue and green paint, with a paintbrush, front view')] },
    { out: 'meadow', prefix: 'station-phonemes', args: [...two, sprite('an open children picture alphabet book showing a big letter A on one page and a red apple on the other page, front view')] },
    { out: 'meadow', prefix: 'station-mothers', args: [...two, sprite('a big mother hen and a tiny fluffy yellow chick standing side by side, looking at each other lovingly', true)] },
    { out: 'meadow', prefix: 'station-memory', args: [...two, sprite('six small square memory game cards lying in a grid on a little wooden board, four face down with a purple back and a yellow star, two turned face up showing the same red apple, seen slightly from above')] },
    { out: 'meadow', prefix: 'station-shadows', args: [...two, sprite('a small cute orange cat figurine standing next to its flat dark purple silhouette cutout of the same shape, on a small wooden stand, front view')] },
    { out: 'meadow', prefix: 'station-matching', args: [...two, sprite('three identical red apples and one small blue toy car standing in a row on a little wooden shelf, front view')] },
    { out: 'meadow', prefix: 'station-counting', args: [...two, sprite('a small wooden counting tray with five round hollows, three of them holding shiny red apples, and a little abacus next to it, seen slightly from above')] },
    { out: 'meadow', prefix: 'station-emotions', args: [...two, sprite('three round cards standing on a little wooden stand, showing a happy smiling face, a sad face and a surprised face, simple cartoon faces, front view', true)] },
  );
}

if (process.argv.includes('--gear')) {
  // Parent zone entry icon (plasticine-style gear), 4 variants to choose from.
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  tasks.push(
    { out: 'extra', prefix: 'gear-a', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a chubby rounded cogwheel gear icon with a round hole in the middle, soft lilac purple, front view, flat facing the camera')] },
    { out: 'extra', prefix: 'gear-b', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a chubby rounded settings gear icon with eight soft round teeth and a small yellow button in the center, warm grey and cream, front view, flat facing the camera')] },
  );
}

if (process.argv.includes('--workshop')) {
  const bg = (what: string) => `${what}, soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly`;
  const sprite = (what: string) => `${what}, single object, centered, ${STYLE}, no face on objects, plain light gray background`;
  const wide = ['--workflow', 'flux2', '--width', '1536', '--height', '864', '--count', '2'];
  tasks.push(
    { out: 'workshop', prefix: 'background-workshop', args: [...wide, '--prompt', bg('wide view of a cozy wooden toy workshop interior, wooden shelves with colorful toys and jars along the walls, a big round window with sunlight, warm and friendly, large empty wooden floor in the middle and bottom, no characters, no animals')] },
    { out: 'workshop', prefix: 'background-workshop-game', args: [...wide, '--prompt', bg('a soft blurred cozy background of a warm wooden toy workshop, wooden wall and a light wooden tabletop, very simple and calm, lots of empty space, no characters, no objects in the foreground')] },
    { out: 'workshop', prefix: 'station-sorting', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('three small open wooden crates in a row filled with colorful fruits, toys and vegetables, front view')] },
    { out: 'workshop', prefix: 'station-jigsaw', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('a small wooden easel holding a colorful jigsaw puzzle picture with one piece missing, front view')] },
    { out: 'workshop', prefix: 'crate', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an empty open wooden crate, front view, wide and low')] },
    { out: 'workshop', prefix: 'pail', args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', sprite('an empty plain pure white bucket with a handle, front view, matte white plasticine')] },
    { out: 'workshop', prefix: 'barn', args: ['--workflow', 'flux2-sprite', '--prompt', sprite('a small red farm barn with a white cross on the door')] },
    { out: 'workshop', prefix: 'pond', args: ['--workflow', 'flux2-sprite', '--prompt', sprite('a small round blue pond with a green lily pad and reeds, seen from slightly above')] },
  );
}

if (process.argv.includes('--letters')) {
  // Pictures only for letter tracing (src/sim/letter-pics.ts): 2 variants each, chosen in scripts/assets.sh.
  const { LETTER_PICS } = await import('../src/sim/letter-pics.ts');
  for (const p of LETTER_PICS)
    tasks.push({ out: 'letters', prefix: p.id, args: ['--workflow', 'flux2-sprite', '--count', '2', '--prompt', `${p.prompt}, single object, centered, ${STYLE}, plain light gray background`] });
}
if (process.argv.includes('--hand')) {
  // Tutorial hand: shows gestures (tap, drag, trace with a finger). Index finger pointing up, rotated in code.
  const hand = (what: string) => `${what}, single object, centered, ${STYLE}, plain light gray background`;
  tasks.push(
    { out: 'ui', prefix: 'hand-a', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a cute chubby cartoon child hand with the index finger pointing straight up and the other fingers curled into the palm, warm peach skin, a short light blue sleeve cuff at the wrist, seen from the back of the hand, exactly five fingers')] },
    { out: 'ui', prefix: 'hand-b', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a simple rounded cartoon pointing hand icon like a tutorial cursor, index finger pointing up, thumb tucked to the side, three fingers folded, white glove-like smooth plasticine with a soft orange outline cuff, exactly five fingers')] },
  );
}
if (process.argv.includes('--hand2')) {
  // Second version (owner's note): back of the hand, top view like a hand tapping the screen, not the palm side.
  const hand = (what: string) => `${what}, single object, centered, ${STYLE}, plain light gray background`;
  tasks.push(
    { out: 'ui', prefix: 'hand-c', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a cute chubby cartoon child right hand seen from above showing the back of the hand, knuckles on top, palm facing away from the viewer, the index finger stretched straight up, the other three fingers folded under the hand and hidden, thumb tucked along the side, warm peach skin, a short light blue sleeve cuff at the wrist at the bottom, like a hand tapping a touchscreen')] },
    { out: 'ui', prefix: 'hand-d', args: ['--workflow', 'flux2-sprite', '--count', '4', '--prompt', hand('a cartoon tutorial pointer hand icon, view of the back of a right hand from above, smooth rounded knuckles visible, no palm and no fingernails of the folded fingers visible, index finger pointing straight up with a small fingernail on its tip, warm peach plasticine skin, light blue sleeve cuff at the bottom')] },
  );
}

for (const item of ITEMS) {
  if ((process.argv.includes('--workshop') || process.argv.includes('--gear') || process.argv.includes('--path') || process.argv.includes('--signs') || process.argv.includes('--studio') || process.argv.includes('--extras') || process.argv.includes('--stories') || process.argv.includes('--meadow') || process.argv.includes('--coloring-pages2') || process.argv.includes('--coloring-scenes') || process.argv.includes('--landscapes') || process.argv.includes('--snowman') || process.argv.includes('--stories2') || process.argv.includes('--stories3') || process.argv.includes('--stories4') || process.argv.includes('--stories5') || process.argv.includes('--stories6') || process.argv.includes('--stories7') || process.argv.includes('--emotions2') || process.argv.includes('--hand') || process.argv.includes('--hand2') || process.argv.includes('--letters')) && !only) break;
  if (only && !only.has(item.id)) continue;
  if (!only && existsSync(join(repo, 'games/bystrzakowo/public/art/items', `${item.id}.webp`))) continue;
  if (existsSync(join(raw, 'items', `${item.id}-${SEED}.png`))) continue;
  const prompt = `${item.prompt}, single object, centered, ${STYLE}${hasFace(item) ? '' : ', no face on objects'}, plain light gray background`;
  tasks.push({ out: 'items', prefix: item.id, args: ['--workflow', 'flux2-sprite', '--prompt', prompt] });
}

// Tasks outside the catalog (backgrounds, stations, signs): skip those that already have a file with this seed.
for (let i = tasks.length - 1; i >= 0; i--) {
  const t = tasks[i]!;
  if (t.out !== 'items' && existsSync(join(raw, t.out, `${t.prefix}-${SEED}.png`))) tasks.splice(i, 1);
}
console.log(`To generate: ${tasks.length}`);
for (const dir of ['items', 'extra', 'workshop', 'path', 'studio', 'coloring-pages', 'emotions', 'stories', 'meadow', 'landscapes', 'ui', 'letters']) mkdirSync(join(raw, dir), { recursive: true });
// Progress counted in images (a task with --count N yields N .png files).
const images = tasks.reduce((n, t) => n + (t.args.includes('--count') ? Number(t.args[t.args.indexOf('--count') + 1]) : t.args.includes('ace15') ? 0 : 1), 0);
execFileSync(job, ['bystrzakowo-items', 'Bystrzakowo: art', String(images), '--dir', raw, '--glob', '*'], { stdio: 'inherit' });
for (const [i, t] of tasks.entries()) {
  try {
    const out = execFileSync('node', [comfy, 'gen', ...t.args, '--seed', String(SEED), '--out', join(raw, t.out), '--prefix', t.prefix], { encoding: 'utf8' });
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} ${out.trim().split('\n').pop()}`);
  } catch (e) {
    console.log(`[${i + 1}/${tasks.length}] ${t.prefix} ERROR ${String(e).slice(0, 200)}`);
  }
}
console.log('DONE');
