import type { CSSProperties } from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { captionFont } from './fonts';

type Props = {
  readonly text: string;
  readonly top: number;
  readonly ink: string;
  readonly color: string;
  readonly size?: number;
  /** Frames before the caption pops in. */
  readonly delay?: number;
  readonly style?: CSSProperties;
};

/** Caption that pops in with a springy overshoot and a small tilt, thick outline like the game's labels. */
export const Caption = ({ text, top, ink, color, size = 96, delay = 2, style }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 80,
        right: 80,
        textAlign: 'center',
        fontFamily: captionFont,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.05,
        color,
        WebkitTextStroke: `${Math.round(size * 0.16)}px ${ink}`,
        paintOrder: 'stroke fill',
        textShadow: `0 ${Math.round(size * 0.09)}px 0 rgba(0,0,0,0.35)`,
        scale: interpolate(frame, [delay, delay + 0.35 * fps], [0.35, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.spring({ damping: 11 }),
          output: 'perceptual-scale',
        }),
        rotate: interpolate(frame, [delay, delay + 0.35 * fps], ['-6deg', '0deg'], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.spring({ damping: 11 }),
        }),
        opacity: interpolate(frame, [delay, delay + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        ...style,
      }}
    >
      {text}
    </div>
  );
};
