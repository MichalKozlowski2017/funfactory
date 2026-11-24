import { Rng } from '@funfactory/core';
import { describe, expect, it } from 'vitest';
import { STORIES, STORY_ROUND, makeStoryRound, markStoriesSeen } from './stories.ts';

describe('stories from a bag', () => {
  it('shows all stories before any of them repeats', () => {
    const rng = new Rng(5);
    let seen: string[] = [];
    const shown: string[] = [];
    const rounds = Math.ceil(STORIES.length / STORY_ROUND);
    for (let r = 0; r < rounds; r++) {
      const round = makeStoryRound(rng, seen);
      expect(new Set(round).size).toBe(STORY_ROUND);
      shown.push(...round);
      seen = markStoriesSeen(seen, round);
    }
    // The first STORIES.length shown are all the stories without repeats.
    expect(new Set(shown.slice(0, STORIES.length)).size).toBe(STORIES.length);
  });

  it('after all have been seen the bag starts over', () => {
    const all = [...STORIES];
    const round = all.slice(0, STORY_ROUND);
    expect(markStoriesSeen(all.slice(STORY_ROUND), round)).toEqual(round);
  });
});
