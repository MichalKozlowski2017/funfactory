import { Composition, Folder, type CalculateMetadataFunction } from 'remotion';
import { GamePromo } from './GamePromo';
import { TabletPromo, tabletPromoFrames, type TabletPromoProps } from './TabletPromo';
import { FPS, promoFrames, type PromoProps } from './types';

/** Length follows the scenes in the props (edit shots in Studio, the clip adjusts). */
const calculateMetadata: CalculateMetadataFunction<PromoProps> = ({ props }) => ({ durationInFrames: promoFrames(props) });
const tabletMetadata: CalculateMetadataFunction<TabletPromoProps> = ({ props }) => ({ durationInFrames: tabletPromoFrames(props, FPS) });

/**
 * One composition per game and language. Media live in release/<slug>/promo/src (linked into public/<slug>/):
 * gameplay from `pnpm shot games/<slug> --gpu --size 360x640@3 --query "bot&chase=4" --steps "rec:start,wait:50000,rec:save:x"`
 * (Glut: `chase` keeps the syrup a few metres under the slime, always in frame),
 * art, intro animation and music from Legion (skill comfyui: flux2-ref, wan22-i2v, ace15).
 * Bystrzakowo (landscape, tablet layout): `?promo=letters:3,shadows:2,...` plays like a child (games/bystrzakowo/src/promo.ts).
 */
export const RemotionRoot = () => {
  return (
    <>
    <Folder name="Glut">
      <Composition
        id="GlutPromoPL"
        component={GamePromo}
        durationInFrames={450}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
        defaultProps={{
          shots: [
            { src: 'glut/chase2-45a.mp4', fromSec: 19.4, durationSec: 3.2, caption: 'Syrop cię goni!', danger: true },
            { src: 'glut/chase2-45a.mp4', fromSec: 22.6, durationSec: 2.6, caption: 'W ostatniej chwili!', cut: 'hard', danger: true },
            { src: 'glut/chase2-45a.mp4', fromSec: 28.6, durationSec: 2.8, caption: 'Co 100 m nowy świat' },
            { src: 'glut/chase2-45a.mp4', fromSec: 34.6, durationSec: 4.0, caption: 'Ile wytrzymasz?', captionTop: 1440, danger: true },
          ],
          end: { image: 'glut/end-602.png', logo: 'Glut', tagline: 'Za darmo w Google Play', cta: 'Pobierz teraz', durationSec: 2.8 },
          music: { src: 'glut/music-813.flac', volume: 0.9 },
          gameVolume: 0,
          captionTop: 1330,
          colors: { ink: '#2a1238', text: '#ffffff', highlight: '#ffd23f', logo: '#ff6fb5', cta: '#ff5fa2', danger: '#ff2d6f' },
          transitionFrames: 5,
        }}
      />
      <Composition
        id="GlutPromoEN"
        component={GamePromo}
        durationInFrames={450}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
        defaultProps={{
          shots: [
            { src: 'glut/chase2-45-en.mp4', fromSec: 19.4, durationSec: 3.2, caption: 'The syrup is coming!', danger: true },
            { src: 'glut/chase2-45-en.mp4', fromSec: 22.6, durationSec: 2.6, caption: 'Just in time!', cut: 'hard', danger: true },
            { src: 'glut/chase2-45-en.mp4', fromSec: 28.6, durationSec: 2.8, caption: 'Reach new worlds!' },
            { src: 'glut/chase2-45-en.mp4', fromSec: 34.6, durationSec: 4.0, caption: 'How far can you go?', captionTop: 1440, danger: true },
          ],
          end: { image: 'glut/end-602.png', logo: 'Glut', tagline: 'Free on Google Play', cta: 'Get it now', durationSec: 2.8 },
          music: { src: 'glut/music-813.flac', volume: 0.9 },
          gameVolume: 0,
          captionTop: 1330,
          colors: { ink: '#2a1238', text: '#ffffff', highlight: '#ffd23f', logo: '#ff6fb5', cta: '#ff5fa2', danger: '#ff2d6f' },
          transitionFrames: 5,
        }}
      />
    </Folder>
    <Folder name="Bystrzakowo">
      <Composition
        id="BystrzakowoPromoPL"
        component={TabletPromo}
        durationInFrames={450}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={tabletMetadata}
        defaultProps={{
          background: 'bystrzakowo/bg-901.png',
          headline: 'Mądra zabawa dla przedszkolaka',
          shots: [
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 6.9, durationSec: 3.0, caption: 'Pierwsze litery' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 15.9, durationSec: 2.6, caption: 'Zagadki z lektorem' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 39.8, durationSec: 2.8, caption: 'Kolorowanki' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 53.2, durationSec: 2.8, caption: 'Układanki' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 60.0, durationSec: 2.0, caption: 'Postępy dla rodzica' },
          ],
          characters: [
            { src: 'bystrzakowo/lusia-point.png', x: -90, y: 1130, width: 700, delaySec: 0.3 },
            { src: 'bystrzakowo/bazyl-point.png', x: 610, y: 1300, width: 500, flip: true, delaySec: 0.6 },
          ],
          end: {
            image: 'bystrzakowo/endbg-912.png',
            logo: 'Bystrzakowo',
            logoFont: 'round',
            tagline: 'Bez reklam · offline',
            cta: 'Wkrótce w sklepach',
            durationSec: 2.8,
            characters: [
              { src: 'bystrzakowo/lusia-wow.png', x: -80, y: 1130, width: 680, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-thumbs.png', x: 600, y: 1320, width: 480, delaySec: 0.6 },
            ],
          },
          music: { src: 'bystrzakowo/music.m4a', volume: 0.35 },
          gameVolume: 1,
          tabletTop: 470,
          captionTop: 1115,
          colors: { ink: '#ffffff', text: '#7a3fb0', headline: '#ff7a1c', logo: '#ff7a1c', cta: '#4fb34a', bezel: '#2b2f3a' },
          fadeFrames: 6,
        }}
      />
    </Folder>
    </>
  );
};
