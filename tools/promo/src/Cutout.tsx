import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Character } from './types';

/** Character cut-out that pops up from below with a springy overshoot, then gently bobs. */
export const Cutout = ({ c }: { readonly c: Character }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = c.delaySec * fps;
  return (
    <Img
      src={staticFile(c.src)}
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: c.width,
        transformOrigin: '50% 100%',
        scale: `${c.flip ? -1 : 1} 1`,
        translate: `0px ${
          interpolate(frame, [start, start + 0.5 * fps], [260, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.spring({ damping: 12 }),
          }) +
          6 * Math.sin(((frame - start) / fps) * Math.PI * 1.2)
        }px`,
        opacity: interpolate(frame, [start, start + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}
    />
  );
};
