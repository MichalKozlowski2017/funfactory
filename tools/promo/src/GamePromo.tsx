import { Audio, Video } from '@remotion/media';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { Fragment } from 'react';
import { AbsoluteFill, interpolate, staticFile, useVideoConfig } from 'remotion';
import { Caption } from './Caption';
import { EndCard } from './EndCard';
import type { PromoProps } from './types';

/**
 * Vertical promo clip (TikTok, Reels, Shorts): animated intro with a hook line, gameplay cuts with captions,
 * end card with logo and call to action, one music track. Cuts slide in from the top (the camera climbs up).
 */
export const GamePromo = (p: PromoProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const cut = <TransitionSeries.Transition presentation={slide({ direction: 'from-top' })} timing={linearTiming({ durationInFrames: p.transitionFrames })} />;
  return (
    <AbsoluteFill style={{ backgroundColor: p.colors.ink }}>
      <TransitionSeries name="Scenes">
        <TransitionSeries.Sequence name="Intro" durationInFrames={Math.round(p.intro.durationSec * fps)}>
          <Video src={staticFile(p.intro.src)} playbackRate={p.intro.playbackRate} muted objectFit="cover" style={{ width: '100%', height: '100%' }} />
          <Caption text={p.intro.caption} top={250} ink={p.colors.ink} color={p.colors.text} size={100} delay={3} />
        </TransitionSeries.Sequence>
        {p.shots.map((s, i) => (
          <Fragment key={i}>
            {cut}
            <TransitionSeries.Sequence name={`Shot ${i + 1}`} durationInFrames={Math.round(s.durationSec * fps)}>
              <Video
                src={staticFile(s.src)}
                trimBefore={Math.round(s.fromSec * fps)}
                volume={p.gameVolume}
                muted={p.gameVolume === 0}
                objectFit="cover"
                style={{ width: '100%', height: '100%' }}
              />
              <Caption
                text={s.caption}
                top={s.captionTop ?? p.captionTop}
                ink={p.colors.ink}
                color={i === p.shots.length - 1 ? p.colors.highlight : p.colors.text}
                delay={p.transitionFrames}
              />
            </TransitionSeries.Sequence>
          </Fragment>
        ))}
        {cut}
        <TransitionSeries.Sequence name="End card" durationInFrames={Math.round(p.end.durationSec * fps)}>
          <EndCard end={p.end} colors={p.colors} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        name="Music"
        src={staticFile(p.music.src)}
        volume={(f) =>
          interpolate(f, [0, 6, durationInFrames - 1.2 * fps, durationInFrames], [0, p.music.volume, p.music.volume, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    </AbsoluteFill>
  );
};
