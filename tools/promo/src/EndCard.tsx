import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from './Caption';
import { captionFont, logoFont } from './fonts';
import { Cutout } from './Cutout';
import type { EndProps, PromoProps } from './types';

type Props = { readonly end: EndProps; readonly colors: Pick<PromoProps['colors'], 'ink' | 'text' | 'logo' | 'cta'> };

/** Last scene: art with a slow zoom, the logo pops in, then the tagline and a pulsing call-to-action pill. */
export const EndCard = ({ end, colors }: Props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink }}>
      <Img
        src={staticFile(end.image)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          scale: interpolate(frame, [0, durationInFrames], [1.0, 1.07], { extrapolateRight: 'clamp' }),
          // Zoom around the sky, so the character at the bottom drifts down, away from the text.
          transformOrigin: '50% 20%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 110,
          width: '100%',
          textAlign: 'center',
          fontFamily: end.logoFont === 'round' ? captionFont : logoFont,
          fontWeight: end.logoFont === 'round' ? 800 : 400,
          fontSize: end.logo.length > 6 ? 170 : 260,
          lineHeight: 1,
          color: colors.logo,
          WebkitTextStroke: `34px ${colors.ink}`,
          paintOrder: 'stroke fill',
          textShadow: '0 22px 0 rgba(0,0,0,0.3)',
          scale: interpolate(frame, [3, 3 + 0.45 * fps], [0.2, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.spring({ damping: 9 }),
            output: 'perceptual-scale',
          }),
          opacity: interpolate(frame, [3, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {end.logo}
      </div>
      <Caption text={end.tagline} top={395} ink={colors.ink} color={colors.text} size={80} delay={Math.round(0.45 * fps)} />
      <div
        style={{
          position: 'absolute',
          top: 540,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: interpolate(frame, [0.8 * fps, 0.8 * fps + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <div
          style={{
            fontFamily: captionFont,
            fontWeight: 800,
            fontSize: 68,
            color: 'white',
            backgroundColor: colors.cta,
            border: `8px solid ${colors.ink}`,
            borderRadius: 999,
            padding: '18px 64px 14px',
            boxShadow: '0 12px 0 rgba(0,0,0,0.3)',
            scale: 1 + 0.05 * Math.sin(((frame - 0.8 * fps) / fps) * Math.PI * 2 * 1.6) * (frame > 0.8 * fps ? 1 : 0),
          }}
        >
          {end.cta}
        </div>
      </div>
      {end.characters?.map((c, i) => <Cutout key={i} c={c} />)}
    </AbsoluteFill>
  );
};
