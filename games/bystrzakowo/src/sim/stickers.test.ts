import { describe, expect, it } from 'vitest';
import { newProgress } from './progress.ts';
import { addPicture, depthScale, gallery, MAX_PICTURES, removePicture, stickerScale } from './stickers.ts';

const sticker = { id: 'cat', x: 0.5, y: 0.5, flip: false };

describe('stickers', () => {
  it('stary zapis staje się pierwszym obrazkiem galerii', () => {
    const p = newProgress();
    p.scene = [sticker];
    const g = gallery(p);
    expect(g.pictures).toEqual([{ bg: 'meadow', items: [sticker] }]);
    expect(p.scene).toBeUndefined();
  });

  it('nowy obrazek nie mnoży pustych', () => {
    const p = newProgress();
    expect(addPicture(p, 'beach')).toBe(0);
    expect(gallery(p).pictures).toHaveLength(1);
    expect(gallery(p).pictures[0]!.bg).toBe('beach');
    gallery(p).pictures[0]!.items.push(sticker);
    expect(addPicture(p, 'winter')).toBe(1);
    expect(gallery(p).current).toBe(1);
  });

  it('pełna galeria nie przyjmuje nowego obrazka', () => {
    const p = newProgress();
    p.pictures = Array.from({ length: MAX_PICTURES }, () => ({ bg: 'forest' as const, items: [sticker] }));
    expect(addPicture(p, 'forest')).toBeNull();
  });

  it('usunięcie obrazka zostawia bieżący na miejscu i nigdy nie opróżnia galerii', () => {
    const p = newProgress();
    p.pictures = [
      { bg: 'forest', items: [sticker] },
      { bg: 'winter', items: [sticker] },
      { bg: 'beach', items: [sticker] },
    ];
    p.picture = 2;
    removePicture(p, 0);
    expect(gallery(p).current).toBe(1);
    expect(gallery(p).pictures[1]!.bg).toBe('beach');
    removePicture(p, 0);
    removePicture(p, 0);
    expect(gallery(p).pictures).toEqual([{ bg: 'meadow', items: [] }]);
  });

  it('naklejki dalej (wyżej) są mniejsze, ale słońce na niebie nie maleje', () => {
    expect(depthScale(0.2)).toBeLessThan(depthScale(0.9));
    expect(stickerScale('sun', 0.1)).toBe(stickerScale('sun', 0.9));
    expect(stickerScale('cat', 0.1)).toBeLessThan(stickerScale('cat', 0.9));
  });
});
