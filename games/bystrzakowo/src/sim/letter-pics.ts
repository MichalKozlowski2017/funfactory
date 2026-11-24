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
  { id: 'ekler', prompt: 'a chocolate eclair pastry on a small plate' },
  { id: 'flaming', prompt: 'a cute pink flamingo standing on one leg' },
  { id: 'flaga', prompt: 'a small colorful flag on a wooden stick' },
  { id: 'igloo', prompt: 'a small white snow igloo with a round entrance' },
  { id: 'ucho', prompt: 'a cute cartoon ear, simple and friendly' },
  { id: 'ufo', prompt: 'a cute flying saucer ufo toy with a glass dome and little lights' },
  { id: 'mrowka', prompt: 'a cute red ant' },
  { id: 'lody', prompt: 'an ice cream cone with two scoops, pink and white' },
  { id: 'iguana', prompt: 'a cute green iguana lizard' },
  { id: 'dzem', prompt: 'a glass jar of strawberry jam with a checkered lid' },
  { id: 'gniazdo', prompt: 'a bird nest made of twigs with three blue eggs inside' },
  { id: 'orzech', prompt: 'a brown walnut in its shell' },
  { id: 'krolowa', prompt: 'a cute toy queen figure with a golden crown and a red cape' },
  { id: 'koldra', prompt: 'a colorful patchwork quilt blanket, neatly folded' },
  { id: 'skrzypce', prompt: 'a small wooden violin with a bow' },
  { id: 'van', prompt: 'a cute small blue delivery van' },
  { id: 'wazon', prompt: 'a blue vase with three yellow flowers' },
  { id: 'jojo', prompt: 'a red yo-yo toy with a string' },
  { id: 'jacht', prompt: 'a small white sailing yacht with a blue sail' },
  { id: 'jak', prompt: 'a cute shaggy brown yak with curved horns' },
  { id: 'cukinia', prompt: 'a green zucchini vegetable' },
  { id: 'jednorozec', prompt: 'a cute white unicorn with a rainbow mane and golden horn' },
  { id: 'klaun', prompt: 'a cute friendly clown toy figure with a red nose and colorful outfit' },
  { id: 'komputer', prompt: 'a cute small desktop computer with a monitor and keyboard' },
  { id: 'wiolonczela', prompt: 'a cello string instrument with a bow' },
  { id: 'wyspa', prompt: 'a small sandy island with one palm tree in blue water' },
  { id: 'jogurt', prompt: 'a cup of strawberry yogurt with a spoon' },
  { id: 'piekarnik', prompt: 'a cute small kitchen oven with a glass door' },
  { id: 'kaczuszka', prompt: 'a yellow rubber duck bath toy' },
  { id: 'zegar', prompt: 'a round red alarm clock' },
  { id: 'lodz-podwodna', prompt: 'a cute yellow submarine toy' },
  { id: 'wulkan', prompt: 'a small volcano mountain with orange lava on top' },
  { id: 'kostka', prompt: 'a white dice with black dots' },
  { id: 'magnes', prompt: 'a red horseshoe magnet with silver tips' },
  { id: 'koala', prompt: 'a cute grey koala bear' },
  { id: 'kiwi', prompt: 'a kiwi fruit cut in half next to a whole kiwi' },
  { id: 'kajak', prompt: 'a small red kayak boat with a paddle' },
  { id: 'nandu', prompt: 'a cute rhea bird (nandu), grey feathers, long legs' },
  { id: 'gnu', prompt: 'a cute wildebeest (gnu) with curved horns and a dark mane' },
  { id: 'mydlo', prompt: 'a bar of pink soap with a few soap bubbles' },
];

export const LETTER_PIC_IDS: ReadonlySet<string> = new Set(LETTER_PICS.map((p) => p.id));
