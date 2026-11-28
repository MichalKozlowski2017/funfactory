import { Audio, Video } from '@remotion/media';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from './Caption';
import { Cutout } from './Cutout';
import { EndCard } from './EndCard';
import type { Character, EndProps } from './types';

/** Landscape gameplay (tablet games) in a vertical clip: the shot plays on a tablet in the middle of a scene. */
export type TabletShot = { src: string; fromSec: number; durationSec: number; caption: string };

export type TabletPromoProps = {
  /** Vertical art behind everything (calm middle for the tablet). */
  background: string;
  /** Hook line at the top, stays for the whole gameplay part. */
  headline: string;
  shots: TabletShot[];
  /** The guides around the tablet. */
  characters: Character[];
  end: EndProps;
  music: { src: string; volume: number };
  /** Game sound (guide's voice, effects) of the recordings; faded in and out at every cut. */
  gameVolume: number;
  /** Top edge of the tablet and of the caption under it (px). */
  tabletTop: number;
  captionTop: number;
  colors: { ink: string; text: string; headline: string; logo: string; cta: string; bezel: string };
  fadeFrames: number;
};

const TABLET_W = 1000;
const TABLET_H = Math.round((TABLET_W * 9) / 16);
const BEZEL = 24;

/** Gameplay frames: shots minus the overlaps of the crossfades between them. */
export const tabletShotsFrames = (p: TabletPromoProps, fps: number) =>
  p.shots.reduce((a, s) => a + Math.round(s.durationSec * fps), 0) - p.fadeFrames * (p.shots.length - 1);

export const tabletPromoFrames = (p: TabletPromoProps, fps: number) => tabletShotsFrames(p, fps) + Math.round(p.end.durationSec * fps) - p.fadeFrames;

/**
 * Vertical promo for a landscape game: background art, a hook line, the gameplay on a tablet (shots crossfade),
 * a caption per shot under the tablet, the guides popping in beside it, then the end card. The recordings keep the
 * game's voice (the guide reads every task), under one continuous music track.
 */
export const TabletPromo = (p: TabletPromoProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const shotsEnd = tabletShotsFrames(p, fps);
  const left = (1080 - TABLET_W) / 2 - BEZEL;
  return (
    <AbsoluteFill style={{ backgroundColor: '#bfe3f7' }}>
      <Sequence name="Gameplay" durationInFrames={shotsEnd}>
        <Backdrop src={p.background} />
        <Caption text={p.headline} top={150} ink={p.colors.ink} color={p.colors.headline} size={104} delay={2} />
        <div
          style={{
            position: 'absolute',
            left,
            top: p.tabletTop,
            width: TABLET_W + 2 * BEZEL,
            height: TABLET_H + 2 * BEZEL,
            borderRadius: 56,
            backgroundColor: p.colors.bezel,
            boxShadow: '0 30px 60px rgba(40,60,90,0.35)',
            padding: BEZEL,
          }}
        >
          <div style={{ position: 'relative', width: TABLET_W, height: TABLET_H, borderRadius: 30, overflow: 'hidden' }}>
            <TransitionSeries name="Screen">
              {p.shots.map((s, i) => [
                i > 0 ? <TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: p.fadeFrames })} /> : null,
                <TransitionSeries.Sequence key={`s${i}`} name={`Shot ${i + 1}`} durationInFrames={Math.round(s.durationSec * fps)}>
                  <ShotVideo src={s.src} fromSec={s.fromSec} frames={Math.round(s.durationSec * fps)} volume={p.gameVolume} />
                </TransitionSeries.Sequence>,
              ])}
            </TransitionSeries>
          </div>
        </div>
        <TransitionSeries name="Captions">
          {p.shots.map((s, i) => [
            i > 0 ? <TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: p.fadeFrames })} /> : null,
            <TransitionSeries.Sequence key={`c${i}`} name={`Caption ${i + 1}`} durationInFrames={Math.round(s.durationSec * fps)}>
              <Caption text={s.caption} top={p.captionTop} ink={p.colors.ink} color={p.colors.text} size={92} delay={i === 0 ? 8 : p.fadeFrames} />
            </TransitionSeries.Sequence>,
          ])}
        </TransitionSeries>
        {p.characters.map((c, i) => (
          <Cutout key={i} c={c} />
        ))}
      </Sequence>
      <Sequence name="End card" from={shotsEnd - p.fadeFrames}>
        <FadeIn frames={p.fadeFrames}>
          <EndCard end={p.end} colors={p.colors} />
        </FadeIn>
      </Sequence>
      <Audio
        name="Music"
        src={staticFile(p.music.src)}
        volume={(f) =>
          interpolate(f, [0, 6, durationInFrames - 1.0 * fps, durationInFrames], [0, p.music.volume, p.music.volume, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    </AbsoluteFill>
  );
};

/** Background art with a very slow zoom. */
const Backdrop = ({ src }: { readonly src: string }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <Img
      src={staticFile(src)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', scale: interpolate(frame, [0, durationInFrames], [1, 1.06]) }}
    />
  );
};

/** A gameplay cut with its sound faded in and out (no clicks or half-words at the cuts). */
const ShotVideo = ({ src, fromSec, frames, volume }: { readonly src: string; readonly fromSec: number; readonly frames: number; readonly volume: number }) => {
  const { fps } = useVideoConfig();
  return (
    <Video
      src={staticFile(src)}
      trimBefore={Math.round(fromSec * fps)}
      muted={volume === 0}
      volume={(f) =>
        interpolate(f, [0, 5, frames - 6, frames], [0, volume, volume, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
      objectFit="cover"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const FadeIn = ({ frames, children }: { readonly frames: number; readonly children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [0, frames], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }) }}>
      {children}
    </AbsoluteFill>
  );
};
