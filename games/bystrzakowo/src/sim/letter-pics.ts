/**
 * Obrazki tylko do zabawy „Pisze litery” (przykłady na litery, których brakuje w katalogu: „Q jak queen”,
 * „Ñ de ñandú”). Nie trafiają do innych zagadek ani naklejek, więc nie potrzebują nazw w lektorze:
 * lektor mówi tylko całe zdanie „X jak słowo”. Grafika: public/art/litery/<id>.webp (Flux, plastelina).
 */
export interface LetterPic {
  id: string;
  /** Opis dla Fluxa (po angielsku, sam obiekt). */
  prompt: string;
}

export const LETTER_PICS: readonly LetterPic[] = [
  { id: 'emu', prompt: 'a cute emu bird, tall with long neck and fluffy brown feathers' },
  { id: 'elf', prompt: 'a cute little christmas elf toy figure in a green outfit and pointy hat' },
  { id: 'eclair', prompt: 'a chocolate eclair pastry on a small plate' },
  { id: 'flamingo', prompt: 'a cute pink flamingo standing on one leg' },
  { id: 'flag', prompt: 'a small colorful flag on a wooden stick' },
  { id: 'igloo', prompt: 'a small white snow igloo with a round entrance' },
  { id: 'ear', prompt: 'a cute cartoon ear, simple and friendly' },
  { id: 'ufo', prompt: 'a cute flying saucer ufo toy with a glass dome and little lights' },
  { id: 'ant', prompt: 'a cute red ant' },
  { id: 'ice-cream', prompt: 'an ice cream cone with two scoops, pink and white' },
  { id: 'iguana', prompt: 'a cute green iguana lizard' },
  { id: 'jam', prompt: 'a glass jar of strawberry jam with a checkered lid' },
  { id: 'nest', prompt: 'a bird nest made of twigs with three blue eggs inside' },
  { id: 'walnut', prompt: 'a brown walnut in its shell' },
  { id: 'queen', prompt: 'a cute toy queen figure with a golden crown and a red cape' },
  { id: 'quilt', prompt: 'a colorful patchwork quilt blanket, neatly folded' },
  { id: 'violin', prompt: 'a small wooden violin with a bow' },
  { id: 'van', prompt: 'a cute small blue delivery van' },
  { id: 'vase', prompt: 'a blue vase with three yellow flowers' },
  { id: 'yo-yo', prompt: 'a red yo-yo toy with a string' },
  { id: 'yacht', prompt: 'a small white sailing yacht with a blue sail' },
  { id: 'yak', prompt: 'a cute shaggy brown yak with curved horns' },
  { id: 'zucchini', prompt: 'a green zucchini vegetable' },
  { id: 'unicorn', prompt: 'a cute white unicorn with a rainbow mane and golden horn' },
  { id: 'clown', prompt: 'a cute friendly clown toy figure with a red nose and colorful outfit' },
  { id: 'computer', prompt: 'a cute small desktop computer with a monitor and keyboard' },
  { id: 'cello', prompt: 'a cello string instrument with a bow' },
  { id: 'island', prompt: 'a small sandy island with one palm tree in blue water' },
  { id: 'yogurt', prompt: 'a cup of strawberry yogurt with a spoon' },
  { id: 'oven', prompt: 'a cute small kitchen oven with a glass door' },
  { id: 'rubber-duck', prompt: 'a yellow rubber duck bath toy' },
  { id: 'clock', prompt: 'a round red alarm clock' },
  { id: 'submarine', prompt: 'a cute yellow submarine toy' },
  { id: 'volcano', prompt: 'a small volcano mountain with orange lava on top' },
  { id: 'dice', prompt: 'a white dice with black dots' },
  { id: 'magnet', prompt: 'a red horseshoe magnet with silver tips' },
  { id: 'koala', prompt: 'a cute grey koala bear' },
  { id: 'kiwi', prompt: 'a kiwi fruit cut in half next to a whole kiwi' },
  { id: 'kayak', prompt: 'a small red kayak boat with a paddle' },
  { id: 'nandu', prompt: 'a cute rhea bird (nandu), grey feathers, long legs' },
  { id: 'gnu', prompt: 'a cute wildebeest (gnu) with curved horns and a dark mane' },
  { id: 'soap', prompt: 'a bar of pink soap with a few soap bubbles' },
];

export const LETTER_PIC_IDS: ReadonlySet<string> = new Set(LETTER_PICS.map((p) => p.id));
