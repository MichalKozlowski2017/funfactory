import { Composition, Folder, type CalculateMetadataFunction } from 'remotion';
import { GamePromo } from './GamePromo';
import { FPS, promoFrames, type PromoProps } from './types';

/** Length follows the scenes in the props (edit shots in Studio, the clip adjusts). */
const calculateMetadata: CalculateMetadataFunction<PromoProps> = ({ props }) => ({ durationInFrames: promoFrames(props) });

/**
 * One composition per game and language. Media live in release/<slug>/promo/src (linked into public/<slug>/):
 * gameplay from `pnpm shot games/<slug> --gpu --size 360x640@3 --query "bot&chase=4" --steps "rec:start,wait:50000,rec:save:x"`
 * (Glut: `chase` keeps the syrup a few metres under the slime, always in frame),
 * art, intro animation and music from Legion (skill comfyui: flux2-ref, wan22-i2v, ace15).
 */
export const RemotionRoot = () => {
  return (
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
            { src: 'glut/chase-4.mp4', fromSec: 22.2, durationSec: 4.6, caption: 'Syrop cię goni!', danger: true },
            { src: 'glut/chase-4.mp4', fromSec: 28.6, durationSec: 2.8, caption: 'Skacz w rytm!' },
            { src: 'glut/chase-4.mp4', fromSec: 31.4, durationSec: 2.6, caption: 'Co 100 m nowy świat', cut: 'hard' },
            { src: 'glut/chase-3.mp4', fromSec: 15.0, durationSec: 2.8, caption: 'Ile wytrzymasz?', captionTop: 1440, danger: true },
          ],
          end: { image: 'glut/end-602.png', logo: 'Glut', tagline: 'Za darmo w Google Play', cta: 'Pobierz teraz', durationSec: 2.6 },
          music: { src: 'glut/music-813.flac', volume: 0.9 },
          gameVolume: 0,
          captionTop: 1330,
          colors: { ink: '#2a1238', text: '#ffffff', highlight: '#ffd23f', logo: '#ff6fb5', cta: '#ff5fa2', danger: '#ff2d6f' },
          transitionFrames: 5,
        }}
      />
    </Folder>
  );
};
