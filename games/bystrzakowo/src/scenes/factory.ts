/**
 * Scena zabawy po jej id (świat otwiera zabawę, ekran nagrody uruchamia ją jeszcze raz).
 * Importowane dynamicznie z round.ts, żeby nie tworzyć cyklu przy ładowaniu klas scen.
 */
import type { Scene } from '@funfactory/kit2d';
import { isPuzzle, type Activity } from '../sim/realms.ts';
import type { PuzzleKind } from '../sim/puzzles.ts';
import { ColoringScene } from './coloring.ts';
import { DotsScene } from './dots.ts';
import { EmotionScene } from './emotions.ts';
import { JigsawScene } from './jigsaw.ts';
import { LetterScene } from './letters.ts';
import { MazeScene } from './maze.ts';
import { MelodyScene } from './melody.ts';
import { MemoryScene } from './memory.ts';
import { PatternScene } from './patterns.ts';
import { PuzzleScene } from './puzzle.ts';
import { ShapeScene } from './shapes.ts';
import { SortScene } from './sort.ts';
import { StickerScene } from './stickers.ts';
import { StoryScene } from './stories.ts';
import { SyllableScene } from './syllables.ts';

const SCENES: Record<string, () => Scene> = {
  memory: () => new MemoryScene(),
  emocje: () => new EmotionScene(),
  sortowanie: () => new SortScene(),
  ukladanka: () => new JigsawScene(),
  wzory: () => new PatternScene(),
  ksztalty: () => new ShapeScene(),
  sylaby: () => new SyllableScene(),
  historyjki: () => new StoryScene(),
  kropki: () => new DotsScene(),
  litery: () => new LetterScene('litery'),
  cyfry: () => new LetterScene('cyfry'),
  kolorowanka: () => new ColoringScene(),
  naklejanka: () => new StickerScene(),
  melodia: () => new MelodyScene(),
  labirynt: () => new MazeScene(),
};

export function sceneFor(kind: Activity): Scene {
  return isPuzzle(kind) ? new PuzzleScene(kind as PuzzleKind) : SCENES[kind]!();
}
