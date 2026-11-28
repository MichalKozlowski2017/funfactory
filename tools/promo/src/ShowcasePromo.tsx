import { Audio, Video } from '@remotion/media';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Fragment } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from './Caption';
import { Cutout } from './Cutout';
import { captionFont } from './fonts';
import type { Character } from './types';

/**
 * Landscape feature film (YouTube, Google Play promo video), music only: a title card, the game's chapters
 * (each with its own colour and label, a shot per feature with a caption under the framed gameplay), a card with
 * the selling points and an end card. Every scene crossfades into the next.
 */
/** `src` overrides the main recording for this shot (e.g. a separate recording of the world tour). */
export type ShowcaseShot = { fromSec: number; durationSec: number; caption: string; src?: string };
export type Chapter = { name: string; color: string; shots: ShowcaseShot[] };
export type Card = { image: string; logo?: string; title?: string; subtitle?: string; cta?: string; durationSec: number; characters: Character[] };

export type ShowcaseProps = {
  /** Gameplay recording (landscape, same aspect as the video). */
  recording: string;
  /** Soft blurred art behind the framed gameplay. */
  backdrop: string;
  intro: Card;
  chapters: Chapter[];
  features: Card & { items: string[] };
  end: Card;
  music: { src: string; volume: number };
  colors: { ink: string; logo: string; cta: string };
  fadeFrames: number;
};

const sceneSecs = (p: ShowcaseProps) => [p.intro.durationSec, ...p.chapters.flatMap((c) => c.shots.map((s) => s.durationSec)), p.features.durationSec, p.end.durationSec];
export const showcaseFrames = (p: ShowcaseProps, fps: number) => {
  const s = sceneSecs(p);
  return s.reduce((a, x) => a + Math.round(x * fps), 0) - p.fadeFrames * (s.length - 1);
};

/** Framed gameplay: 1600×900 with rounded corners, caption below, chapter label on the top-left corner. */
const VIDEO = { w: 1600, h: 900, top: 40 };

export const ShowcasePromo = (p: ShowcaseProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const fadeT = (k: string) => <TransitionSeries.Transition key={k} presentation={fade()} timing={linearTiming({ durationInFrames: p.fadeFrames })} />;
  return (
    <AbsoluteFill style={{ backgroundColor: '#fff6e8' }}>
      <TransitionSeries name="Scenes">
        <TransitionSeries.Sequence name="Intro" durationInFrames={Math.round(p.intro.durationSec * fps)}>
          <TitleCard card={p.intro} colors={p.colors} />
        </TransitionSeries.Sequence>
        {p.chapters.map((c, ci) =>
          c.shots.map((s, si) => (
            <Fragment key={`${ci}-${si}`}>
              {fadeT(`t${ci}-${si}`)}
              <TransitionSeries.Sequence name={`${c.name}: ${s.caption}`} durationInFrames={Math.round(s.durationSec * fps)}>
                <Framed recording={p.recording} backdrop={p.backdrop} chapter={c} shot={s} first={si === 0} />
              </TransitionSeries.Sequence>
            </Fragment>
          )),
        )}
        {fadeT('tf')}
        <TransitionSeries.Sequence name="Features" durationInFrames={Math.round(p.features.durationSec * fps)}>
          <FeaturesCard card={p.features} colors={p.colors} />
        </TransitionSeries.Sequence>
        {fadeT('te')}
        <TransitionSeries.Sequence name="End" durationInFrames={Math.round(p.end.durationSec * fps)}>
          <TitleCard card={p.end} colors={p.colors} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        name="Music"
        src={staticFile(p.music.src)}
        volume={(f) =>
          interpolate(f, [0, 8, durationInFrames - 1.5 * fps, durationInFrames], [0, p.music.volume, p.music.volume, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    </AbsoluteFill>
  );
};

const Framed = ({ recording, backdrop, chapter, shot, first }: { readonly recording: string; readonly backdrop: string; readonly chapter: Chapter; readonly shot: ShowcaseShot; readonly first: boolean }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const left = (1920 - VIDEO.w) / 2;
  return (
    <AbsoluteFill>
      <Img src={staticFile(backdrop)} style={{ position: 'absolute', inset: -40, width: 2000, height: 1160, objectFit: 'cover', filter: 'blur(22px) saturate(1.1)', opacity: 0.9 }} />
      <AbsoluteFill style={{ backgroundColor: chapter.color, opacity: 0.18 }} />
      <div
        style={{
          position: 'absolute',
          left,
          top: VIDEO.top,
          width: VIDEO.w,
          height: VIDEO.h,
          borderRadius: 36,
          overflow: 'hidden',
          border: `10px solid white`,
          boxShadow: '0 24px 50px rgba(60,40,20,0.3)',
        }}
      >
        <Video src={staticFile(shot.src ?? recording)} trimBefore={Math.round(shot.fromSec * fps)} muted objectFit="cover" style={{ width: '100%', height: '100%' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: left - 14,
          top: VIDEO.top - 14,
          padding: '10px 34px 6px',
          borderRadius: 999,
          backgroundColor: chapter.color,
          border: '6px solid white',
          color: 'white',
          fontFamily: captionFont,
          fontWeight: 800,
          fontSize: 46,
          boxShadow: '0 8px 0 rgba(0,0,0,0.18)',
          // The label pops in at the first shot of a chapter and stays for the rest of it.
          scale: first
            ? interpolate(frame, [4, 4 + 0.4 * fps], [0.3, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 11 }),
                output: 'perceptual-scale',
              })
            : 1,
          transformOrigin: '0% 0%',
        }}
      >
        {chapter.name}
      </div>
      <Caption text={shot.caption} top={VIDEO.top + VIDEO.h + 12} ink={chapter.color} color="white" size={74} delay={6} style={{ left: 200, right: 200 }} />
    </AbsoluteFill>
  );
};

/** Title or end card: key art (empty left side), logo, subtitle, optional pulsing call to action, the guides. */
const TitleCard = ({ card, colors }: { readonly card: Card; readonly colors: ShowcaseProps['colors'] }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Img src={staticFile(card.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', scale: interpolate(frame, [0, durationInFrames], [1.02, 1.08]) }} />
      {card.logo && (
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: 90,
            width: 960,
            textAlign: 'center',
            fontFamily: captionFont,
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 1.1,
            color: colors.logo,
            WebkitTextStroke: `26px white`,
            paintOrder: 'stroke fill',
            textShadow: '0 14px 0 rgba(0,0,0,0.18)',
            scale: interpolate(frame, [3, 3 + 0.45 * fps], [0.2, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 10 }),
              output: 'perceptual-scale',
            }),
            opacity: interpolate(frame, [3, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {card.logo}
        </div>
      )}
      {card.subtitle && <Caption text={card.subtitle} top={275} ink={colors.ink} color="white" size={64} delay={Math.round(0.45 * fps)} style={{ left: 90, right: 870 }} />}
      {card.cta && (
        <div style={{ position: 'absolute', left: 90, top: 400, width: 960, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [0.8 * fps, 0.8 * fps + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <div
            style={{
              fontFamily: captionFont,
              fontWeight: 800,
              fontSize: 56,
              color: 'white',
              backgroundColor: colors.cta,
              border: '7px solid white',
              borderRadius: 999,
              padding: '14px 56px 10px',
              boxShadow: '0 10px 0 rgba(0,0,0,0.2)',
              scale: 1 + (frame > 0.8 * fps ? 0.045 * Math.sin(((frame - 0.8 * fps) / fps) * Math.PI * 2 * 1.4) : 0),
            }}
          >
            {card.cta}
          </div>
        </div>
      )}
      {card.characters.map((c, i) => (
        <Cutout key={i} c={c} />
      ))}
    </AbsoluteFill>
  );
};

/** Selling points popping in one after another as pills with a tick, next to the art. */
const FeaturesCard = ({ card, colors }: { readonly card: ShowcaseProps['features']; readonly colors: ShowcaseProps['colors'] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pills = ['#4fb34a', '#3d8fd6', '#8e5bd6', '#ff7a1c', '#ff5fa2', '#e0a21c'];
  return (
    <AbsoluteFill>
      <Img src={staticFile(card.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {card.title && <Caption text={card.title} top={70} ink={colors.ink} color="white" size={84} delay={2} style={{ left: 80, right: 900 }} />}
      {card.items.map((t, i) => {
        const start = 0.35 * fps + i * 0.32 * fps;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 110,
              top: 220 + i * 128,
              padding: '12px 40px 8px 24px',
              borderRadius: 999,
              backgroundColor: pills[i % pills.length],
              border: '6px solid white',
              color: 'white',
              fontFamily: captionFont,
              fontWeight: 800,
              fontSize: 54,
              boxShadow: '0 8px 0 rgba(0,0,0,0.18)',
              // Off screen and hidden until its moment, then slides in from the left edge.
              translate: `${interpolate(frame, [start, start + 0.35 * fps], [-1400, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.spring({ damping: 13 }) })}px 0px`,
              opacity: frame < start ? 0 : 1,
            }}
          >
            ✓ {t}
          </div>
        );
      })}
      {card.characters.map((c, i) => (
        <Cutout key={i} c={c} />
      ))}
    </AbsoluteFill>
  );
};
