import { Audio, Video } from '@remotion/media';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { Fragment } from 'react';
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from './Caption';
import { EndCard } from './EndCard';
import type { PromoProps } from './types';

/**
 * Vertical promo clip (TikTok, Reels, Shorts): optional animated intro, gameplay cuts with captions, end card with
 * logo and call to action, one music track. Cuts slide in from the top (the camera climbs up); a shot can follow
 * the previous one with a hard cut when both come from one continuous stretch of the recording.
 */
export const GamePromo = (p: PromoProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const slideIn = <TransitionSeries.Transition presentation={slide({ direction: 'from-top' })} timing={linearTiming({ durationInFrames: p.transitionFrames })} />;
  return (
    <AbsoluteFill style={{ backgroundColor: p.colors.ink }}>
      <TransitionSeries name="Scenes">
        {p.intro && (
          <TransitionSeries.Sequence name="Intro" durationInFrames={Math.round(p.intro.durationSec * fps)}>
            <Video src={staticFile(p.intro.src)} playbackRate={p.intro.playbackRate} muted objectFit="cover" style={{ width: '100%', height: '100%' }} />
            <Caption text={p.intro.caption} top={250} ink={p.colors.ink} color={p.colors.text} size={100} delay={3} />
          </TransitionSeries.Sequence>
        )}
        {p.shots.map((s, i) => (
          <Fragment key={i}>
            {(i > 0 || p.intro) && s.cut !== 'hard' && slideIn}
            <TransitionSeries.Sequence name={`Shot ${i + 1}`} durationInFrames={Math.round(s.durationSec * fps)}>
              <Video
                src={staticFile(s.src)}
                trimBefore={Math.round(s.fromSec * fps)}
                volume={p.gameVolume}
                muted={p.gameVolume === 0}
                objectFit="cover"
                style={{ width: '100%', height: '100%' }}
              />
              {s.danger && <Danger color={p.colors.danger} />}
              <Caption
                text={s.caption}
                top={s.captionTop ?? p.captionTop}
                ink={p.colors.ink}
                color={i === p.shots.length - 1 ? p.colors.highlight : p.colors.text}
                delay={i === 0 && !p.intro ? 1 : p.transitionFrames}
              />
            </TransitionSeries.Sequence>
          </Fragment>
        ))}
        {slideIn}
        <TransitionSeries.Sequence name="End card" durationInFrames={Math.round(p.end.durationSec * fps)}>
          <EndCard end={p.end} colors={p.colors} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        name="Music"
        src={staticFile(p.music.src)}
        volume={(f) =>
          interpolate(f, [0, 4, durationInFrames - 1.0 * fps, durationInFrames], [0, p.music.volume, p.music.volume, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    </AbsoluteFill>
  );
};

/** Danger glow rising from the bottom edge (where the syrup is), pulsing like a heartbeat. */
const Danger = ({ color }: { readonly color: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = (frame / fps) * 2.2;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(to top, ${color} 0%, transparent 38%)`,
        mixBlendMode: 'screen',
        opacity: 0.35 + 0.3 * Math.max(0, Math.sin(beat * Math.PI * 2)) ** 3,
      }}
    />
  );
};
