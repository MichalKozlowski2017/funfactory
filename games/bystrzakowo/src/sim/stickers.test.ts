import { describe, expect, it } from 'vitest';
import { newProgress } from './progress.ts';
import { addPicture, depthScale, gallery, MAX_PICTURES, removePicture } from './stickers.ts';

const sticker = { id: 'kot', x: 0.5, y: 0.5, flip: false };

describe('naklejanka', () => {
  it('stary zapis staje się pierwszym obrazkiem galerii', () => {
    const p = newProgress();
    p.scene = [sticker];
    const g = gallery(p);
    expect(g.pictures).toEqual([{ bg: 'polana', items: [sticker] }]);
    expect(p.scene).toBeUndefined();
  });

  it('nowy obrazek nie mnoży pustych', () => {
    const p = newProgress();
    expect(addPicture(p, 'plaza')).toBe(0);
    expect(gallery(p).pictures).toHaveLength(1);
    expect(gallery(p).pictures[0]!.bg).toBe('plaza');
    gallery(p).pictures[0]!.items.push(sticker);
    expect(addPicture(p, 'zima')).toBe(1);
    expect(gallery(p).current).toBe(1);
  });

  it('pełna galeria nie przyjmuje nowego obrazka', () => {
    const p = newProgress();
    p.pictures = Array.from({ length: MAX_PICTURES }, () => ({ bg: 'las' as const, items: [sticker] }));
    expect(addPicture(p, 'las')).toBeNull();
  });

  it('usunięcie obrazka zostawia bieżący na miejscu i nigdy nie opróżnia galerii', () => {
    const p = newProgress();
    p.pictures = [
      { bg: 'las', items: [sticker] },
      { bg: 'zima', items: [sticker] },
      { bg: 'plaza', items: [sticker] },
    ];
    p.picture = 2;
    removePicture(p, 0);
    expect(gallery(p).current).toBe(1);
    expect(gallery(p).pictures[1]!.bg).toBe('plaza');
    removePicture(p, 0);
    removePicture(p, 0);
    expect(gallery(p).pictures).toEqual([{ bg: 'polana', items: [] }]);
  });

  it('naklejki dalej (wyżej) są mniejsze', () => {
    expect(depthScale(0.2)).toBeLessThan(depthScale(0.9));
  });
});
