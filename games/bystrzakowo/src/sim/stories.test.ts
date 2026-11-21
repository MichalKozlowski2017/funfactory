import { Rng } from '@funfactory/core';
import { describe, expect, it } from 'vitest';
import { STORIES, STORY_ROUND, makeStoryRound, markStoriesSeen } from './stories.ts';

describe('historyjki z worka', () => {
  it('pokazuje wszystkie historyjki, zanim którakolwiek się powtórzy', () => {
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
    // Pierwsze STORIES.length pokazanych to wszystkie historyjki bez powtórek.
    expect(new Set(shown.slice(0, STORIES.length)).size).toBe(STORIES.length);
  });

  it('po obejrzeniu wszystkich worek zaczyna się od nowa', () => {
    const all = [...STORIES];
    const round = all.slice(0, STORY_ROUND);
    expect(markStoriesSeen(all.slice(STORY_ROUND), round)).toEqual(round);
  });
});
