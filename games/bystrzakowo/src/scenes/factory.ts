/**
 * Activity scene by its id (the world opens an activity, the reward screen starts it again).
 * Imported dynamically from round.ts to avoid a cycle when loading scene classes.
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
  emotions: () => new EmotionScene(),
  sorting: () => new SortScene(),
  jigsaw: () => new JigsawScene(),
  patterns: () => new PatternScene(),
  shapes: () => new ShapeScene(),
  syllables: () => new SyllableScene(),
  stories: () => new StoryScene(),
  dots: () => new DotsScene(),
  letters: () => new LetterScene('letters'),
  digits: () => new LetterScene('digits'),
  coloring: () => new ColoringScene(),
  stickers: () => new StickerScene(),
  melody: () => new MelodyScene(),
  maze: () => new MazeScene(),
};

export function sceneFor(kind: Activity): Scene {
  return isPuzzle(kind) ? new PuzzleScene(kind as PuzzleKind) : SCENES[kind]!();
}
